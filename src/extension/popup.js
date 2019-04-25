/* global browser, chrome */

import Growl from './growl.js'
import NewPatch from './new-patch.js'
import ActivePatches from './active-patches.js'
import {
	last,
	fileExtension,
	getActiveAssets,
	assetsToPatchMap,
	getActivePatches,
	getActiveTabUrl,
	getMatchingPatches
} from './util.js'

// Options
let config = {
	patchHost: 'http://localhost:1917',
	routes: {
		createPatchFile: 'create-patch',
		openFileNative: 'open-file',
		setOptions: 'set-options',
		patches: 'patches',
	},
	btnAnimationTimeMs: 2000
}

// App-wide 'global' state
let app = {
	cfg: config,
	el: document.querySelector('[data-app="mane"]'),
	instances: new Set(),
	componentTypes: [NewPatch, ActivePatches, Growl],
	weApiAvailable: typeof browser !== 'undefined', // WebExtensions 'browser'/'chrome' API object present in global object
	chromeWeApiAvailable: typeof chrome !== 'undefined' && chrome.tabs // Account for Chrome's non-spec WE API implementation
}
// Add this to the constructor for each component to share it without boilerplate
app.componentTypes.forEach(type => {
	type.app = app
})

if (!app.weApiAvailable){
	if (app.chromeWeApiAvailable) window.browser = chrome
}

for (let type of [ActivePatches, NewPatch]){
	for (let el of [...document.querySelectorAll(type.selector)]){
		app.instances.add(new type(el), {

		})
	}
}