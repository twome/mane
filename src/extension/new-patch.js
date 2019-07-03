import { getActiveTabUrl } from './util.js'
import Growl from './growl.js'

let appConfig
// NewPatch.app should be bound to the whole app's state
class NewPatch {
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
		cssEnabled = true,
		jsChecked = false,
		jsEnabled = true,
		createBtnEnabled = true,
		matchListStr = '',
		newPatchOptions = {}
	}={}){
		if (!el){
			el = document.createElement('section')
			NewPatch.app.el.appendChild(el)
		}
		appConfig = NewPatch.app.cfg
		Object.assign(this, {el, newFileToggles, cssChecked, cssEnabled, jsChecked, jsEnabled, createBtnEnabled, matchListStr, newPatchOptions})

		// Options
		this.createBtnFlashFailMs = 2000

		// State
		this.createBtnTimer = null

		let createDefaultMatchList = async () => {
			let currentPage = await getActiveTabUrl(NewPatch.app).catch(() => 'example.com')

			// Here we make a very broad assumption that users are probably most interested in matching any page on this hostname (which includes & limits to the current subdomain, if there is one!)
			let defaultMatchList = new URL(currentPage).hostname
			this.matchListStr = defaultMatchList
			await this.updateVm()
			this.render()
		}
		createDefaultMatchList()

		this.updateVm()

		// TEMP DEV HACK - we need an event to watch for when we've fetched the list of active patches
		let onActivePatchesFetched = async (msg, data) => {
			await this.updateVm()
		}
		setTimeout(onActivePatchesFetched, 1000)
	}

	async updateVm(dontRender){

		// HACK - fix: communicate/share state between components
		let matchingPatches = new Map()
		if (this.fetchMatchingPatches) matchingPatches = this.fetchMatchingPatches() // Parent app may not have injected this fn yet
		this.jsEnabled = true
		this.cssEnabled = true
		for (let patch of matchingPatches.values()){
			if (this.matchListStr.trim() === patch.id){
				for (let asset of patch.assets){
					// We shouldn't make another asset of the same filetype if one already exists for this exact patch ID
					if (asset.assetType === appConfig.assetTypes.js){
						this.jsEnabled = false
						this.jsChecked = false
					}
					if (asset.assetType === appConfig.assetTypes.css){
						this.cssEnabled = false
						this.cssChecked = false
					}
				}
			}
		}
		this.validInput = this.jsEnabled && this.jsChecked || this.cssEnabled && this.cssChecked

		if (dontRender) return
		this.render()
	}

	registerHandlers(){
		let newMatchListEl = this.el.querySelector('.NewPatch_matchList')
		let createFilesEl = this.el.querySelector('.NewPatch_createBtn')
		let cssAssetEl = this.el.querySelector('.NewPatch_patchFile #css')
		let jsAssetEl = this.el.querySelector('.NewPatch_patchFile #js')

		let newMatchListHandler = () => {
			this.matchListStr = newMatchListEl.value
			this.updateVm()
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
				assetType: appConfig.assetTypes.css,
				fileUrl: this.matchListStr + '.css'
			})
			if (this.jsChecked) assetsToCreate.push({
				assetType: appConfig.assetTypes.js,
				fileUrl: this.matchListStr + '.js'
			})

			let patchCreationObject = {
				assets: assetsToCreate,
				matchList: this.matchListStr.split(','),
				options: this.newPatchOptions
			}

			createFilesEl.classList.add('btn-disabled')

			fetch(`${appConfig.maneServerHostname}:${appConfig.maneServerPort}/${appConfig.routes.createPatchFile}`, {
				method: 'POST',
				mode: 'cors',
				headers: {
					'Content-Type': 'application/json',
		        },
		        body: JSON.stringify(patchCreationObject)
			}).then(res => {
				this.updateVm()
				if (this.validInput) createFilesEl.classList.remove('btn-disabled')
				if (res.ok){
					new Growl({
						type: Growl.types.Success,
						message: 'Patch successfully created in server memory and saved to disk.',
						attachPoint: NewPatch.app.el
					})
				} else {
					flashFail()
					new Growl({
						type: Growl.types.Error,
						message: 'Failed to create patch files. The match list could be invalid, or the files could already exist.',
						attachPoint: NewPatch.app.el
					})
				}
			}, err => {
				console.error(`Couldn't connect to server`)
				flashFail()
				new Growl({
					type: Growl.types.Error,
					message: `Couldn't connect to the Mane server/app.`,
					attachPoint: NewPatch.app.el
				})
			})
		}

		let assetTypesHandler = () => {
			this.cssChecked = this.el.querySelector('.NewPatch_patchFile #css').checked
			this.jsChecked = this.el.querySelector('.NewPatch_patchFile #js').checked

			this.updateVm()
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

		let cssAssetEl = this.el.querySelector('.NewPatch_patchFileCheckbox#css')
		let jsAssetEl = this.el.querySelector('.NewPatch_patchFileCheckbox#js')
		let createFilesEl = this.el.querySelector('.NewPatch_createBtn')
		cssAssetEl.checked = this.cssChecked
		jsAssetEl.checked = this.jsChecked

		cssAssetEl.disabled = !this.cssEnabled
		jsAssetEl.disabled = !this.jsEnabled
		if (!this.cssEnabled || !this.jsEnabled){
			let explanation = 'You can\'t make two assets or patches with the same name – include any extra assets in your main JS / CSS ones for this patch.'
			cssAssetEl.parentElement.title = explanation
			jsAssetEl.parentElement.title = explanation
		}

		let assetEls = [...this.el.querySelectorAll('.NewPatch_patchFileCheckbox')]
		for (let el of assetEls){
			if (el.disabled){
				el.closest('.NewPatch_patchFile').classList.add('NewPatch_patchFile-disabled')
			} else {
				el.closest('.NewPatch_patchFile').classList.remove('NewPatch_patchFile-disabled')
			}
		}

		if (this.validInput){
			createFilesEl.classList.remove('btn-disabled')
		} else {
			createFilesEl.title = 'Must select at least one type of file to create; CSS or JS'
			createFilesEl.classList.add('btn-disabled')
		}

		this.registerHandlers()
	}

	toHTML(){
		let newFileToggles = this.newFileToggles.reduce((acc, toggle) => {
			return acc + `
			<label for="${toggle.name}" class="NewPatch_patchFile">
				<input type="checkbox" id="${toggle.name}" class="NewPatch_patchFileCheckbox" data-human-name="${toggle.human}">
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

export default NewPatch