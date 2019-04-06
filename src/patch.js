import { getRandomId } from './util.js'
import { getConfig } from './config.js'
let config = getConfig()

// class Asset {
	// constructor(opts){
		// let opts = {}
		// Object.assign(this, {})
	// }
// }

export class Patch {
	constructor({
		/*String*/js,
		/*String*/css,
		/*Array of Assets*/assets = [],
		/*Array*/matchList,
		/*Object*/options = {}
	}={}){
		if (js){
			this.js = js
		}
		if (css){
			this.css = css
		}
		if (assets) this.assets = assets 
 		if (!matchList.hasOwnProperty('length') || matchList.length < 1){
			throw Error('Patch must specify at least one url-match string')
		} else {
			this.matchList = matchList
		}
		// TODO do ID creation for overly-long filenames here
		this.id = getRandomId(20)
		this.options = Object.assign(options, {
			on: true
		})
	}

	addAsset(assetType, fileUrl){
		this.assets.push({ assetType, fileUrl })
	}
}