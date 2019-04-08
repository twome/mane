const fs = require('fs')
const path = require('path')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const makeDir = util.promisify(fs.mkdir)
const readDir = util.promisify(fs.readdir)

const { DateTime } = require('luxon')
import last from '../../node_modules/lodash-es/last.js'
// import isEqual from '../../node_modules/lodash-es/isEqual.js'

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


export let savePatchToFs = async (patch, storageDir = config.storageDir) => {
	let filename = patch.id // This is the same as the concat'd matchList for small matchLists
	
	let jsPath = path.join(storageDir, filename + '.js')
	let cssPath = path.join(storageDir, filename + '.css')

	await makeDir(config.storageDir, { recursive: true })
	let jsWrite = patch.js ? writeFile(jsPath, patch.js) : Promise.resolve(false)
	let cssWrite = patch.css ? writeFile(cssPath, patch.css) : Promise.resolve(false)
	
	return await Promise.all([jsWrite, cssWrite])
}


export const getMatchListFromFile = async (path) => {
	// We have to look inside the file for the full matchList, as the filename was too large to hold it.
	// TODO: stream-read only the first few lines to dramatically reduce FS i/o bottleneck
	let fileBody = await readFile(path, 'utf-8')

	let first3lines = fileBody.split('\n').slice(0, 2) // Only check the first 3 lines
	// Look for special comment containing the matchList
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
	cache.valid = true
}


export const updateFSCache = async (patches, path = config.fsCacheFilePath) => {
	let patchesAsMap = patchArrToMap(patches)

	// Write the full list of matchLists, including ones in non-literally-named files, into FS cache
	let forFsCacheObject = {
		patches: patchesAsMap,
		dateWritten: DateTime().local().toISO()
	}

	// Renew FS cache
	return await writeFile(path, JSON.stringify(forFsCacheObject)) 
}

export const getFsCache = async ({
	cachePath = config.fsCacheFilePath,
	memCache
}={}) => {
	let previousFsCache = await readFile(cachePath)
	let previousFsCacheJson = JSON.parse(previousFsCache)
	
	if (memCache) memCache.lastFsWrotePatches = DateTime.fromISO(previousFsCacheJson.dateWritten)
	
	return previousFsCacheJson
}

export const getPatchesFromDir = async (dirPath = config.storageDir) => {
	let filenames = await readDir(dirPath)
	// console.debug('getPatchesFromDir: filenames', filenames)
	
	let fileData = []
	for (let name of filenames){
		let file = new Promise(async (res, rej)=>{
			let matchListStr, id
			if (name.match(config.excessLengthIndicator)){ 
				// In the past, this file had to be saved with a randomly-generated ID + indicator string instead of the literal stringified matchList

				// Go inside the file and look for the special comment
				matchListStr = await getMatchListFromFile(path.join(dirPath, name))
			} else {
				// The filename already is the matchList
				matchListStr = name.replace(/\.(css|js)\s*$/, '')
			}
			id = name.replace(/\.(css|js)\s*$/, '') // Remove file extension and use the filename as ID
			res({name, matchListStr, id})
		})
		fileData.push(file)
	}

	// TODO: use reduce
	let patches = new Map()
	let files = await Promise.all(fileData)
	files.forEach(file => {
		file.matchList = file.matchListStr.trim().split(',') // String ID to matchers array

		let extantPatch = patches.get(file.id) || new Patch(file) // Re-use the same patch made from a different asset file with the same ID, if needed
	
		let fileExtension = last(file.name.split('.'))
		if (fileExtension === 'js') extantPatch.addAsset(config.assetTypes.Js, path.join(dirPath, file.name))
		if (fileExtension === 'css') extantPatch.addAsset(config.assetTypes.Css, path.join(dirPath, file.name))
		patches.set(extantPatch.id, extantPatch)
	})

	return patches
}

export const getAllPatches = async ({
		memCache, 
		fsCacheFilePath = config.fsCacheFilePath,
		forceRefresh = false
}={}) => {
	// TODO: Comparing cache contents (rather than mere existence) to determine whether the next stage of caching is necessary

	// Check mem cache
	if (memCache && memCache.patches.length && !forceRefresh){
		console.debug('getAllPatches: Hit & using mem cache for entire patches list')
		return Object.values(memCache.patches)
	}

	let foundPatches = []
	// Read FS cache
	try {
		let previousFsCacheJson = await getFsCache({memCache, fsCacheFilePath})
		console.debug('Found the FS cache file; reading that to find all patches.')
		
		// Instatiate all the JSON-ified plain objects into instances in memory
		previousFsCacheJson.patches.forEach((plainObject) => {
			foundPatches.push(new Patch(plainObject))
		})
	} catch (err){
		// No extant FS cache file; instead, we must read dir contents
		console.warn('No FS cache file found; reading entire dir contents.')
		
		foundPatches = await getPatchesFromDir()
	}	

	return foundPatches
}


export const updateAllCaches = (memCache, fsCachePath) => {
	let freshPatches = getAllPatches({
		memCache, fsCachePath,
		forceRefresh: true
	})
	updateFSCache(freshPatches) 
	updateMemCache(freshPatches, memCache)
}


let loadPatchFromFs = async (patchTitle, storageDir) => {
	// ~ try load <title.js> and <title.css>
	// ~ instatiate new patch
}

let saveEverythingTarball = () => {
	// ~ save everything we can touch into a local FS tar.lz2 with a single JSON and optional non-text assets (images etc) for better compression
}

let clearFsStorage = () => {

}