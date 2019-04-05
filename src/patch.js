import { getRandomId } from './util.js'

export class Patch {
	constructor({
		/*String*/js,
		/*String*/css,
		/*Array*/matchList,
		/*Object*/options = {}
	}={}){
		if (js) this.js = js
		if (css) this.css = css
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
}