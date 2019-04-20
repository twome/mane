const path = require('path')
const fs = require('fs')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const makeDir = util.promisify(fs.mkdir)
const readDir = util.promisify(fs.readdir)

const axios = require('axios')
const trash = require('trash')

import { 
	testMatcherAgainstUrl,
	findMatchingPatchesForUrl,
	makeServer,
	makePatchMapFromStrings
} from '../src/server/server.js'
import { 
	importPatchesArchive, 
	savePatchToFs, 
	getPatchesFromDir, 
	getMatchListFromWithinFile, 
	updateAllCaches
} from '../src/server/files.js'
import { getConfig } from '../src/server/config.js'
import { Patch } from '../src/server/patch.js'

let config = getConfig()
let paths = {
	static: path.join(__dirname, 'static-materials'),
	sandbox: path.join(__dirname, 'testing-sandbox')
}
paths.staticJsonBackup = path.join(paths.static, 'user-js-css-v8-190402.json')
paths.staticPatches = path.join(paths.static, 'patches')
paths.sandboxFsCacheFile = path.join(paths.sandbox, '.cache', 'fs-cache-matchlists.json')

let itProd = (...args) => {
	if (process.env.NODE_ENV === 'production'){
		it(...args)
	} else {
		args[0] = 'TEST ONLY RUNS IN ENV: PRODUCTION ~ ' + args[0]
		it(args[0])
		return false 		
	}
}

let fillSandbox = async filenameContentsMap => {
	let writes = []

	for (let filename of filenameContentsMap.keys()){
		writes.push(writeFile(path.join(paths.sandbox, filename), filenameContentsMap.get(filename)))
	}

	return await Promise.all(writes)
}
let wipeSandbox = async () => trash(path.join(paths.sandbox, '/*'))

let patchMapToIds = map => [...map.values()].map(patch => patch.id)

