// Options
let patchHost = 'http://localhost:1917'

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

// TODO: Why is our CORS not working here?
/*const getMatchingPatches = async (url = location.href) => {
	// We need to encode to escape all the special URI characters
	let patchRequestPath = `${patchHost}/patches-for/${encodeURIComponent(url)}`

	return (await (await fetch(patchRequestPath)).json())
}*/

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
		newPatchMatchList = location.host
	}={}){
		super(el, '.NewPatch')
		Object.assign(this, {newFileToggles, cssChecked, jsChecked, newPatchMatchList})

		this.render()
	}

	/* HACK */
	renderCreateButton(){
		let createFilesEl = this.el.querySelector('.js-createFiles')
		if (!this.cssChecked && !this.jsChecked){
			createFilesEl.classList.add('btn-disabled')
			createFilesEl.title = 'Must select at least one type of file to create; CSS or JS'
		} else {
			createFilesEl.classList.remove('btn-disabled')
		}
	}

	registerHandlers(){
		let newMatchListEl = this.el.querySelector('.NewPatch_matchList')
		let createFilesEl = this.el.querySelector('.js-createFiles')
		let cssAssetEl = this.el.querySelector('.NewPatch_patchFile #css')
		let jsAssetEl = this.el.querySelector('.NewPatch_patchFile #js')

		let newMatchListHandler = () => {
			this.newPatchMatchList = newMatchListEl.value
		}

		let createFilesHandler = () => {
			let assetsToCreate = []
			if (this.cssChecked) assetsToCreate.push({ 
				assetType: 'css', 
				fileUrl: this.newPatchMatchList + '.css'
			})
			if (this.jsChecked) assetsToCreate.push({ 
				assetType: 'js', 
				fileUrl: this.newPatchMatchList + '.js'
			})

			fetch(`${patchHost}/create-patch-file`, {
				method: 'POST',
				mode: 'cors',
				headers: {
					'Content-Type': 'application/json',
		        },
		        body: JSON.stringify(assetsToCreate)
			}).then(res => {
				// TODO
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
		newMatchListEl.value = this.newPatchMatchList
		
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
			<header class="NewPatch_header spaceyHeader spaceyHeader-onLight">New patch for:</header>
			<input type="text" class="NewPatch_matchList" 
				title="Comma-separated list of URL matchers (regular expressions) to trigger this patch's insertion into webpages"
				placeholder="*.bandcamp.com,sa.org.au"
			>
			<div class="NewPatch_patchFiles">
				${newFileToggles}
				<button class="js-createFiles btn">Create files</button>
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
		this.render()
	}

	registerHandlers(){
		let assetEls = this.el.querySelectorAll('.ActivePatches_asset')
		assetEls.forEach(el => {
			el.addEventListener('click', (event) => {
				console.debug('active patch open event', this)

				// TODO: Still allow default open-in-new-tab functionality
				event.preventDefault()

				// Send a message to the native app / server asking to open this file locally using the OS' default application (for quickly opening your code editor)
				fetch(`${patchHost}/open-file/${encodeURIComponent(el.href)}`, {
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
		this.patches = getActivePatches()

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
				let fullAssetPath = `${asset.fileUrl}`
				return acc + `
					<a href="${fullAssetPath}" class="ActivePatches_asset boxLink"
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
				Active patches:
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