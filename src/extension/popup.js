/* global browser, chrome */

import Growl from './growl.js'

let weApiAvailable = typeof browser !== 'undefined' // WebExtensions 'browser'/'chrome' API object present in global object
let chromeWeApiAvailable = typeof chrome !== 'undefined' && chrome.tabs // Account for Chrome's non-spec WE API implementation
if (!weApiAvailable){
	if (chromeWeApiAvailable) window.browser = chrome
}

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

// TEMP DEV
let mockUrlToCheck = 'https://mockurl.example.com/a-path?fake-query=sure'
let mockAssets = [
	{
		fileUrl: 'bingbong.com.js',
		assetType: 'js',
		forPatch: 'bingbong.com',
	},
	{
		fileUrl: 'wimwam.flam,bingbong.com,hiphop.stop,bingobango.bongo,hothere.stranger.css',
		assetType: 'js',
		forPatch: 'wimwam.flam,bingbong.com,hiphop.stop,bingobango.bongo,hothere.stranger',
	},
	{
		fileUrl: 'wimwam.flam,bingbong.com,hiphop.stop,bingobango.bongo,hothere.stranger.js',
		assetType: 'js',
		forPatch: 'wimwam.flam,bingbong.com,hiphop.stop,bingobango.bongo,hothere.stranger',
	}
]
let mockPatches = [
	{
		id: mockAssets[1].forPatch,
		matchList: mockAssets[1].forPatch.split(','),
		assets: [mockAssets[1], mockAssets[2]],
		options: {
			on: true
		}
	},
	{
		id: mockAssets[0].forPatch,
		matchList: mockAssets[0].forPatch.split(','),
		assets: [mockAssets[0]],
		options: {
			on: false
		}
	}
]

// App-wide 'global' state
let app = {
	el: document.querySelector('[data-app="mane"]')
}

let last = arr => arr.reverse()[0]
let fileExtension = path => last(path.split('.'))

const getActiveAssets = () => {
	// TODO - DEV ONLY
	if (!weApiAvailable && !chromeWeApiAvailable){
		// Mock real asset dep-invocations
		return mockAssets
	}

	let els = [...document.querySelectorAll('head [data-mane-match-list]')]
	let assets = els.map(el => {
		let src = el.href || el.src
		return {
			fileUrl: src,
			assetType: fileExtension(src),
			forPatch: el.dataset.maneId
		}
	})
	return assets
}

const assetsToPatchMap = assets => {
	let patches = new Map()
	assets.forEach(asset => {
		let id = asset.forPatch
		delete asset.forPatch
		let extant = patches.get(id)
		if (extant){
			extant.assets.push(asset)
			patches.set(id, extant)
		} else {
			extant = {
				id,
				matchList: id.split(','),
				assets: [asset]
			}
		}
		patches.set(id, extant)
	})
	return patches
}

const getActivePatches = () => assetsToPatchMap(getActiveAssets())

const getActiveTabUrl = async () => {
	// TODO - DEV ONLY
	if (!weApiAvailable && !chromeWeApiAvailable){
		// Mock a real URL
		return mockUrlToCheck
	}

	return new Promise((res, rej) => {
		let onTabsFound = tabs => {
			if (tabs[0]){
				res(tabs[0].url)
			} else {
				rej(Error('No tabs found'))
			}
		}

		if (chromeWeApiAvailable) {
			browser.tabs.query({
				active: true,
				currentWindow: true
			}, onTabsFound)
		} else if (weApiAvailable){
			return browser.tabs.query({
				active: true,
				currentWindow: true
			}).then(onTabsFound, err => {
				console.error({err})
			})
		}
	})
}

// TODO: Why is our CORS not working here?
const getMatchingPatches = async (url) => {
	if (!weApiAvailable && !chromeWeApiAvailable){
		return mockPatches
	}

	if (!url){
		url = await getActiveTabUrl()
	}

	// We need to encode to escape all the special URI characters
	let patchRequestPath = `${config.patchHost}/patches-for/${encodeURIComponent(url)}`


	let response = await fetch(patchRequestPath, {
		mode: 'cors'
	})
	if (response.ok) return await response.json()
	throw response
}

// TODO: Useless, remove?
class Component {
	constructor(el, selector){
		this.el = el
		this.constructor.selector = selector
	}

	render(){
		this.el.innerHTML = this.toHTML()
	}
}



class NewPatch extends Component {
	constructor(el, { 
		newFileToggles = [
			{
				name: 'css',
				human: 'CSS'
			},{
				name: 'js',
				human: 'JavaScript'
			}
		],
		cssChecked = true, // It's probably overall more likely that users want to simply hide an element
		jsChecked = false,
		matchListStr = '',
		newPatchOptions = {}
	}={}){
		super(el, '.NewPatch')
		Object.assign(this, {newFileToggles, cssChecked, jsChecked, matchListStr, newPatchOptions})

		// Options
		this.createBtnFlashFailMs = 2000

		// State
		this.createBtnTimer = null

		this.updateVm().then(() => {
			this.render()	
		})
	}

