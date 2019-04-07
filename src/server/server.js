const path = require('path')

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

const paths = {
	projectRoot: path.join(__dirname, '..', '..')
}

// State
let cache = {
	valid: false, // Whether we need to restore the cache or not
	patches: new Map(),
	lastFsReadPatches: null, /* DateTime */
	lastFsWrotePatches: null, /* DateTime */
	recentUrlsHistory: new Map(), // key: exact URL string, value: Array of patches
}



export const testMatcherAgainstUrl = (url, matcher, stripOutsidePeriods)=>{
	// Turn `*.libsyn.org.*` into `libsyn.org`, in case the user actually misunderstood the regex format and wanted to include, eg, subdomainless URLs (which have no `.` prefix)
	if (stripOutsidePeriods) matcher = matcher.replace(/^\**\./, '').replace(/\.\**$/, '') 

	// Escape all URL characters that would have regex functionality
	matcher = escapeStringRegexp(matcher)
	
	// Turn 'wildcard/glob'-style "match anything" commands into the right RegExp tokens
	// NB: We don't need these wildcards at the beginning/end of matchers, as the matchers are already looking for a partial match in the whole string
	matcher = matcher.replace('\\*', '.*')

	return url.match(new RegExp(matcher))
}

export const findMatchingPatchesForUrl = async (url, forceRefresh, memCache = cache) => {
	// Check memory cache for this exact url (for refreshes, duplicate tabs, history navigation etc)
	// console.debug(cache.recentUrlsHistory)

	let fromRecentUrls = memCache.recentUrlsHistory.get(url)
	if (fromRecentUrls){
		console.debug('findMatchingPatchesForUrl: hit from fromRecentUrls memCache', url)
		return fromRecentUrls // If we've added any new patches, we should have refilled this memCache
	}

	// console.debug({before: memCache})


	let patchesToSearch = await getAllPatches(memCache, forceRefresh)
	// Check memory cache of all matchers

	let matchingPatches = patchesToSearch.filter(patch => {
		return patch.matchList.some(matcher => testMatcherAgainstUrl(url, matcher, config.accomodatingUrlMatching))
	})
	
	matchingPatches = await getPatchAssetBodies(matchingPatches)

	// Cache search result for this specific query / url
	memCache.recentUrlsHistory.set(url, matchingPatches)

	// console.debug({after: memCache})

	console.debug(`matching patches for url "${url}":`, matchingPatches.map(patch => patch.matchList))

	return matchingPatches
}

export const makePatchMapFromStrings = matchListStrings => new Map(matchListStrings.map(matchListString => {
	let patch = new Patch(matchListString)
	return [patch.id, patch]
})) 

export const makeServer = () => {
	let server = express()
	
	server.get(config.routes.patchesFor + '/:urlToPatch', (req, res, next) => {
		console.info('Extension requested patches for url:', req.url)
		
		let urlToPatch = decodeURIComponent(req.params.urlToPatch)
		// console.debug({urlToPatch})

		findMatchingPatchesForUrl(urlToPatch).then(patchArr => {
			patchArr = cloneDeep(patchArr) // Copy before customising the response

			console.debug('Query object:', req.query)

			// ~ map of validating query commands/values 

			if (req.query['include-body'] === 'false'){

				patchArr = patchArr.map(patch => {
					delete patch.js
					delete patch.css
					return patch
				})
			}
			res.json(patchArr)
		})
	})

	return server
}