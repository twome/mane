const escapeStringRegexp = require('escape-string-regexp')
const express = require('express')
import cloneDeep from '../../node_modules/lodash-es/cloneDeep.js'

import { Patch } from './patch.js'
import { 
	getAllPatches,
	getPatchAssetBodies
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
	
	server.get(cfg.routes.patchesFor + '/:urlToPatch', (req, res) => {
		if (config.logLevel >= 2) console.info('Extension requested patches for url:', decodeURIComponent(req.url))
		
		let urlToPatch = decodeURIComponent(req.params.urlToPatch)

		findMatchingPatchesForUrl({
			url: urlToPatch,
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
			res.sendStatus(404)
			// res.send(`Couldn't execute the patch search for URL`)
		})
	})
	server.get('*', (req, res, next) => {
		// Requests originate from the remote hosts' Javascript
		res.header("Access-Control-Allow-Origin", "*")
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
		next()
	})
	server.get('*', express.static(cfg.storageDir)) // Serve the patch file bodies

	return server
}