	/* 
		HACK: outside of main render fn so assetTypesHandler can call it without a full render
		SOLVE: full render shouldn't bother assetTypesHandler
	*/
	renderCreateButton(){
		let createFilesEl = this.el.querySelector('.NewPatch_createBtn')
		if (!this.validInput){
			createFilesEl.classList.add('btn-disabled')
			createFilesEl.title = 'Must select at least one type of file to create; CSS or JS'
		} else {
			createFilesEl.classList.remove('btn-disabled')
		}
	}

	async updateVm(){
		this.matchListStr = new URL(await getActiveTabUrl()).hostname
		
		this.validInput = this.cssChecked || this.jsChecked
	}

	registerHandlers(){
		let newMatchListEl = this.el.querySelector('.NewPatch_matchList')
		let createFilesEl = this.el.querySelector('.NewPatch_createBtn')
		let cssAssetEl = this.el.querySelector('.NewPatch_patchFile #css')
		let jsAssetEl = this.el.querySelector('.NewPatch_patchFile #js')

		let newMatchListHandler = () => {
			this.matchListStr = newMatchListEl.value
		}

		let createFilesHandler = () => {
			const flashFail = () => {
				createFilesEl.classList.add('btn-isFailed')
				this.createBtnTimer = setTimeout(()=>{
					createFilesEl.classList.remove('btn-isFailed')
				}, this.createBtnFlashFailMs)	
			}
			const resetFlashFail = () => {
				createFilesEl.classList.remove('btn-isFailed') // Reset for this new attempt
				clearTimeout(this.createBtnTimer)
			}
			resetFlashFail()

			if (!this.validInput) return false

			let assetsToCreate = []
			if (this.cssChecked) assetsToCreate.push({ 
				assetType: 'css', 
				fileUrl: this.matchListStr + '.css'
			})
			if (this.jsChecked) assetsToCreate.push({ 
				assetType: 'js', 
				fileUrl: this.matchListStr + '.js'
			})

			let patchCreationObject = {
				assets: assetsToCreate,
				matchList: this.matchListStr.split(','),
				options: this.newPatchOptions
			}

			createFilesEl.classList.add('btn-disabled')
			fetch(`${config.patchHost}/${config.routes.createPatchFile}`, {
				method: 'POST',
				mode: 'cors',
				headers: {
					'Content-Type': 'application/json',
		        },
		        body: JSON.stringify(patchCreationObject)
			}).then(res => {
				this.updateVm().then(() => {
					this.render()	
				})
				if (this.validInput) createFilesEl.classList.remove('btn-disabled')
				if (res.ok){
					new Growl({
						type: Growl.types.Success,
						message: 'Patch successfully created in server memory and saved to disk.',
						attachPoint: app.el
					})
				} else {
					flashFail()
					new Growl({
						type: Growl.types.Error,
						message: 'Failed to create patch files. The match list could be invalid, or the files could already exist.',
						attachPoint: app.el
					})
				}
			}, err => {
				console.error(`Couldn't connect to server`)
				flashFail()
				new Growl({
					type: Growl.types.Error,
					message: `Couldn't connect to the Mane server/app.`,
					attachPoint: app.el
				})
			})
		}

		let assetTypesHandler = () => {
			this.cssChecked = this.el.querySelector('.NewPatch_patchFile #css').checked
			this.jsChecked = this.el.querySelector('.NewPatch_patchFile #js').checked
			
			this.updateVm().then(() => {
				this.renderCreateButton()	
			})
		}
		
		createFilesEl.addEventListener('click', createFilesHandler)
		newMatchListEl.addEventListener('change', newMatchListHandler)
		let assetTypes = [cssAssetEl, jsAssetEl]
		assetTypes.forEach(el => el.addEventListener('change', assetTypesHandler))
	}

	render(){
		// Update view
		let html = this.toHTML()
		this.el.innerHTML = html

		let newMatchListEl = this.el.querySelector('.NewPatch_matchList')
		newMatchListEl.value = this.matchListStr
		
		let cssAssetEl = this.el.querySelector('.NewPatch_patchFiles #css')
		let jsAssetEl = this.el.querySelector('.NewPatch_patchFiles #js')
		let createFilesEl = this.el.querySelector('.NewPatch_createBtn')
		cssAssetEl.checked = this.cssChecked
		jsAssetEl.checked = this.jsChecked
		if (this.validInput){
			createFilesEl.classList.remove('btn-disabled')
		} else {
			createFilesEl.classList.add('btn-disabled')
		}
		this.renderCreateButton()

		this.registerHandlers()
	}

	toHTML(){
		let newFileToggles = this.newFileToggles.reduce((acc, toggle) => {
			return acc + `
			<label for="${toggle.name}" class="NewPatch_patchFile">
				<input type="checkbox" id="${toggle.name}" data-human-name="${toggle.human}">
				${toggle.human}
			</label>
			`
		}, '')

		let fullTemplate = `
			<header class="NewPatch_header spaceyHeader spaceyHeader-onLight">New patch for URLs:</header>
			<input type="text" class="NewPatch_matchList" 
				title="Comma-separated list of URL matchers (regular expressions) to trigger this patch's insertion into webpages"
				placeholder="*.bandcamp.com,sa.org.au"
			>
			<div class="NewPatch_patchFiles">
				${newFileToggles}
				<button class="NewPatch_createBtn btn">Create files</button>
			</div>
		`

		return fullTemplate
	}
}
NewPatch.selector = '.NewPatch'

