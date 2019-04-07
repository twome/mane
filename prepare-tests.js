// Inbuilt
const path = require('path')
const fs = require('fs')

const liveServer = require('live-server')
require('chai/register-assert') // Adds `assert` to the global object so tests can depend on it 
let Mocha = require('mocha')

const { parseConfigs, envs } = require('./build-config.js')

let config = parseConfigs({
	NODE_VERBOSE: 1,
	NODE_ENV: envs.development,
	LOCAL_SERVER_PORT: 8083,
	LOCAL_SERVER_HOSTNAME: 'localhost'
})

let createPaths = (root = __dirname) => {
	let paths = {
		projectRoot: root
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

export let startBrowserServer = (rootDir, callback) => {
	let paths = createPaths(rootDir).paths
	let port = config.LOCAL_SERVER_PORT
	let hostname = config.LOCAL_SERVER_HOSTNAME
	console.info(`Starting local server at ${hostname ? hostname : ''}:${port}`)
	let serverConfig = {
		root: paths.projectRoot,
		host: hostname,
		mount: [ // Mount a directory to a route, allowing browser clients to see "higher" in FS than the root
			['/n', paths.nodeModules],
			['/src', paths.src]
		], 
		port: port,
		open: false, // '/test',
		logLevel: 2
	}
	liveServer.start(serverConfig)
	if (callback) callback(serverConfig)
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
	mocha.run(failures => {
		if (failures) rej(failures)
		process.exitCode = failures ? 1 : 0  // exit with non-zero status if there were failures
		res(mocha)
	})
})

// TODO: automatically re-run on changes to watched files