const path = require('path')
const fs = require('fs')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const makeDir = util.promisify(fs.mkdir)
const readDir = util.promisify(fs.readdir)

// const axios = require('axios')

import { 
	testMatcherAgainstUrl,
	findMatchingPatchesForUrl,
	makeServer,
	makePatchMapFromStrings
} from '../src/server/server.js'
import { importPatchJson } from '../src/server/files.js'
import { getConfig } from '../src/server/config.js'
import { Patch } from '../src/server/patch.js'

let config = getConfig()

describe('Server', function() {
	let patchesJsonBackupPath
	before(() => {
		patchesJsonBackupPath = path.join(__dirname, 'static-materials', 'user-js-css-v8-190402.json')
	})

	let archivePatches, memPatches
	beforeEach(async () => {
		archivePatches = await importPatchJson(patchesJsonBackupPath, config.patchJsonSchema.UserJavascriptAndCSS)
		memPatches = makePatchMapFromStrings(['www.google.com', 'google.com', '*.bandcamp.com', 'bandcamp.com', 'bandcamp.com,spotify.com'])
	})

	// TODO split into specific URL interrelationships
	it('matches URLs correctly', function() {
		let cache = {
			patches: memPatches
		}
		assert.isArray(findMatchingPatchesForUrl('https://google.com', false, cache.patches))
		assert.isArray(findMatchingPatchesForUrl('https://google.com', false, cache.patches)) // Hits search cache
		assert.isArray(findMatchingPatchesForUrl('https://maps.google.com', false, cache.patches)) // Subdomain
		assert.isArray(findMatchingPatchesForUrl('https://google.com/search-results-page.html'), false, cache.patches) // Pathname
		assert.isArray(findMatchingPatchesForUrl('https://grievousbodilycalm.bandcamp.com'), false, cache.patches)
		assert.isArray(findMatchingPatchesForUrl('https://bandcamp.com/about'), false, cache.patches)

		// Matches second matcher in a multiple-matcher matchList
		assert.isArray(findMatchingPatchesForUrl('https://open.spotify.com/artist/0WtTGUjbur1R1cNzBvbsMU'), false, cache.patches)
	})

	it('serves patches that match URL as array', async () => {
		let server = makeServer()
		server.listen(config.port, 'localhost', (err)=>{
			if (err) throw err
			// Server ready function
		})

		// TODO http requests
		// axios.get(`localhost:${config.port}/www.google.com``)
	})
})