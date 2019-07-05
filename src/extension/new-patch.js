import { getActiveTabUrl, htmlToElement } from './util.js'
// TODO // import getShortestSelector from './get-shortest-selector.js'
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
		this.firstRender = true

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

		let onActivePatchesFetched = async (data) => {
			await this.updateVm()
		}
		NewPatch.app.events.subscribe('active-patches-fetched', onActivePatchesFetched)
	}

	async updateVm(renderAfter = true){

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
					}
					if (asset.assetType === appConfig.assetTypes.css){
						this.cssEnabled = false
					}
				}
			}
		}
		this.validInput = this.jsEnabled && this.jsChecked || this.cssEnabled && this.cssChecked

		if (renderAfter) this.render()
	}

	registerMatchListHandlers(){
		let newMatchListEl = this.el.querySelector('.NewPatch_matchList')
		let newMatchListHandler = () => {
			this.matchListStr = newMatchListEl.value
			this.updateVm()
		}
		newMatchListEl.addEventListener('change', newMatchListHandler)
		newMatchListEl.addEventListener('input', newMatchListHandler)
	}

	registerCreateFilesHandlers(){
		let createFilesEl = this.el.querySelector('.NewPatch_createBtn')
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
			if (this.cssChecked && this.cssEnabled) assetsToCreate.push({
				assetType: appConfig.assetTypes.css,
				fileUrl: this.matchListStr + '.css'
			})
			if (this.jsChecked && this.jsEnabled) assetsToCreate.push({
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
		createFilesEl.addEventListener('click', createFilesHandler)
	}

	render(){
		// Update view
		let parts = this.toHTMLParts()

		let headerEl = this.el.querySelector('.NewPatch_header')
		if (!headerEl){
			headerEl = htmlToElement(parts.header)
			this.el.appendChild(headerEl)
		}

		let matchListEl = this.el.querySelector('.NewPatch_matchList')
		if (!matchListEl){
			matchListEl = htmlToElement(parts.matchList)
			this.el.appendChild(matchListEl)
			this.registerMatchListHandlers()
		}
		matchListEl.value = this.matchListStr

		let patchFilesEl = this.el.querySelector('.NewPatch_patchFiles')
		if (patchFilesEl) this.el.removeChild(patchFilesEl)
		patchFilesEl = htmlToElement(parts.patchFiles)
		this.el.appendChild(patchFilesEl) // The only VM-reliant el happens to be last anyway
		this.registerCreateFilesHandlers()

		let cssAssetEl = this.el.querySelector('.NewPatch_patchFileCheckbox#css')
		let jsAssetEl = this.el.querySelector('.NewPatch_patchFileCheckbox#js')
		cssAssetEl.checked = this.cssChecked
		jsAssetEl.checked = this.jsChecked
		cssAssetEl.disabled = !this.cssEnabled
		jsAssetEl.disabled = !this.jsEnabled

		let assetTypesHandler = () => {
			this.cssChecked = cssAssetEl.checked
			this.jsChecked = jsAssetEl.checked
			this.updateVm()
		}
		let assetEls = [...this.el.querySelectorAll('.NewPatch_patchFileCheckbox')]
		for (let el of assetEls){
			el.addEventListener('change', assetTypesHandler)

			if (el.disabled){
				el.closest('.NewPatch_patchFile').classList.add('NewPatch_patchFile-disabled')
				let explanation = 'You can\'t make two assets or patches with the same name – include any extra assets in your main JS / CSS ones for this patch.'
				el.parentElement.title = explanation
			} else {
				el.closest('.NewPatch_patchFile').classList.remove('NewPatch_patchFile-disabled')
			}
		}

		let createFilesEl = this.el.querySelector('.NewPatch_createBtn')
		if (this.validInput){
			createFilesEl.classList.remove('btn-disabled')
		} else {
			createFilesEl.title = 'Must select at least one type of file to create; CSS or JS'
			createFilesEl.classList.add('btn-disabled')
		}

		if (this.firstRender) {
			this.firstRender = false
		}
	}

	toHTMLParts(){
		let newFileToggles = this.newFileToggles.reduce((acc, toggle) => {
			return acc + `
			<label for="${toggle.name}" class="NewPatch_patchFile">
				<input type="checkbox" id="${toggle.name}" class="NewPatch_patchFileCheckbox" data-human-name="${toggle.human}">
				${toggle.human}
			</label>
			`
		}, '')

		let fullTemplate = {
			header: `<header class="NewPatch_header spaceyHeader spaceyHeader-onLight">New patch for URLs:</header>`,
			matchList: `<input type="text" class="NewPatch_matchList"
				title="Comma-separated list of URL matchers (regular expressions) to trigger this patch's insertion into webpages"
				placeholder="*.bandcamp.com,sa.org.au"
			>`,
			patchFiles: `<div class="NewPatch_patchFiles">
				${newFileToggles}
				<button class="NewPatch_createBtn btn">Create files</button>
			</div>`
		}

		return fullTemplate
	}
}
NewPatch.selector = '.NewPatch'

export default NewPatch