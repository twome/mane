import '../node_modules/mocha/mocha.js' // Side-effects on global
import '../node_modules/chai/chai.js' // Side-effects on global

window.assert = chai.assert

mocha.setup({
	ui: 'bdd',
	// reporter: 'mochawesome'
})
mocha.checkLeaks()

let tests = {
	exampleSpec: import('./example.iso.js'),
}

Promise.all(Object.values(tests)).then(arr => {
	console.debug('All tests loaded; running Mocha...')
	mocha.run()
}, err => {
	throw err
})