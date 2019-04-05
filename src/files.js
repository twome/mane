const fs = require('fs')
const path = require('path')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const makeDir = util.promisify(fs.mkdir)
const readDir = util.promisify(fs.readdir)

const { DateTime } = require('luxon')
import last from '../node_modules/lodash-es/last.js'
import isEqual from '../node_modules/lodash-es/isEqual.js'

import { getRandomId, getMatchListTruncated } from './util.js'
import { getConfig } from './config.js'
import { Patch } from './patch.js'

const config = getConfig()

export const getPatchAssetBodies = async (patches) => {
	patches.map(async patch => {
		// TODO: parallelise
		if (!patch.js && patch.pathJs) patch.js = await readFile(patch.pathJs)
		if (!patch.css && patch.pathCss) patch.Css = await readFile(patch.pathCss)
	})
	return await Promise.all(patches)
}

export let importPatchJson = async (url, scheme)=>{
	if (scheme === config.patchJsonSchema.UserJavascriptAndCSS){
		/*
			sites: [
				{
					js: String,
					css: String,
					id: String (comma-separated list of URL matches (can have * wildcards))
					libs: Array of Strings (URLs of side-effect dependencies)
					options: {
						altCSS: Boolean,
				        altJS: Boolean,
				        autoImportant: Boolean,
				        on: Boolean
					}
				}
			]
		*/	

		let jsonString = await readFile(url, 'utf-8')
		let originalFormat = JSON.parse(jsonString)

		let jsonPatches = []
		for (let site of originalFormat.sites){
			let matchList = site.id.split(',').map(matcher => matcher.trim())
			let { css, js } = site
			let { on } = site.options
			
			jsonPatches.push(new Patch({
				matchList, css, js,
				options: {
					on
				}
			}))
		}

		return jsonPatches
	} else if (scheme === config.patchJsonSchema.Mane){
		throw Error('TODO')
		/*
			{
				js: String,
				css: String,
				matchList: Array of Strings (URL matches (can have * wildcards)),
				options: {
					on: Boolean
				}
			}
		*/
	} else {
		throw Error('Unknown scheme')
	}
}


export let savePatchToFS = async (patch, storageDir, maxFilenameSize = 60) => {
	let concatenated = patch.matchList.join(',')
	let patchName = concatenated
	
	if (concatenated.length >= maxFilenameSize){ 
		let idShort = patch.id.substr(0, 6)
		let previewLength = maxFilenameSize - config.excessLengthIndicator.length - idShort.length
		let truncated = getMatchListTruncated(patch.matchList, previewLength)
		
		patchName = idShort + config.excessLengthIndicator + truncated 

		if (patch.js) patch.js = `/* patch-urls ${concatenated} */\n` + patch.js
		if (patch.css) patch.css = `/* patch-urls ${concatenated} */\n` + patch.css
	}
	
	let jsName = patchName + '.js'
	let cssName = patchName + '.css'

	await makeDir(config.storageDir, { recursive: true })
	let jsWrite = patch.js ? writeFile(path.join(config.storageDir, jsName), patch.js) : Promise.resolve(false)
	let cssWrite = patch.css ? writeFile(path.join(config.storageDir, cssName), patch.css) : Promise.resolve(false)
	
	return await Promise.all([jsWrite, cssWrite])
}