class ActivePatches extends Component {
	constructor(el, {
		patches = new Map()
	}={}){
		super(el, '.ActivePatches')
		Object.assign(this, {patches})

		// TODO: Highlight the active matcher within each matchList (send from server?)
		this.activeMatcher = 'www.google.com' // TEMP TEST
		
		this.updateVm().then(() => {
			this.render()	
		})
	}

	async updateVm(){
		try {
			let url = await getActiveTabUrl()
				.catch(err => { throw Error('Failed getting active tab URL') })
			this.patches = (await getMatchingPatches(url)).reduce((map, patch) => { 
				map.set(patch.id, patch)
				return map 
			}, new Map())
		} catch (err) {
			console.error(`Failed getting matching patches`, err)
			// this.patches = new Map()
		}
	}

	registerHandlers(){
		let assetEls = this.el.querySelectorAll('.ActivePatches_asset')
		assetEls.forEach(el => {
			el.addEventListener('click', (event) => {
				// TODO: Still allow default open-in-new-tab functionality
				event.preventDefault()

				// Send a message to the native app / server asking to open this file locally using the OS' default application (for quickly opening your code editor)
				fetch(`${config.patchHost}/${config.routes.openFileNative}/${encodeURIComponent(el.dataset.openingSrc)}`, {
					method: 'GET',
					mode: 'cors',
					headers: { 
						'Content-Type': 'application.json'
					}
				})
			})
		})

		let patchEls = this.el.querySelectorAll('.ActivePatches_patch')
		patchEls.forEach(el => {
			let id = el.dataset.patchId
			let patch = this.patches.get(id)
			let toggleEl = el.querySelector('.ActivePatches_toggleEnabled')
			
			toggleEl.addEventListener('click', (event) => {
				patch.options.on = !patch.options.on
				this.patches.set(id, patch)
				this.render()
								
				// Update this patch on the server
				fetch(`${config.patchHost}/${config.routes.setOptions}/${encodeURIComponent(id)}`, {
					method: 'PUT',
					mode: 'cors',
					headers: { 
						'Content-Type': 'application.json'
					},
					// TEMP
					// body: JSON.stringify(patch.options)
					body: JSON.stringify({
						on: true,
						totallyBogus: 'excellent'
					})
				}).then(res => {
					if (res.ok){
						new Growl({
							type: Growl.types.Success,
							message: 'Changed patch options and saved to disk.',
							attachPoint: app.el
						})	
					} else {
						new Growl({
							message: 'Server failed to save options.',
							attachPoint: app.el
						})
					}
				}, err => {
					new Growl({
						message: `Couldn't connect to server.`,
						attachPoint: app.el
					})
				})
			})
		})
	}

	render(){
		// Update view
		let html = this.toHTML()
		this.el.innerHTML = html

		this.registerHandlers()
	}

	toHTML(){
		let patches = [...this.patches.values()].reduce((acc, patch) => {
			let toggle = `
				<button class="ActivePatches_toggleEnabled neonSign ${patch.options.on ? '' : 'neonSign-off'}">
					${patch.options.on ? 'ON' : 'OFF'}
				</button>
			`

			let matchers = patch.matchList.reduce((acc, matcher)=>{
				return acc + `
					<span class="ActivePatches_matcher ${matcher === this.activeMatcher ? 'ActivePatches_matcher-active' : ''}"
						${matcher === this.activeMatcher ? 'title="The matcher which activated this patch for this current page\'s URL"' : ''}
					>
						${matcher} 
					</span> 
				`
			}, '')

			let assets = patch.assets.reduce((acc, asset) => {
				let assetPath = `${asset.fileUrl}`
				return acc + `
					<a href="${config.patchHost}/${assetPath}" 
						data-opening-src="${assetPath}"
						class="ActivePatches_asset boxLink"
						title="Open file in your default native application"
					>
						${fileExtension(asset.fileUrl).toUpperCase()}
					</a>
				`
			}, '')

			return acc + `
				<li class="ActivePatches_patch" data-patch-id="${patch.id}" title="${patch.matchList.join(',')}">
					${toggle}
					<span class="ActivePatches_matchList">
						${matchers}
					</span>
					<span class="ActivePatches_assets">
						${assets}
					</span>
				</li> 
			`
		}, '')

		if ([...this.patches.values()].length === 0) patches = `
			<span class="ActivePatches_empty">No matching patches</span>
		`

		let fullTemplate = `
			<header class="ActivePatches_header spaceyHeader">
				Active patches
			</header>
			<ul class="ActivePatches_list">
				${patches}
			</ul>
		`
		return fullTemplate
	}
}
ActivePatches.selector = '.ActivePatches'

// State
let instances = new Set()
let componentTypes = [NewPatch, ActivePatches]

for (let type of componentTypes){
	for (let el of [...document.querySelectorAll(type.selector)]){
		instances.add(new type(el))
	}
}