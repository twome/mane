const path = require('path')

const escapeStringRegexp = require('escape-string-regexp')
const express = require('express')
const open = require('open')
const bodyParser = require('body-parser')
import cloneDeep from '../../node_modules/lodash-es/cloneDeep.js'

import { Patch } from './patch.js'
import { raceTimer } from './util.js'
import { 
	getAllPatches,
	getPatchAssetBodies,
	savePatchToFs,
	setOptions,
	getOptions
} from './files.js'
import { getConfig } from './config.js'

// Options
const config = getConfig()

// State
let cache = {
	valid: false, // Whether we need to restore the cache or not
	patches: new Map(),
	lastFsReadPatches: null, /* DateTime */
	lastFsWrotePatches: null, /* DateTime */
	recentUrlsHistory: new Map(), // key: exact URL string, value: Patch[]
}



export const testMatcherAgainstUrl = (url, matcher, stripOutsidePeriods = false)=>{
	// Turn `*.example.com.*` into `example.com`, in case the user actually misunderstood the regex format and wanted to include, eg, subdomainless URLs (which have no `.` prefix)
	if (stripOutsidePeriods) matcher = matcher.replace(/^\**\./, '').replace(/\.\**$/, '') 

	// Escape all URL characters that would have regex functionality
	matcher = escapeStringRegexp(matcher)
	
	// Turn 'wildcard/glob'-style "match anything" commands into the right RegExp tokens
	// NB: We don't need these wildcards at the beginning/end of matchers, as the matchers are already looking for a partial match in the whole string
	matcher = matcher.replace(/\\\*/g, '.*')

	let regex = new RegExp(matcher)
	return !! url.match(regex)
}

export const findMatchingPatchesForUrl = async ({
	url, forceRefresh, 
	memCache = cache, 
	fsPath = config.fsPath, 
	fsCacheFilePath = config.fsCacheFilePath, 
	needBody = false
}={}) => {
	// Check memory cache for this exact url (for refreshes, duplicate tabs, history navigation etc)
	let fromRecentUrls = memCache.recentUrlsHistory && memCache.recentUrlsHistory.get(url)
	if (fromRecentUrls){
		fromRecentUrls.fromCache = 'specificUrl'
		return fromRecentUrls // If we've added any new patches, we should have refilled this memCache
	}

	let patchesToSearch = await getAllPatches({
		memCache, fsCacheFilePath, fsPath, forceRefresh
	})
	let { fromCache } = patchesToSearch
	
	let matchingPatches = [...patchesToSearch.values()].filter(patch => {
		return patch.matchList.some(matcher => testMatcherAgainstUrl(url, matcher, config.accomodatingUrlMatching))
	})
	
	// TODO: Broken
	if (needBody){
		matchingPatches = matchingPatches.map(async patch => {
			try {
				patch.assets = await getPatchAssetBodies(patch, fsPath)			
				return patch
			} catch(err){
				console.error('Patch asset file missing')
				throw Error('Patch asset file missing')
			}
		})
		matchingPatches = await Promise.all(matchingPatches)
	}

	// Cache search result for this specific query / url
	memCache.recentUrlsHistory.set(url, matchingPatches)

	matchingPatches.fromCache = fromCache // Tack on a clue as to which cache (if any) this request hit
	
	// TODO
	// Attach a promise so the consumer can wait for the cache to finish updating if we need
	// matchingPatches.cacheUpdate = !memCache.valid ? updateAllCaches(memCache, fsCacheFilePath) : false
	return matchingPatches
}

export const makePatchMapFromStrings = matchListStrings => new Map(matchListStrings.map(matchListString => {
	let patch = new Patch(matchListString)
	return [patch.id, patch]
})) 

