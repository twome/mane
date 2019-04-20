import { getRandomId, truncateMatchList } from './util.js'
import { getConfig } from './config.js'
let config = getConfig()

export class Asset {
	constructor({
		/*String*/fileUrl,
		/*Enum - config.assetTypes*/assetType,
		/*String*/body
	}={}){
		if (!fileUrl && !body) throw Error('Must have either fileUrl or body')
		this.fileUrl = fileUrl
		this.body = body
		this.assetType = assetType
	}
}

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
					/*Boolean*/matchListInComment,
					options = {}
				} = args[0] 
			} else {
				throw Error('If providing a single argument to new Patch(), it must be a matchList String or options Object.')
			}
		} else {
			throw Error('Patch accepts one argument')
		}

		this.options = Object.assign(options, {
			on: true,
			maxFilenameSize: 60,
			shortIdLength: 6
		})

		this.assets = assets 

		if (!matchList || !Array.isArray(matchList)) throw Error('Must provide an array-of-strings matchList')
 		if (matchList.length < 1){
			throw Error('Patch must specify at least one url-match string')
		} else if (matchList.some(m => m.match(/[:\/]/))){ 
			// TODO: turn colons and slashes into semi-readable replacements
			throw Error(`Matchers can't include colon (:) or slash (/ or \\) characters, as they can't be used in filenames for the saved patches. (We'd like to allow colons in a future feature.)`)
		} else {
			this.matchList = matchList
		}
		
		/*
			Calculate ID, ideally as close to the matchList as possible
		*/
		let concatenatedMatchList = this.matchList.join(',')
		let assetUrls = this.assets.map(asset => asset.fileUrl)
		let alreadyTruncated = assetUrls.some(url => url.match(config.excessLengthIndicator))
		if (id){
			this.id = id
		} else if (alreadyTruncated){
			for (let url of assetUrls){
				url = url.substr(0, url.length - 1)
				if (url !== this.id) throw Error('Assets for the same patch have differing IDs in their filenames')
				this.id = url
			}
		} else if (concatenatedMatchList.length <= this.options.maxFilenameSize){
			this.id = concatenatedMatchList // If short enough, the ID simply becomes the matchList in string form
		} else {
			// Looks like we have to make a new ID

			if (!this.matchListInComment){ // We don't want to add this comment if it already exists!
				for (let asset of this.assets){
					asset.body = `/* patch-urls ${concatenatedMatchList} */\n` + asset.body
				}	
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