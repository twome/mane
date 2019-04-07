import { startBrowserServer, freshNodeRun } from './prepare-tests.js'

console.info(`Running tests simultaneously in Node (in this command line process), and in the browser (at localhost:8083/test) \n\n`)

startBrowserServer(__dirname)
freshNodeRun(__dirname).then(val => {
	console.info('Node tests within Mocha finished.')
})