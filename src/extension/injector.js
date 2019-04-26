;(async function iifeForAwait(){

// Options
let patchHost = 'http://localhost:1917'
let logInjections = true

let last = arr => arr.reverse()[0]
let fileExtension = path => last(path.split('.'))

// We need to encode to escape all the special URI characters
let patchRequestPath = `${patchHost}/patches-for/${encodeURIComponent(location.href)}`

let patches
try {
	let response = await fetch(patchRequestPath)
	patches = await response.json()
} catch(err){
	console.error(`Couldn't fetch patches from the Mane app serving at ${patchHost}; did you forget to start it?`, err)
	patches = [] // Act as if we simply got an empty response
}

for (let patch of patches){
	if (!patch.options){
		// Use defaults if missing
		patch.options = {
			on: true,
			waitForDomContentLoaded: true
		}
	}
	if (!patch.options.on){
		continue // Don't inject disabled patches
	}
	for (let asset of patch.assets){

		/*
			If we wanted to insert the script as a `type="module"` _inline_ script (and wrap the body with, eg, a DOMContentLoaded listener), we could get the body text directly here.

			let fileRequest = await fetch(`${patchHost}/${asset.fileUrl}`)
			let assetBody = await fileRequest.text()
			let invokeEl = document.createElement('script')
			if (patch.options.waitForDomContentLoaded){
				assetBody = `;document.addEventListener('DOMContentLoaded', function onDomContentLoaded(){\n${assetBody}\n});`
			}
			invokeEl.innerText = assetBody
			invokeEl.setAttribute('type', 'module')
			importInvocation = invokeEl
		*/

		let extension = fileExtension(asset.fileUrl)
		let fullAssetPath = `${patchHost}/${asset.fileUrl}`

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
			if (logInjections) console.info(`Mane: injected ${asset.fileUrl}`)
		}

		if (patch.options.waitForDomContentLoaded === true || document.readyState === 'complete'){
			inject()
		} else if (patch.options.waitForDomContentLoaded === 'full'){
			// Wait for the page INCLUDING all dependent resources (styles, images etc) to be completely loaded
			document.addEventListener('load', inject)
		} else {
			document.addEventListener('DOMContentLoaded', inject)
		}
	}
}

})()