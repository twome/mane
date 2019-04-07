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
import { importPatchJson, savePatchToFs, getPatchesFromDir } from '../src/server/files.js'
import { getConfig } from '../src/server/config.js'
import { Patch } from '../src/server/patch.js'

let config = getConfig()

describe('Server', function() {
	
	let patchesJsonBackupPath
	before(() => {
		patchesJsonBackupPath = path.join(__dirname, 'static-materials', 'user-js-css-v8-190402.json')
	})

	let archivePatches, fsPatches, memPatches
	beforeEach(async () => {
		archivePatches = await importPatchJson(patchesJsonBackupPath, config.patchJsonSchema.UserJavascriptAndCSS)
		memPatches = makePatchMapFromStrings(['www.google.com', 'google.com', '*.bandcamp.com', 'bandcamp.com', 'bandcamp.com,spotify.com'])
		fsPatches = await getPatchesFromDir(path.join(__dirname, 'static-materials', 'patches'))
	})

	afterEach(async () => {
		// TODO: clear the testing-sandbox
	})

	describe('importing', () => {
		it('imports patches from UserJavascriptAndCSS JSON exports', async () => {
			let archivePatches = await importPatchJson(patchesJsonBackupPath, config.patchJsonSchema.UserJavascriptAndCSS)
			assert.isArray(archivePatches)
			assert(archivePatches.length)
		})

		// it('reads patches from filesystem directory', async () => {
		// 	let 
		// })
	})

	describe('exporting', () => {
		it('writes patches to a directory', async () => {
			archivePatches.forEach(patch => {
				savePatchToFs(patch, path.join(__dirname, 'testing-sandbox'))
			})
			let readed = await readFile(path.join(__dirname, 'testing-sandbox', 'amazon.com*.css'), 'utf-8')
			assert.isString(readed)
		})
	})

	// TODO split into specific URL interrelationships
	it('matches URLs correctly', function() {
		let cache = {
			patches: memPatches,
			recentUrlsHistory: new Map(),
			valid: true
		}
		assert.isArray(findMatchingPatchesForUrl('https://google.com', false, cache))
		assert.isArray(findMatchingPatchesForUrl('https://google.com', false, cache)) // Hits search cache
		assert.isArray(findMatchingPatchesForUrl('https://maps.google.com', false, cache)) // Subdomain
		assert.isArray(findMatchingPatchesForUrl('https://google.com/search-results-page.html'), false, cache) // Pathname
		assert.isArray(findMatchingPatchesForUrl('https://grievousbodilycalm.bandcamp.com'), false, cache)
		assert.isArray(findMatchingPatchesForUrl('https://bandcamp.com/about'), false, cache)

		// Matches second matcher in a multiple-matcher matchList
		assert.isArray(findMatchingPatchesForUrl('https://open.spotify.com/artist/0WtTGUjbur1R1cNzBvbsMU'), false, cache)
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