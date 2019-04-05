/*
	Mane

	A Node + WebExtension app that automatically inserts your custom JavaScript and CSS files, stored on your hard drive or a remote Git repository, into web pages to customise them - fix bugs, improve the visual design, remove ads - whatever you want! 

	It also allows you to easily share and use public community "patches", so everyone can easily benefit from one person's customisations. 

	This is similar in approach to GreaseMonkey on Firefox, and User Javascript & CSS on Chrome, but with an emphasis on editing and storing the patches in whatever way suits you, instead of in a custom editor and locked into a single browser extension's database.
*/

const fs = require('fs')
const path = require('path')
const util = require('util')

const escapeStringRegexp = require('escape-string-regexp')
const express = require('express')
import cloneDeep from '../node_modules/lodash-es/cloneDeep.js'

import { Patch } from './patch.js'
import { 
	getAllPatches,
	importPatchJson,
	savePatchToFS,
	getMatchListFromFile,
	getPatchAssetBodies 
} from './files.js'
import { getMatchListTruncated } from './util.js'
import { getConfig } from './config.js'

// Options
const config = getConfig()

const paths = {
	projectRoot: path.join(__dirname, '..')
}

// State
let cache = {
	patches: new Map(),
	lastFsReadPatches: null, /* DateTime */
	lastFsWrotePatches: null, /* DateTime */
	recentUrlsHistory: new Map(), // key: exact URL string, value: Array of patches
}



const testMatcherAgainstUrl = (url, matcher, stripOutsidePeriods)=>{
	// Turn `*.libsyn.org.*` into `libsyn.org`, in case the user actually misunderstood the regex format and wanted to include, eg, subdomainless URLs (which have no `.` prefix)
	if (stripOutsidePeriods) matcher = matcher.replace(/^\**\./, '').replace(/\.\**$/, '') 

	// Escape all URL characters that would have regex functionality
	matcher = escapeStringRegexp(matcher)
	
	// Turn 'wildcard/glob'-style "match anything" commands into the right RegExp tokens
	// NB: We don't need these wildcards at the beginning/end of matchers, as the matchers are already looking for a partial match in the whole string
	matcher = matcher.replace('\\*', '.*')

	return url.match(new RegExp(matcher))
}

const findMatchingPatchesForUrl = async (url, forceRefresh) => {
	// Check memory cache for this exact url (for refreshes, duplicate tabs, history navigation etc)
	let fromRecentUrls = cache.recentUrlsHistory.get(url)
	if (fromRecentUrls){
		console.debug('hit fromRecentUrls cache')
		return fromRecentUrls // If we've added any new patches, we should have refilled this cache
	}

	let freshPatches = await getAllPatches(cache, forceRefresh)
	// Check memory cache of all matchers

	let matchingPatches = freshPatches.filter(patch => {
		return patch.matchList.some(matcher => testMatcherAgainstUrl(url, matcher, config.accomodatingUrlMatching))
	})
	
	matchingPatches = await getPatchAssetBodies(matchingPatches)

	// Cache search result for this specific query / url
	cache.recentUrlsHistory.set(url, matchingPatches)

	console.debug(`matching patches for url "${url}":`, matchingPatches.map(patch => patch.matchList))

	return matchingPatches
}

const makeServer = () => {
	let server = express()
	
	server.get(config.routes.patchesFor + '/:urlToPatch', (req, res, next) => {
		console.debug('incoming url to look for patches for!!!', req.url)
		
		let urlToPatch = decodeURIComponent(req.params.urlToPatch)
		console.debug({urlToPatch})

		findMatchingPatchesForUrl(urlToPatch).then(patchArr => {
			patchArr = cloneDeep(patchArr) // Copy before customising the response

			console.debug('query object', req.query)

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



/*
	Testing
*/
// TEMP
let storedTestingJsonPath = path.join(paths.projectRoot, 'json-backups', 'user-js-css-v8-190402.json')
importPatchJson(storedTestingJsonPath, config.patchJsonSchema.UserJavascriptAndCSS)
	.then(patchArr => {

		cache.patches = [...cache.patches, ...patchArr] // Store whole thing into memory
		console.info(`Imported and saved: ${patchArr.map(patch => patch.matchList)}`)

		let saves = patchArr.map(patch => savePatchToFS(patch, config.storageDir))
		Promise.all(saves).then(() => {
			getAllPatches(cache, true).then(() => {

				findMatchingPatchesForUrl('www.facebook.com')
				findMatchingPatchesForUrl('google')
				findMatchingPatchesForUrl('https://www.youtube')
				findMatchingPatchesForUrl('reddit.com')
				findMatchingPatchesForUrl('libsyn.com')
				findMatchingPatchesForUrl('books.libsyn.com')
				findMatchingPatchesForUrl('grievousbodilycalm.bandcamp.com')
				findMatchingPatchesForUrl('bandcamp.com')
				findMatchingPatchesForUrl('medium.freecodecamp.org')
				findMatchingPatchesForUrl('jalopnik.com/some-bourgeois-nonsense')
				findMatchingPatchesForUrl('news.ycombinator.com')
				findMatchingPatchesForUrl('ycombinator.com')

				
			})

		})

		let server = makeServer()
		server.listen(config.port, 'localhost', (err)=>{
			if (err) throw err
			// Server ready function
			console.info(`Server successfully listening at: localhost:${config.port}`)
		})
		
		server.on('error', err => {
			console.debug('server.on error', err)
		})


	})
	.catch(err => {
		console.debug('WHOOPSIES')
		console.error(err)
	})  