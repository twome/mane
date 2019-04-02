/*
	Mane

	A Node + WebExtension app that automatically inserts your custom JavaScript and CSS files, stored on your hard drive or a remote Git repository, into web pages to customise them - fix bugs, improve the visual design, remove ads - whatever you want! 

	It also allows you to easily share and use public community "patches", so everyone can easily benefit from one person's customisations. 

	This is similar in approach to GreaseMonkey on Firefox, and User Javascript & CSS on Chrome, but with an emphasis on editing and storing the patches in whatever way suits you, instead of in a custom editor and locked into a single browser extension's database.
*/

const fs = require('fs')
const path = require('path')
const util = require('util')
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const mkdir = util.promisify(fs.mkdir)

const { DateTime } = require('luxon')
const Koa = require('koa')

import Enum from './node_modules/@twome/panrepo/enum.js'

let patchJsonSchema = new Enum(['UserJavascriptAndCSS', 'Mane'])

let patches = []

let getRandomId = (idLength) => {
	let palette = 'abcdefghijklmnopqrstuvwyxz0123456789'.split('')
	for (
		var i = 0, id = ''; 
		i < idLength; 
		i = i + 1
	){
		id = id + palette[Math.floor( Math.random() * palette.length )]
	}
	return id
}

class Patch {
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
		this.id = getRandomId(20)
		this.options = Object.assign(options, {
			on: true
		})
	}
}



/*
	Server
*/
const findPatchesForUrl = async (url) => {
	// ~ check in-mem cache for this specific url
	// ~ check in-mem cache of all matchers
	// ~ check FS cache of all matchers
	// ~ check FS filenames + oversize files' 1st comment line (how to quickly read only a single line?)

	// ~ get all assets for each matching patch, assign them to eg patch.storage.jsUrl (or add a single storage.dirUrl, eg a folder or remote repo, and look for main.js / main.css)
	// ~ return Patch
}

const getPatchAssetBodies = async (patches) => {
	// ~ check in-mem cache of patch's asset contents; patch.js / patch.css
	// ~ for any missing asset bodies, check for bodies at patch.storage.jsUrl etc and add them to memory Patch
}

/*
	# Interaction with the filesystem

	Normally, a filename for a patch will simply be the matchList concatenated into a comma-separated string. For very large matchlists, this could easily become very unwieldy
	
	It's a bit risky to create gigantic path names; lots of programs don't deal well with excessive sizes. Instead, we'll: 
		- give this patch a random ID, 
		- name the assets (JS & CSS) with that ID, 
		- put them in a folder that has an ID prefix plus a few of the matches for human readability
		- create a .txt file within this folder containing the full matchList in .gitconfig style	

	When applying patches, we'll resolve each domain by:
		- looking for a match in root asset (JS/CSS) filenames, then
		- looking for a match in folder names (apply all files in folder), then
		- looking for a match in folderName/matches.txt and applying all files in folder
		- (optional & slow) looking for a custom comment in the first two lines of every asset: // patch-urls <matches string here>

	The app should cache an index file of the locations of assets for all matchers from every patch's matchList, as looking through so many FS files will be very slow. It should also cache the contents of the assets in memory for repeated visits to pages with the same matchers.
*/

let importPatchJson = async (url, scheme)=>{
	if (scheme === patchJsonSchema.UserJavascriptAndCSS){
		/*
			sites: [
				{
					js: String,
					css: String,
					id: String (comma-separated list of URL matches (can have * wildcards))
					libs: Array of Strings (URLs of side-effect dependencies)
					options: {
						altCSS: Boolean,
				        altJS: Boolean,
				        autoImportant: Boolean,
				        on: Boolean
					}
				}
			]
		*/	

		let jsonString = await readFile(url, 'utf-8')
		let originalFormat = JSON.parse(jsonString)

		let jsonPatches = []
		for (let site of originalFormat.sites){
			let matchList = site.id.split(',').map(matcher => matcher.trim())
			let { css, js } = site
			let { on } = site.options
			
			jsonPatches.push(new Patch({
				matchList, css, js,
				options: {
					on
				}
			}))
		}

		return jsonPatches
	} else if (scheme === patchJsonSchema.Mane){
		throw Error('TODO')
		/*
			{
				js: String,
				css: String,
				matchList: Array of Strings (URL matches (can have * wildcards)),
				options: {
					on: Boolean
				}
			}
		*/
	} else {
		throw Error('Unknown scheme')
	}
}

let getMatchListPreview = (matchList, charLimit) => {
	matchList = [...matchList] // Clone to prevent mutation
	let preview = ''
	while (preview.length <= charLimit){
		let first = matchList.shift()
		if (first.length + 1 <= charLimit){
			preview = preview + first + ','
		}
	}
	return preview.substr(0, preview.length - 1) // Cut trailing comma
}

let storageDir = DateTime.local().toISO()
let savePatchToFS = async (patch, storageDir, maxFilenameSize = 60) => {
	
	let patchName = patch.matchList[0]

	if (patch.matchList.length >= 2){
		let concatenated = patch.matchList.join(',')
		
		if (concatenated.length >= maxFilenameSize){
			let excessLengthIndicator = '-truncated---' 
			if (!patch.id) patch.id = getRandomId(20)
			let idShort = patch.id.substr(0, 6)
			let previewLength = maxFilenameSize - excessLengthIndicator.length - idShort.length
			let preview = getMatchListPreview(patch.matchList, previewLength)
			patchName = idShort + excessLengthIndicator + preview 

			if (patch.js) patch.js = `/* patch-urls ${concatenated} */\n` + patch.js
			if (patch.css) patch.css = `/* patch-urls ${concatenated} */\n` + patch.css
		}
	}
	
	let jsName = patchName + '.js'
	let cssName = patchName + '.css'

	await mkdir(storageDir, { recursive: true })
	let jsWrite = patch.js ? writeFile(path.join(storageDir, jsName), patch.js) : false
	let cssWrite = patch.css ? writeFile(path.join(storageDir, cssName), patch.css) : false
	
	return await Promise.all([jsWrite, cssWrite])
}

let saveEverythingTarball = () => {
	// ~ save everything we can touch into a local FS tar.lz2 with a single JSON and optional non-text assets (images etc) for better compression
}

/*
	Testing
*/

importPatchJson(path.join(__dirname, 'storage', 'user-js-css-v8-190402.json'), patchJsonSchema.UserJavascriptAndCSS)
	.then(patchArr => {
		patches = [...patchArr]
		for (let patch of patchArr){
			console.info(`Importing and saving ${patch.matchList}`)
			savePatchToFS(patch, storageDir)
		}
	})
	.catch(err => {
		console.debug('WHOOPSIES')
		console.error(err)
	})