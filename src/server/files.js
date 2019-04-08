const fs = require('fs')
const path = require('path')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const makeDir = util.promisify(fs.mkdir)
const readDir = util.promisify(fs.readdir)

import parseDate from '../../node_modules/date-fns/parse/index.js'
import last from '../../node_modules/lodash-es/last.js'
// import isEqual from '../../node_modules/lodash-es/isEqual.js'

import { getConfig } from './config.js'
import { Patch } from './patch.js'
import { SpecialCommentMissing } from './errors.js'

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
					libs: String[] (URLs of side-effect dependencies)
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
				matchList: String[] (URL matches (can have * wildcards)),
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


export const getMatchListFromWithinFile = async (path) => {
	// We have to look inside the file for the full matchList, as the filename was too large to hold it.
	// TODO: stream-read only the first few lines to dramatically reduce FS i/o bottleneck
	let fileBody = await readFile(path, 'utf-8')

	let first3lines = fileBody.split('\n').slice(0, 2) // Only check the first 3 lines
	// Look for special comment containing the matchList
	for (let line of first3lines){
		let match = line.match(/\/\*\s*patch-urls\s*([^\s]*)\s*\*\//)
		if (match) return match[1] // The matchlist itself (regex'd group 1)
	}

	return new SpecialCommentMissing()
}

const patchArrToMap = patchesArr => {
	return new Map(patchesArr.map(patch => [patch.id, patch]))
}

export const updateMemCache = (patches, cache) => {
	// Renew mem cache
	cache.patches = patches 
	cache.lastFsWrotePatches = new Date()
	cache.valid = true
}


export const updateFSCache = async (patches, path = config.fsCacheFilePath) => {
	// Write the full list of matchLists, including ones in non-literally-named files, into FS cache
	let forFsCacheObject = {
		patches: patches,
		dateWritten: new Date().toISOString()
	}

	// Renew FS cache
	return await writeFile(path, JSON.stringify(forFsCacheObject)) 
}

export const getFsCache = async ({
	fsCacheFilePath = config.fsCacheFilePath,
	memCache
}={}) => {
	let previousFsCache = await readFile(fsCacheFilePath)
	let previousFsCacheJson = JSON.parse(previousFsCache)
	
	if (memCache) memCache.lastFsWrotePatches = parseDate(previousFsCacheJson.dateWritten)	

	return previousFsCacheJson
}

export const getPatchesFromDir = async (dirPath = config.storageDir) => {
	let filenames = await readDir(dirPath)

	filenames = filenames.filter(name => {
		if (!name.match(/\.(css|js)$/)) return false // Filter out files that shouldn't be here
		return true
	})
	
	let fileData = []
	for (let name of filenames){
		let file = new Promise(async (resolve, rej)=>{
			let matchListStr, id
			if (name.match(config.excessLengthIndicator)){ 
				// In the past, this file had to be saved with a randomly-generated ID + indicator string instead of the literal stringified matchList

				// Go inside the file and look for the special comment
				matchListStr = await getMatchListFromWithinFile(path.join(dirPath, name))
			} else {
				// The filename already is the matchList
				matchListStr = name.replace(/\.(css|js)\s*$/, '')
			}
			id = name.replace(/\.(css|js)\s*$/, '') // Remove file extension and use the filename as ID
			resolve({name, matchListStr, id})
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
		if (fileExtension === 'js'){
			extantPatch.addAsset(config.assetTypes.Js, path.join(dirPath, file.name))
		}
		if (fileExtension === 'css'){
			extantPatch.addAsset(config.assetTypes.Css, path.join(dirPath, file.name))
		}
		patches.set(extantPatch.id, extantPatch)
	})

	return patches
}

export const getAllPatches = async function({
	memCache, 
	fsCacheFilePath = config.fsCacheFilePath,
	fsPath = config.storageDir,
	forceRefresh = false
}={}){
	// TODO: Comparing cache contents (rather than mere existence) to determine whether the next stage of caching is necessary
	let fromCache

	// Check mem cache
	if (memCache && memCache.patches.length && !forceRefresh){
		console.debug('getAllPatches: Hit & using mem cache for entire patches list')
		fromCache = 'memCache'

		return Object.values(memCache.patches)
	}

	let foundPatches = []

	if (!forceRefresh){
		// Read FS cache
		try {
			let previousFsCacheJson = await getFsCache({memCache, fsCacheFilePath})
			console.debug('Found the FS cache file; reading that to find all patches.')
			
			// Instatiate all the JSON-ified plain objects into instances in memory
			previousFsCacheJson.patches.forEach((plainObject) => {
				foundPatches.push(new Patch(plainObject))
			})

			fromCache = 'fsCacheFile'
		} catch (err){
			// No extant FS cache file; instead, we must read dir contents
			foundPatches = await getPatchesFromDir(fsPath)
			fromCache = 'none'
		}
	} else {
		foundPatches = await getPatchesFromDir(fsPath)
		fromCache = 'noneForced'
	}

	foundPatches.fromCache = fromCache
	return foundPatches
}


export const updateAllCaches = async ({memCache, fsCacheFilePath, fsPath}={}) => {
	let freshPatches = await getAllPatches({
		memCache, fsCacheFilePath, fsPath,
		forceRefresh: true
	})
	await Promise.all[
		updateFSCache(freshPatches, fsCacheFilePath),
		updateMemCache(freshPatches, memCache)
	]
	memCache.valid = true
	return true
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