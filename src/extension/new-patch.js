import { getActiveTabUrl } from './util.js'
import Growl from './growl.js'

let appConfig
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
			let defaultMatchList = new URL(currentPage).hostname
			this.matchListStr = defaultMatchList
			await this.updateVm()
			this.render()
		}
		createDefaultMatchList()

		this.updateVm().then(() => {
			this.render()
		})

		// HACK - we need an event to watch for when we've fetched the list of active patches
		setTimeout(async () => {
			await this.updateVm()
			this.render()
		}, 1000)
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
		console.debug('updateVm')

		// HACK - fix: communicate/share state between components
		let matchingPatches = new Map()
		if (this.fetchMatchingPatches) matchingPatches = this.fetchMatchingPatches() // Parent app may not have injected this fn yet
		console.debug({matchingPatches})
		for (let patch of matchingPatches.values()){
			console.debug(patch)
			console.debug(this.matchListStr, patch.id)
			if (this.matchListStr.trim() === patch.id){
				this.jsEnabled = true
				this.cssEnabled = true
				for (let asset of patch.assets){
					console.debug(asset)
					// We shouldn't make another asset of the same filetype if one already exists for this exact patch ID
					if (asset.assetType === appConfig.assetTypes.js){
						this.jsEnabled = false
					}
					if (asset.assetType === appConfig.assetTypes.css){
						this.cssEnabled = false
					}
				}
				if (this.jsEnabled && this.jsChecked || this.cssEnabled && this.cssChecked) this.validInput = true
			} else {
				this.validInput = true
			}
		}
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

			fetch(`${appConfig.patchHost}/${appConfig.routes.createPatchFile}`, {
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

			this.updateVm().then(() => {
				this.render()
				this.renderCreateButton()
			})
		}

		createFilesEl.addEventListener('click', createFilesHandler)
		newMatchListEl.addEventListener('change', newMatchListHandler)

		let assetTypes = [cssAssetEl, jsAssetEl]
		assetTypes.forEach(el => el.addEventListener('change', assetTypesHandler))
	}

	render(){
		console.debug('renderr')
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

		let assetEls = [...this.el.querySelectorAll('.NewPatch_patchFileCheckbox')]
		console.debug(assetEls, cssAssetEl, jsAssetEl)
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
			createFilesEl.classList.add('btn-disabled')
		}
		this.renderCreateButton()

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