export const getMatchListFromFile = async (path) => {
	// We have to look inside the file for the full matchList, as the filename was too large to hold it.
	// TODO: stream-read only the first few lines to dramatically reduce FS i/o bottleneck
	let fileBody = await readFile(path, 'utf-8')

	let first3lines = fileBody.split('\n').slice(0, 2) // Only check the first 3 lines
	console.debug({first3lines})
	// Look for special comment containing the matchList
	let simpleMatch = first3lines.some(line => line.match(/patch-urls/))
	console.debug({simpleMatch})
	for (let line of first3lines){
		let match = line.match(/\/\*\s*patch-urls\s*([^\s]*)\s*\*\//)
		if (match) return match[1] // The matchlist itself (regex'd group 1)
	}

	return Error('Expected a special comment in this format: /* patch-urls <comma-separated list of domain regexes> */')
}

const patchArrToMap = patchesArr => new Map(patchesArr.map(patch => [patch.id, patch]))

export const updateMemCache = (patches, cache) => {
	let patchesAsMap = patchArrToMap(patches)

	// Renew mem cache
	cache.patches = patchesAsMap 
	cache.lastFsWrotePatches = DateTime.local().toISO()
}


export const updateFSCache = async (patches, cachePath) => {
	let path = cachePath || path.join(config.storageDir, config.fsCacheDir, config.fsCacheMatchListsFilename)

	let patchesAsMap = patchArrToMap(patches)

	// Write the full list of matchLists, including ones in non-literally-named files, into FS cache
	let forFsCacheObject = {
		patches: patchesAsMap,
		dateWritten: DateTime().local().toISO()
	}

	// Renew FS cache
	return await writeFile(path, JSON.stringify(forFsCacheObject)) 
}


export const getAllPatches = async (memCache, forceRefresh) => {
	// TODO: Comparing cache contents (rather than mere existence) to determine whether the next stage of caching is necessary

	// Check mem cache
	if (memCache.patches.length && !forceRefresh){
		console.debug('Hit mem cache')
		return Object.values(memCache.patches)
	}

	let foundPatches = []
	// Read FS cache
	try {
		let fsCachePath = path.join(config.storageDir, config.fsCacheDir, config.fsCacheMatchListsFilename)
		let previousFsCache = await readFile(fsCachePath)	
		let previousFsCacheJson = JSON.parse(previousFsCache)
		
		previousFsCacheJson.patches.forEach((plainObject) => {
			foundPatches.push(new Patch(plainObject))
		})

		memCache.lastFsWrotePatches = DateTime.fromISO(previousFsCacheJson.dateWritten)
	} catch (err){
		// No extant FS cache file; instead, we must read dir contents
		console.warn('No FS cache file found; reading dir contents.')
		
		let filenames = await readDir(config.storageDir)

		// console.debug('getAllPatches: filenames', filenames)
		
		let matchListsOnly = []
		for (let name of filenames){
			if (name.match(config.excessLengthIndicator)){ // We had to save this file with an ID + indicator string instead of the literal stringified matchList
				console.debug('found exceeding file', name)
				// Go inside the file and look for the special comment
				let listStr = getMatchListFromFile(path.join(config.storageDir, name))
				console.debug({listStr: await listStr})
				matchListsOnly.push(listStr)
			} else {
				// Just use the filename
				matchListsOnly.push(Promise.resolve(name))
			}
		}
		matchListsOnly = await Promise.all(matchListsOnly) // Replace promises with values
		console.debug({matchListsOnly})
		filenames.forEach((name, index) => {
			let correspondingMatchList = matchListsOnly[index].trim().split(',') // String ID to matchers array
			let plainObject = {
				matchList: correspondingMatchList
			}
			let extension = last(name.split('.'))
			if (extension === 'js') plainObject.pathJs = name
			if (extension === 'css') plainObject.pathcss = name

			// Relies on both being in same index order
			foundPatches.push(new Patch(plainObject))
		})

		// Add IDs
		foundPatches = foundPatches.map(patch => {
			if (!patch.id) patch.id = patch.matchList.join(',').trim()
			return patch
		})
	}	

	return foundPatches
}


export const updateAllCaches = (memCache) => {
	let freshPatches = getAllPatches(memCache)
	updateFSCache(freshPatches) 
	updateMemCache(freshPatches, memCache)
}


let loadPatchFromFS = async (patchTitle, storageDir) => {
	// ~ try load <title.js> and <title.css>
	// ~ instatiate new patch
}

let saveEverythingTarball = () => {
	// ~ save everything we can touch into a local FS tar.lz2 with a single JSON and optional non-text assets (images etc) for better compression
}

let clearFsStorage = () => {

}