describe('Server', function() {
	
	let archivePatches
	before(async () => {
		archivePatches = archivePatches || await importPatchesArchive(paths.staticJsonBackup, config.patchJsonSchema.UserJavascriptAndCSS)

		return await fillSandbox(new Map([
			[
				'bandcamp.com.js',
				'// fake javascript contents'
			],[
				'grievousbodilycalm.bandcamp.com.js',
				'// fake javascript contents'
			],[
				'marxists.org.css',
				'/* fake CSS contents */'
			],[
				'bandcamp.com,marxists.org.css',
				'/* fake CSS contents for multiple matchers */'
			],[
				`000000${config.excessLengthIndicator}*.bandcamp.com,sa.org.au.css`,
				'/* patch-urls *.bandcamp.com,sa.org.au */\n/* fake CSS contents for multiple matchers */'
			]
		]))
	})

	describe('importing', () => {
		it('imports patches from UserJavascriptAndCSS JSON exports', async () => {
			let archivePatches = await importPatchesArchive(paths.staticJsonBackup, config.patchJsonSchema.UserJavascriptAndCSS)
			assert.isArray(archivePatches)
			assert(archivePatches.length)
		})

		it('gets matchLists from special comments', async () => {
			let patchFileContents = `\n/* patch-urls example.*.com */\n`
			await writeFile(path.join(paths.sandbox, 'an-example-patch.js'), patchFileContents)
			let res = await getMatchListFromWithinFile(path.join(paths.sandbox, 'an-example-patch.js'))
			assert.strictEqual(res, 'example.*.com')
			fs.unlinkSync(path.join(paths.sandbox, 'an-example-patch.js'))
		})

		it('gets all patches from directory', async () => {
			let patches = await getPatchesFromDir({cfg})
			
			assert(patches instanceof Map)

			// Test the makeup of each patch
			assert.strictEqual(patches.get('bandcamp.com').id, 'bandcamp.com')
			assert.strictEqual(patches.get('bandcamp.com').js, undefined) // getPatchesFromDir shouldn't get asset bodies
			assert.isArray(patches.get('bandcamp.com').matchList)
			assert(patches.get('bandcamp.com') instanceof Patch)

			// Look for matchLists within special comment
			assert.deepEqual(patches.get(`000000${config.excessLengthIndicator}*.bandcamp.com,sa.org.au`).matchList, [
				'*.bandcamp.com',
				'sa.org.au'
			])
		})
	})

	describe('retrieving patches', () => {
		it('test single matcher against url', () => {
			assert.isFalse(testMatcherAgainstUrl('https://bandcamp.com', 'www.bandcamp.com'))
			assert.isFalse(testMatcherAgainstUrl('https://bandcamp.com', '*.bandcamp.com'))
			assert.isTrue(testMatcherAgainstUrl('https://bandcamp.com', '*bandcamp.com*'))
			assert.isTrue(testMatcherAgainstUrl('https://bandcamp.com', '*bandcamp.com'))
			assert.isTrue(testMatcherAgainstUrl('https://bandcamp.com', 'bandcamp.com*'))
			assert.isTrue(testMatcherAgainstUrl('https://grievousbodilycalm.bandcamp.com', '*.bandcamp.com'))
			assert.isTrue(testMatcherAgainstUrl('https://bandcamp.com', 'bandcamp.com'))
			assert.isTrue(testMatcherAgainstUrl('https://bandcamp.com/about.html', 'bandcamp.com'))
			assert.isFalse(testMatcherAgainstUrl('https://bandcamp.com', 'http:*facebook.com'))
		})
	})

	describe('exporting', () => {
		// Prod-only to avoid unnecessary write-wear on HDD
		itProd('writes patches to a directory', async () => {
			archivePatches.forEach(patch => {
				savePatchToFs(patch, paths.sandbox)
			})
			let readed = await readFile(path.join(paths.sandbox, 'amazon.com*.css'), 'utf-8')
			assert.isString(readed)
		})
	})

	describe('find matching patches from any cache / dir for URL (entire retrieval system)', function(){
		let cache, findOptions, findWithOptions
		before(async () => {
			cache = {
				patches: new Map(),
				recentUrlsHistory: new Map(),
				valid: false
			}

			findOptions = {
				forceRefresh: false,
				memCache: cache,
				fsCacheFilePath: paths.sandboxFsCacheFile,
				fsPath: paths.sandbox
			}

			findWithOptions = async url => await findMatchingPatchesForUrl(Object.assign({
				url
			}, findOptions))
		})

		it('caches are hit', async () => {
			let allCachesEmpty = await findWithOptions('https://bandcamp.com') // www.bandcamp.com should miss this
			assert.strictEqual(allCachesEmpty.fromCache, 'none')

			let shouldHitSpecificUrlCache = await findWithOptions('https://bandcamp.com')
			assert.strictEqual(shouldHitSpecificUrlCache.fromCache, 'specificUrl')

			await updateAllCaches({
				memCache: cache, 
				fsCacheFilePath: paths.sandboxFsCacheFile,
				fsPath: paths.sandbox
			}).catch(err => {
				console.error(`Couldn't update all caches`)
			})
			// TODO automatic cache refill
			// await allCachesEmpty.cacheUpdate // Wait for the first refill of all caches

			let shouldHitMemCache = await findWithOptions('https://bandcamp.com/tiny-difference')
			assert.strictEqual(shouldHitMemCache.fromCache, 'memCache')

			cache.patches = new Map() // Manually wipe the memCache - should still be able to consule the fsCacheFile

			let shouldHitFsCache = await findWithOptions('https://bandcamp.com/different-again')
			assert.strictEqual(shouldHitFsCache.fromCache, 'fsCacheFile')
		})

		it('normal patch request', async () => {
			let res = await findWithOptions('http://bandcamp.com')
			let ids = patchMapToIds(res)
			assert(ids.includes('bandcamp.com'))
			assert(ids.includes('bandcamp.com,marxists.org'))
			assert(!ids.includes('*.bandcamp.com')) // Only for present subdomains
		})

		it('matches second matcher in a multiple-matcher matchList', async () => {
			let res = await findWithOptions('http://www.sa.org.au')
			let ids = patchMapToIds(res)
			assert(ids.includes(`000000${config.excessLengthIndicator}*.bandcamp.com,sa.org.au`))
		})
	})

	describe('serving HTTP requests', function(){
		let server, cache
		before(done => {
			cache = {
				patches: new Map(),
				recentUrlsHistory: new Map(),
				valid: false
			}

			let serverCfg = Object.assign(config, {
				fsCacheFilePath: paths.fsCacheFilePath, 
				memCache: cache,
				storageDir: paths.sandbox
			})
			server = makeServer(serverCfg)
			server.listen(config.port, (err)=>{
				if (err){
					throw err
				}
				// Server ready function
				done()
			})
		})

		it('responds with patches that match URL as array', async () => {
			let response = await axios.get(`http://localhost:${config.port}/${config.routes.patchesFor}/bandcamp.com`)	
			
			assert.isArray(response.data)
			assert(response.data.map(patch => patch.id).includes(`000000${config.excessLengthIndicator}*.bandcamp.com,sa.org.au`))
			assert(response.data.map(patch => patch.id).includes('bandcamp.com,marxists.org'))
			assert(response.data.map(patch => patch.id).includes('bandcamp.com'))
		})

		it(`responds with patch bodies if asked`)
		it(`provides no way for requests from the patch to read anything other than the storageDir`)
		it(`only gives web-root-relative urls (ie of the storageDir) for asset files`)
		it(`leaves out the .js and .css body content if req param \`include-body=false\``)
	})
		
	after(async () => {
		return await wipeSandbox()
	})

})