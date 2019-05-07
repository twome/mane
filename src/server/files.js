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

export const getPatchAssetBodies = async (patch, { cfg }) => {
	// TODO: parallelise
	let reads
	let assets = patch.assets.map(asset => {
		if (!asset.fileUrl) return asset
		reads.push(
			readFile(path.join(cfg.storageDir, asset.fileUrl))
				.then(body => {
					asset.body = body
				}).catch(err => {
					asset.body = null
				})
		)
		return asset
	})
	await Promise.all(reads) // Wait until bodies for this asset all fetched
	return assets
}

export const createPatchOptionsFromDir = async ({cfg, cache}) => {
	let allPatches = await getAllPatches({
		cfg,
		cache
	})

	let optionsFromScratch = [...allPatches.values()].reduce((obj, patch) => {
		obj[patch.id] = patch.options
		return obj
	}, {})

	return await setPatchOptions(optionsFromScratch, {cfg, cache})
}

export const getPatchOptions = async ({cfg, cache}) => {
	// TODO use cache

	let fileBody
	try {
		fileBody = await readFile(cfg.optionsJsonPath, 'utf8')
	} catch (err){
		await createPatchOptionsFromDir({cfg, cache})
		fileBody = await readFile(cfg.optionsJsonPath, 'utf8')
	}
	return JSON.parse(fileBody)
}

export const setPatchOptions = async (allOptions, {cfg}) => {
	await writeFile(cfg.optionsJsonPath, JSON.stringify(allOptions, undefined, 2))
}

export const setSinglePatchOptions = async (id, singleOptions, {cfg, cache}) => {
	let extant = await getPatchOptions({cfg, cache})
	extant[id] = singleOptions
	await setPatchOptions(extant, {cfg, cache})
}

export let importPatchesArchive = async (url, scheme)=>{
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
				assets: Object[]{
					fileUrl: String - relative to cfg.storageDir
					assetType: Integer - Enum config.assetTypes
				},
				id: String
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


export let savePatchToFs = async (patch, {
	cfg, cache,
	canOverwriteExisting = false
}) => {
	try {
		await makeDir(cfg.storageDir, { recursive: true })
	} catch (nodeFsError){
		// We're fine if the dir already exists, otherwise rethrow
		console.error('Non-EEXIST error when trying to `mkdir -p` the storageDir')
		if (!nodeFsError.code.match(/EEXIST/i)) throw nodeFsError
	}
	let writes = patch.assets.map(async asset => {
		// TODO why this undef
		console.info('Writing asset:', asset)

		if (asset.body === undefined) return Promise.reject(Error('Undefined body on asset provided'))
		if (!asset.fileUrl) return Promise.reject(Error('Asset missing fileUrl'))

		let absolutePath = path.join(cfg.storageDir, asset.fileUrl)

		let extantBody
		if (!canOverwriteExisting){
			try {
				extantBody = await readFile(absolutePath)
				if (extantBody.length > 0){
					throw Error('Cannot overwrite a non-empty file whilst `canOverwriteExisting` is true')
				}
			} catch(nodeFsError){
				if (nodeFsError.code.match(/ENOENT/i)){
					// File doesn't exist; we're good to create a new one!
				} else if (extantBody.length){
					throw nodeFsError
				}
				// If there's no body, then there's nothing to lose by writing over it
			}
		}

		return writeFile(absolutePath, asset.body)
	})

	writes.push( setSinglePatchOptions(patch.id, patch.options, { cfg, cache }) )

	return Promise.all(writes)
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


export const updateFSCache = async (patches, {
	cfg
}) => {
	// Write the full list of matchLists, including ones in non-literally-named files, into FS cache
	let forFsCacheObject = {
		patches: patches,
		dateWritten: new Date().toISOString()
	}

	// Renew FS cache
	return await writeFile(cfg.fsCacheFilePath, JSON.stringify(forFsCacheObject, undefined, 2))
}

export const getFsCache = async ({
	cfg,
	memCache
}={}) => {
	let previousFsCache = await readFile(cfg.fsCacheFilePath)
	let previousFsCacheJson = JSON.parse(previousFsCache)

	if (memCache) memCache.lastFsWrotePatches = parseDate(previousFsCacheJson.dateWritten)

	return previousFsCacheJson
}

export const getPatchesFromDir = async ({ cfg, cache }) => {
	let filenames = await readDir(cfg.storageDir)

	filenames = filenames.filter(name => {
		if (!name.match(/\.(css|js)$/)) return false // Filter out files that shouldn't be here
		return true
	})

	let allOptions = await getPatchOptions({cfg, cache})

	let fileData = []
	for (let name of filenames){
		let file = new Promise(async (resolve)=>{
			let matchListStr, id
			if (name.match(config.excessLengthIndicator)){
				// In the past, this file had to be saved with a randomly-generated ID + indicator string instead of the literal stringified matchList

				// Go inside the file and look for the special comment
				matchListStr = await getMatchListFromWithinFile(path.join(cfg.storageDir, name))
			} else {
				// The filename already is the matchList
				matchListStr = name.replace(/\.(css|js)\s*$/, '')
			}
			id = name.replace(/\.(css|js)\s*$/, '') // Remove file extension and use the filename as ID
			resolve({
				name,
				matchListStr,
				id,
				options: allOptions[id]
			})
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
			extantPatch.addAsset(config.assetTypes.Js, file.name)
		}
		if (fileExtension === 'css'){
			extantPatch.addAsset(config.assetTypes.Css, file.name)
		}
		patches.set(extantPatch.id, extantPatch)
	})

	return patches
}

export const getAllPatches = async function({
	cache,
	forceRefresh = false,
	cfg
}={}){
	let memCache = cache

	// TODO: Comparing cache contents (rather than mere existence) to determine whether the next stage of caching is necessary
	let fromCache

	// Check mem cache
	if (memCache && memCache.patches.length && !forceRefresh){
		fromCache = 'memCache'

		return Object.values(memCache.patches)
	}

	let foundPatches = []

	if (!forceRefresh){
		// Read FS cache
		try {
			let previousFsCacheJson = await getFsCache({memCache, cfg})

			// Instatiate all the JSON-ified plain objects into instances in memory
			previousFsCacheJson.patches.forEach((plainObject) => {
				foundPatches.push(new Patch(plainObject))
			})

			fromCache = 'fsCacheFile'
		} catch (err){
			// No extant FS cache file; instead, we must read dir contents
			foundPatches = await getPatchesFromDir({cfg, cache})
			fromCache = 'none'
		}
	} else {
		foundPatches = await getPatchesFromDir({cfg, cache})
		fromCache = 'noneForced'
	}

	foundPatches.fromCache = fromCache

	return foundPatches
}


export const updateAllCaches = async ({
	cfg,
	cache
}={}) => {
	let memCache = cache
	let freshPatches = await getAllPatches({
		cache: memCache, cfg,
		forceRefresh: true
	})
	await Promise.all[
		updateFSCache(freshPatches, cfg.fsCacheFilePath),
		updateMemCache(freshPatches, memCache)
	]
	memCache.valid = true
	return true
}


// TODO saveEverythingTarball
// ~ save everything we can touch into a local FS tar.lz2 with a single JSON and optional non-text assets (images etc) for better compression