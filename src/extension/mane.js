// Options
let patchHost = 'http://localhost:1917'
let logInjections = true

let last = arr => arr.reverse()[0]
let fileExtension = path => last(path.split('.'))

;(async ()=>{

// We need to encode to escape all the special URI characters
let patchRequestPath = `${patchHost}/patches-for/${encodeURIComponent(location.href)}`

let patches = await (await fetch(patchRequestPath)).json()

for (let patch of patches){
	for (let asset of patch.assets){
		
		/*
			If we wanted to insert the script as a `type="module"` inline script (and wrap the body with, eg, a DOMContentLoaded listener), we could get the body text directly here.

			// let body = await (await fetch(`${patchHost}/${asset.fileUrl}`)).text()
		*/
			
		let extension = fileExtension(asset.fileUrl)
		let fullAssetPath = `${patchHost}/${asset.fileUrl}`

		let assetReference
		if (extension === 'js'){
			let el = document.createElement('script')
			el.src = fullAssetPath
			el.setAttribute('type', 'module')
			assetReference = el
		} else if (extension === 'css'){
			let el = document.createElement('link')
			el.href = fullAssetPath
			el.setAttribute('rel', 'stylesheet')
			assetReference = el
		} else {
			throw Error(`Unknown extension ${extension}`)
		}

		document.head.appendChild(assetReference)
		if (logInjections) console.info(`Mane: injected ${asset.fileUrl}`)
	}
	
}

})()