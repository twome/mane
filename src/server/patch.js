import { getRandomId, truncateMatchList } from './util.js'
import { getConfig } from './config.js'
let config = getConfig()

export class Patch {
	constructor(...args){
		if (args.length === 1){
			if (typeof args[0] === 'string'){
				return new Patch({
					matchList: [args[0]]
				})
			} else if (typeof args[0] === 'object'){
				var {
					/*Asset[]*/assets = [],
					/*String[]*/matchList, // Mandatory
					/*String*/id,
					options = {}
				} = args[0] 
			} else {
				throw Error('If providing a single argument to new Patch(), it must be an options Object.')
			}
		} else {
			throw Error('Patch accepts one argument')
		}

		if (!matchList || !Array.isArray(matchList)) throw Error('Must provide an array-of-strings matchList')

		this.options = Object.assign(options, {
			on: true,
			maxFilenameSize: 60,
			shortIdLength: 6
		})

		if (assets) this.assets = assets 
 		if (matchList.length < 1){
			throw Error('Patch must specify at least one url-match string')
		} else if (matchList.some(m => m.match(/:/))){ 
			console.debug({matchList})
			throw Error(`Matchers can't include a colon (:) character, as they can't be used in filenames for the saved patches. (We'd like to allow colons in a future feature.)`)
		} else {
			this.matchList = matchList
		}
		
		let concatenatedMatchList = this.matchList.join(',')
		this.id = id || concatenatedMatchList // If short enough, the ID simply becomes the matchList in string form
		
		if (concatenatedMatchList.length >= this.options.maxFilenameSize || this.matchListInComment){ 
			if (!this.matchListInComment){ // We don't want to add this comment if it already exists!
				if (this.js) this.js = `/* patch-urls ${concatenatedMatchList} */\n` + this.js
				if (this.css) this.css = `/* patch-urls ${concatenatedMatchList} */\n` + this.css	
			}

			this.matchListInComment = true

			// Generate a human-readable preview of some of the matches, plus a randomised ID string
			let previewLength = this.options.maxFilenameSize - config.excessLengthIndicator.length - this.options.shortIdLength
			let truncated = truncateMatchList(this.matchList, previewLength)

			let idShort = getRandomId(this.options.shortIdLength)

			// Then we use this as the ID, which will in turn become the filename
			this.id = idShort + config.excessLengthIndicator + truncated
		}

	}

	addAsset(assetType, fileUrl){
		this.assets.push({ assetType, fileUrl })
	}
}