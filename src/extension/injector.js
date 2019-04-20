// Options
let patchHost = 'http://localhost:1917'
let logInjections = true

let last = arr => arr.reverse()[0]
let fileExtension = path => last(path.split('.'))

;(async function iifeForAwait(){

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
	if (!patch.options.on) continue
	for (let asset of patch.assets){
		
		/*
			If we wanted to insert the script as a `type="module"` _inline_ script (and wrap the body with, eg, a DOMContentLoaded listener), we could get the body text directly here.

			// let asset = await (await fetch(`${patchHost}/${asset.fileUrl}`)).text()
			// asset.body
		*/
			
		let extension = fileExtension(asset.fileUrl)
		let fullAssetPath = `${patchHost}/${asset.fileUrl}`

		let importInvocation
		if (extension === 'js'){
			let el = document.createElement('script')
			el.src = fullAssetPath
			el.setAttribute('type', 'module')
			importInvocation = el
		} else if (extension === 'css'){
			let el = document.createElement('link')
			el.href = fullAssetPath
			el.setAttribute('rel', 'stylesheet')
			importInvocation = el
		} else {
			throw Error(`Unknown extension ${extension}`)
		}

		importInvocation.dataset.maneMatchList = patch.matchList.join(',')
		importInvocation.dataset.maneId = patch.id
		document.head.appendChild(importInvocation)
		if (logInjections) console.info(`Mane: injected ${asset.fileUrl}`)
	}
	
}

})()