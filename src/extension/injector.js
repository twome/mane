/*
	This file runs as a 'content script', within a separate execution context (although the same DOM/frame) to the main 'page scripts'. Relative URLs stem from chrome-extension://${EXTENSION_ID}/injector.js
*/
;(async function iifeForAwait(){

// Options
// This is hard-coded & duplicated from popup.js to avoid needing to fetch config from the background or popup extension JS
let cfg = {
	logInjections: true,
	maneServerHostname: 'http://localhost',
	maneServerPort: 1917,
	routes: {
		createPatchFile: 'create-patch',
		openFileNative: 'open-file',
		setPatchOptions: 'set-options',
		patches: 'patches',
	}
}
cfg.maneServerHost = `${cfg.maneServerHostname}:${cfg.maneServerPort}`
// This is also hard-coded & duplicated from popup.js to avoid needing to fetch config from the background or popup extension JS
const getMatchingPatches = async (url) => {
	// We need to encode to escape all the special URI characters
	let patchRequestPath = `${cfg.maneServerHost}/patches-for/${encodeURIComponent(url)}`

	let response = await fetch(patchRequestPath, {
		mode: 'cors'
	})
	if (response.ok) {
		let patchArr = await response.json()
		for (let patch of patchArr){
			if (!patch.options){
				console.error('Matching patch had no options; filling with defaults', patch)
				patch.options = {}
			}
			Object.assign(patch.options, {
				on: true,
				whenToRun: 'dom'
			})
		}
		return patchArr
	} else {
		throw response
	}
}

let last = arr => arr.reverse()[0]
let fileExtension = path => last(path.split('.'))

let patches
try {
	patches = await getMatchingPatches(location.href)
} catch(err){
	console.error(`Couldn't fetch patches from the Mane app serving at ${cfg.maneServerHost}; did you forget to start it?`, err)
	patches = [] // Act as if we simply got an empty response
}

for (let patch of patches){
	if (!patch.options.on){
		continue // Don't inject disabled patches
	}
	for (let asset of patch.assets){
		/*
			If we wanted to insert the script as a `type="module"` _inline_ script (and wrap the body with, eg, a DOMContentLoaded listener), we could get the body text directly here.

			let fileRequest = await fetch(`${cfg.maneServerHost}/${asset.fileUrl}`)
			let assetBody = await fileRequest.text()
			let invokeEl = document.createElement('script')
			if (patch.options.whenToRun){
				assetBody = `;document.addEventListener('DOMContentLoaded', function onDomContentLoaded(){\n${assetBody}\n});`
			}
			invokeEl.innerText = assetBody
			invokeEl.setAttribute('type', 'module')
			importInvocation = invokeEl
		*/

		let extension = fileExtension(asset.fileUrl)
		let fullAssetPath = `${cfg.maneServerHost}/${asset.fileUrl}`

		let invokeEl // The actual dependency invocation
		if (extension === 'js'){
			invokeEl = document.createElement('script')
			invokeEl.src = fullAssetPath
			invokeEl.setAttribute('type', 'module')
		} else if (extension === 'css'){
			invokeEl = document.createElement('link')
			invokeEl.href = fullAssetPath
			invokeEl.setAttribute('rel', 'stylesheet')
		} else {
			console.error(Error(`Unknown extension ${extension}`))
			continue
		}
		invokeEl.dataset.maneMatchList = patch.matchList.join(',')
		invokeEl.dataset.maneId = patch.id

		const inject = () => {
			document.head.appendChild(invokeEl)
			if (cfg.logInjections) console.info(`Mane: injected ${asset.fileUrl}`)
		}

		if (patch.options.whenToRun === 'immediate'){
			inject()
		} else if (patch.options.whenToRun === 'dom'){
			// Wait for the page INCLUDING all dependent resources (styles, images etc) to be completely loaded
			if (document.readyState === 'interactive' || document.readyState === 'complete'){
				inject()
			} else {
				document.addEventListener('DOMContentLoaded', inject)
			}
		} else if (patch.options.whenToRun === 'everything'){
			if (document.readyState === 'complete'){
				inject()
			} else {
				document.addEventListener('load', inject)
			}
		} else {
			throw Error(`Missing 'whenToRun' options for patch ${patch.id}`)
		}
	}
}

})()