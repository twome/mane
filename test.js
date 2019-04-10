import { freshNodeRun } from './peers/@twome/panrepo/mocha-boiler/prepare-tests.js'

console.info('Running Mocha tests...')

freshNodeRun(__dirname).then(val => {
	console.info('Node tests within Mocha finished.')
})