/* global browser, chrome */
if (typeof browser === 'undefined'){
	if (typeof chrome !== 'undefined' && chrome.tabs) window.browser = chrome
}

// Options
let patchHost = 'http://localhost:1917'
let routes = {
	createPatchFile: 'create-patch',
	openFileNative: 'open-file',
}

// App-wide 'global' state
let app = {}

let last = arr => arr.reverse()[0]
let fileExtension = path => last(path.split('.'))

const getActiveAssets = () => {
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
	if (typeof browser === 'undefined'){
		// Mock a real URL
		return 'https://mockurl.example.com/a-path?fake-query=sure'
	}

	return new Promise((res, rej) => {
		let onTabsFound = tabs => {
			if (tabs[0]){
				res(tabs[0].url)
			} else {
				rej(Error('No tabs found'))
			}
		}

		if (chrome) {
			browser.tabs.query({
				active: true,
				currentWindow: true
			}, onTabsFound)
		} else {
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
	if (!url){
		url = await getActiveTabUrl()
	}

	// We need to encode to escape all the special URI characters
	let patchRequestPath = `${patchHost}/patches-for/${encodeURIComponent(url)}`

	let response = await fetch(patchRequestPath, {
		mode: 'cors'
	})

	return await response.json()
}

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
		if (!this.cssChecked && !this.jsChecked){
			createFilesEl.classList.add('btn-disabled')
			createFilesEl.title = 'Must select at least one type of file to create; CSS or JS'
		} else {
			createFilesEl.classList.remove('btn-disabled')
		}
	}

	async updateVm(){
		this.matchListStr = new URL(await getActiveTabUrl()).hostname
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

			fetch(`${patchHost}/${routes.createPatchFile}`, {
				method: 'POST',
				mode: 'cors',
				headers: {
					'Content-Type': 'application/json',
		        },
		        body: JSON.stringify(patchCreationObject)
			}).then(res => {
				if (res.ok){
					// TODO - feedback that creation was successful
					this.updateVm().then(this.render)
					console.debug('patch successfully created in server memory and saved to disk')	
				} else {
					// Show user that creation failed
					// TODO
					createFilesEl.classList.add('NewPatch_createBtn-failed')
				}
			}, err => {
				console.error(`Couldn't connect to server`)
			})
		}

		let assetTypesHandler = () => {
			this.cssChecked = cssAssetEl.checked
			this.jsChecked = jsAssetEl.checked

			this.renderCreateButton()
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
		cssAssetEl.checked = this.cssChecked
		jsAssetEl.checked = this.jsChecked
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
		patches = []
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
		let url = await getActiveTabUrl()
		this.patches = await getMatchingPatches(url)
	}

	registerHandlers(){
		let assetEls = this.el.querySelectorAll('.ActivePatches_asset')
		assetEls.forEach(el => {
			el.addEventListener('click', (event) => {
				// TODO: Still allow default open-in-new-tab functionality
				event.preventDefault()

				// Send a message to the native app / server asking to open this file locally using the OS' default application (for quickly opening your code editor)
				fetch(`${patchHost}/${routes.openFileNative}/${encodeURIComponent(el.dataset.openingSrc)}`, {
					method: 'GET',
					mode: 'cors',
					headers: { 
						'Content-Type': 'application.json'
					}
				})
			})
		})
	}

	render(){
		// Update VM
		// this.patches = getActivePatches()

		// Update view
		let html = this.toHTML()
		this.el.innerHTML = html

		this.registerHandlers()
	}

	toHTML(){
		let patches = [...this.patches.values()].reduce((acc, patch) => {
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
					<a href="${patchHost}/${assetPath}" 
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
					<span class="ActivePatches_matchList">
						${matchers}
					</span>
					<span class="ActivePatches_assets">
						${assets}
					</span>
				</li> 
			`
		}, '')

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