export const makeServer = (cfg = config) => {
	let server = express()

	server.use('*', (req, res, next) => {
		// Requests originate from the remote hosts' Javascript
		res.header('Access-Control-Allow-Origin', '*')
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
		next()
	})
	
	/*
		TODO
		SECURITY: foreign domain beside that which the extension popup is running from MUST NOT be able to know any contents of the Mane user's FS beside the specific matching assets. Ideally, the foreign domains don't even know that, and we insert the asset as a content script / content style, not in-page.
	*/
	server.get(`/${cfg.routes.patchesFor}/:urlToMatch`, (req, res) => {
		if (config.logLevel >= 2) console.info('Extension requested patches for url:', decodeURIComponent(req.url))
		
		let urlToMatch = decodeURIComponent(req.params.urlToMatch)

		findMatchingPatchesForUrl({
			url: urlToMatch,
			memCache: cfg.memCache || cache,
			fsCacheFilePath: cfg.fsCacheFilePath,
			fsPath: cfg.storageDir,
			// needBody: true
		}).then(patchArr => {
			patchArr = cloneDeep(patchArr) // Copy before customising the response

			// ~ map of validating query commands/values 

			if (req.query['include-body'] === 'false'){

				patchArr = patchArr.map(patch => {
					delete patch.js
					delete patch.css
					return patch
				})
			}
			res.json(patchArr)
		}).catch(err => {
			res.status(500)
			res.send(`Couldn't execute the patch search for URL`)
		})
	})

	/*
		TODO
		SECURITY: foreign domains beside that which the extension popup is running from MUST NOT be able to tell this server to write any file on the OS whatsoever.
	*/
	server.post(`/${cfg.routes.createPatchFile}`, bodyParser.json())
	server.post(`/${cfg.routes.createPatchFile}`, (req, res) => {
		// Verify request's body works as constructor arguments
		let newPatch
		try {
			newPatch = new Patch(req.body)
		} catch(err){
			res.status(400)
			res.send(`Couldn't create a new patch in memory using the constructor argument options POSTed. Error: ${err.message}`)
			return err
		}

		for (let asset of newPatch.assets){
			asset.body = '/* Start writing your patch! */'
		}

		savePatchToFs(newPatch, cfg.storageDir).then(() => {
			console.info('Saved new patch to fs:', newPatch)
			for (let asset of newPatch.assets){
				open(path.join(cfg.storageDir, asset.fileUrl))
			}

			res.status(201) // Created resource
			res.type('json') // Content-Type
			res.send({
				newPatch
			})	
		}).catch(err => {
			console.error('Save failed:', err)
			res.status(500)
			res.send(`Server failed to save the new patches to storage`)
		})
	})

	server.get(`/${cfg.routes.openFileNative}/:pathToOpen`, (req, res) => {
		/*
			TODO
			SECURITY: foreign domains beside that which the extension popup is running from MUST NOT be able to tell this server to open anything in the native OS
		*/

		let absolutePath = path.join(cfg.storageDir, req.params.pathToOpen)

		open(absolutePath).then(() => {
			res.status(200)
			res.send(`File attempted to open using the default app in the Mane server's OS (we cannot know whether or not it opened successfully in a useful/meaningful way.`)
		}, err => {
			res.status(500)
			res.send(`Server couldn't open file`)
		})
	})

	server.put(`/${cfg.routes.setOptions}/*`, bodyParser.json())
	server.put(`/${cfg.routes.setOptions}/:patchId`, (req, res, next) => {
		getOptions({cfg})
			.then(allOptions => {
				allOptions[decodeURIComponent(req.params.patchId)] = req.body
				setOptions(allOptions, { cfg, cache })
					.then(() => {
						res.sendStatus(200)
					})
					.catch(err => {
						res.status(500)
						res.send(`Couldn't write options to FS`)
					})	
			})
			.catch(err => {
				getAllPatches({
					memCache: cache, 
					fsPath: cfg.fsPath, 
					fsCacheFilePath: cfg.fsCacheFilePath
				}).then(allPatches => {
					let optionsFromScratch = [...allPatches.values()].reduce((obj, patch) => {
						obj[patch.id] = patch.options
						return obj
					}, {})

					optionsFromScratch[decodeURIComponent(req.params.patchId)] = req.body
					setOptions(optionsFromScratch, { cfg, cache })
						.then(() => {
							res.send(200)
						})
						.catch(err => {
							res.status(500)
							res.send(`Couldn't write options to FS`)
						})	
				})
			})
	})

	/*
		TODO
		SECURITY: foreign domain beside that which the extension popup is running from MUST NOT be able to know any contents of the Mane user's FS beside the specific matching assets. Ideally, the foreign domains don't even know that, and we insert the asset as a content script / content style, not in-page.
	*/
	// TODO: this breaks requesting from remote servers (and no response whatsoever except the 400??)
	/*server.use('*', (req, res, next) => {
		let probablyAFile = req.url.match(/\./g)
		if (!probablyAFile){
			res.status(400)
			res.type('json') // Content-Type
			res.send({
				explanation: `Looks like you're requesting something that isn't a file - if you're looking for an API endpoint, try one of the available routes attached.`,
				availableRoutes: cfg.routes
			})
		} else {
			next()
		}
	})*/
	server.get('*', express.static(cfg.storageDir)) // Serve the patch file bodies

	return server
}