const path = require('path')
const fs = require('fs')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const makeDir = util.promisify(fs.mkdir)
const readDir = util.promisify(fs.readdir)

const axios = require('axios')
const debug = require('debug')('spec: server')

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
let paths = {
	static: path.join(__dirname, 'static-materials'),
	sandbox: path.join(__dirname, 'testing-sandbox')
}
paths.patchesJsonBackupPath = path.join(paths.static, 'user-js-css-v8-190402.json')
paths.staticPatches = path.join(paths.static, 'patches')
paths.sandboxFsCacheFile = path.join(paths.sandbox, '.cache', 'fs-cache-matchlists.json')

describe('Server', function() {
	
	before(() => {
	})

	let archivePatches, fsPatches, memPatches
	beforeEach(async () => {
		archivePatches = archivePatches || await importPatchJson(paths.patchesJsonBackupPath, config.patchJsonSchema.UserJavascriptAndCSS)
		memPatches = makePatchMapFromStrings([
			'www.google.com',
			'google.com',
			'*.bandcamp.com',
			'bandcamp.com',
			'bandcamp.com,spotify.com'
		])
		fsPatches = fsPatches || await getPatchesFromDir(paths.staticPatches)
	})

	afterEach(async () => {
		// TODO: clear the testing-sandbox
	})

	describe('importing', () => {
		it('imports patches from UserJavascriptAndCSS JSON exports', async () => {
			let archivePatches = await importPatchJson(paths.patchesJsonBackupPath, config.patchJsonSchema.UserJavascriptAndCSS)
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
				savePatchToFs(patch, paths.sandbox)
			})
			let readed = await readFile(path.join(paths.sandbox, 'amazon.com*.css'), 'utf-8')
			assert.isString(readed)
		})
	})

	describe('URL matching', function(){
		let cache, findOptions, findWithOptions
		beforeEach(async () => {
			cache = {
				patches: memPatches,
				recentUrlsHistory: new Map(),
				valid: true
			}

			findOptions = {
				forceRefresh: false,
				memCache: cache,
				fsCacheFilePath: paths.sandboxFsCacheFile
			}

			findWithOptions = async url => await findMatchingPatchesForUrl(Object.assign({
				url: config.routes.patchesFor + '/' + url
			}, findOptions))
		})

		it('firstGoogle', async () => {
			let res = findWithOptions('https://google.com') // www.google.com should miss this
			assert.isArray(res)
			assert.assert(res.length === 0)
		})

		it('hitSpecificSearchCache', async () => {
			assert.isArray(findWithOptions('https://google.com'))
		})

		it('http', async () => {
			assert.isArray(findWithOptions('http://google.com'))
		})

		it('subdomain', async () => {
			assert.isArray(findWithOptions('https://maps.google.com'))
		})

		it('subdomainExcludingDomain', async () => {
			assert.isArray(findWithOptions('https://grievousbodilycalm.bandcamp.com'))
		})

		it('subdomainExcludingDomain2', async () => {
			assert.isArray(findWithOptions('https://bandcamp.com'))
		})

		it('pathname', async () => {
			assert.isArray(findWithOptions('https://google.com/search-results-page.html'))
		})

		it('Matches second matcher in a multiple-matcher matchList', async () => {
			findWithOptions('https://open.spotify.com/artist/0WtTGUjbur1R1cNzBvbsMU')
		})
	})

	describe('serving requests', function(){
		let server
		before(done => {
			server = makeServer()
			server.listen(config.port, 'localhost', (err)=>{
				if (err) throw err
				// Server ready function
				done()
			})
		})

		it('server responds with patches that match URL as array', async () => {
			let response = axios.get(`localhost:${config.port}/www.google.com`)
			debug('respond boy', response)

		})
	})
		
	
})