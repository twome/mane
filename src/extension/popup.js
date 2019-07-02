/* global browser, chrome */

import Growl from './growl.js'
import NewPatch from './new-patch.js'
import ActivePatches from './active-patches.js'

console.info('Mane popup opening')

// Options
let config = {
	patchHost: 'http://localhost:1917',
	routes: {
		testConnection: 'test-connection',
		createPatchFile: 'create-patch',
		openFileNative: 'open-file',
		setPatchOptions: 'set-options',
		patches: 'patches',
	},
	btnAnimationTimeMs: 2000,
	testConnectionIntervalMs: 3000,
	appRenderIntervalMs: 1000,
	assetTypes: {
		'js': 1,
		'css': 2
	}
}

// App-wide 'global' state
let app = {
	serverAvailable: null,
	cfg: config,
	el: document.querySelector('[data-app="mane"]'),
	instances: new Set(),
	componentTypes: [NewPatch, ActivePatches, Growl],
	weApiAvailable: typeof browser !== 'undefined', // WebExtensions 'browser'/'chrome' API object present in global object
	chromeWeApiAvailable: typeof chrome !== 'undefined' && new Boolean(chrome.tabs), // Account for Chrome's non-spec WE API implementation
	connectionIndicatorC: null, /*Growl*/
	activePatchesC: null, /*ActivePatches*/
	newPatchC: null, /*NewPatch*/

	render(cascadeToChildComponents){
		browser.browserAction.setIcon({
			path: {
				16: app.serverAvailable ? './images/icon/mane_16.png' : './images/icon/mane_16_grey.png'
			}
		})


		if (cascadeToChildComponents) for (let i of app.instances){ i.render() }

		if (app.serverAvailable){
			if (app.connectionIndicatorC){
				app.connectionIndicatorC.kill()
				app.connectionIndicatorC = null
			}
		} else {
			app.connectionIndicatorC = app.connectionIndicatorC || new Growl({
				message: `Can't connect to Mane server (the menubar app)`,
				type: Growl.types.Error,
				showImmediately: true,
				attachPoint: app.el.querySelector('.ConnectionIndicator'),
				lifespanMs: 0,
				dismissable: false
			})
		}
	}
}
// Add this to the constructor for each component to share it without boilerplate
app.componentTypes.forEach(type => {
	type.app = app
})

if (!app.weApiAvailable){
	if (app.chromeWeApiAvailable) window.browser = chrome
}

let testConnection = () => {
	fetch(`${config.patchHost}/${config.routes.testConnection}`, {
		mode: 'cors'
	}).then(res => {
		app.serverAvailable = res.ok
	}, err => {
		app.serverAvailable = false
	}).finally(() => {
		app.render()
	})
}
testConnection()

setInterval(testConnection, config.testConnectionIntervalMs)
setInterval(app.render, config.appRenderIntervalMs)

// Initialise
for (let type of [ActivePatches, NewPatch]){
	for (let el of [...document.querySelectorAll(type.selector)]){
		let componentInstance = new type(el)

		// HACK to communicate between components
		if (type === NewPatch){
			app.newPatchC = componentInstance
		}
		if (type === ActivePatches){
			app.activePatchesC = componentInstance
		}

		app.instances.add(componentInstance)
	}
}

// HACK
app.newPatchC.fetchMatchingPatches = () => {
	return app.activePatchesC.patches
}
