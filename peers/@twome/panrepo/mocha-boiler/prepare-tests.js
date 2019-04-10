// Inbuilt
const path = require('path')
const fs = require('fs')
const util = require('util')

const readDir = util.promisify(fs.readdir)

const express = require('express')
require('chai/register-assert') // Adds `assert` to the global object so tests can depend on it 
let Mocha = require('mocha')

const { parseConfigs, envs } = require('../build-config.js')

let config = parseConfigs({
	NODE_VERBOSE: 1,
	NODE_ENV: envs.development,
	LOCAL_SERVER_PORT: 8083,
	LOCAL_SERVER_HOSTNAME: 'localhost'
})

let createPaths = (root) => {
	let paths = {
		projectRoot: root || path.join(__dirname)
	}
	paths = Object.assign(paths, {
		temp: path.join(paths.projectRoot, '.tmp'),
		dist: path.join(paths.projectRoot, 'dist'),
		src: path.join(paths.projectRoot, 'src'),
		nodeModules: path.join(paths.projectRoot, 'node_modules'),
		tests: path.join(paths.projectRoot, 'test')
	})
	return { paths }
}



/*
	Browser tests
*/

export let startBrowserServer = ({
	rootDir, 
	testPath = 'test/browser',
	callback = () => console.debug('Browser server listening.')
}={}) => {
	let port = config.LOCAL_SERVER_PORT
	let hostname = config.LOCAL_SERVER_HOSTNAME

	let server = express()
	
	server.get('/api/browser-tests', (req, res) => {
		(async () => {
			let testPaths = await readDir(path.join(rootDir, testPath))

			testPaths = testPaths.map(filename => path.join('test-dir', filename)) 

			res.json(testPaths)
		})()
	})
	server.get('/test-dir/*', express.static(path.join(rootDir, testPath)))
	server.get('/n/*', express.static(path.join(rootDir, 'node_modules')))
	server.get('/src/*', express.static(path.join(rootDir, 'src')))
	server.get('*', express.static(__dirname)) // For serving the actual test page

	console.info(`Starting local server at ${hostname ? hostname : ''}:${port}`)
	server.listen(port, hostname, callback)
}



/*
	Node tests
*/

export let freshNodeRun = (rootDir) => new Promise((res, rej)=>{
	console.info('Running Node tests through Mocha')

	let paths = createPaths(rootDir).paths
	let mocha = new Mocha({
		ui: 'bdd'
	})
	mocha.checkLeaks()

	// Add each .spec.js file to the mocha instance
	let files = fs.readdirSync(paths.tests).filter(filename => filename.match(/\.(node|iso)\.js$/))
	files.forEach(filename => {
		mocha.addFile(
			path.join(paths.tests, filename)
		)
	})

	// Run the tests.
	return mocha.run(failures => {
		if (failures) rej(failures)
		process.exitCode = failures ? 1 : 0  // exit with non-zero status if there were failures
		res(mocha)
	})
})

// TODO: automatically re-run on changes to watched files