import { startBrowserServer, freshNodeRun } from './node_modules/@twome/panrepo/mocha-boiler/prepare-tests.js'

console.info(`Running tests simultaneously in Node (in this command line process), and in the browser (at localhost:8083/test) \n\n`)

startBrowserServer({
	rootDir: __dirname,
	testPath: 'test/browser'
})

freshNodeRun(__dirname).then(val => {
	console.info('Node tests within Mocha finished.')
})