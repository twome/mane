// Options
let patchHost = 'http://localhost:1917'

// State
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
				human: 'Style'
			},{
				name: 'js',
				human: 'JavaScript'
			}
		],
		cssChecked = false,
		jsChecked = false,
		newPatchMatchList = location.host
	}={}){
		super(el, '.NewPatch')
		Object.assign(this, {newFileToggles, cssChecked, jsChecked, newPatchMatchList})

		this.render()
	}

	render(){
		let html = this.toHTML()
		this.el.innerHTML = html

		let newMatchListEl = this.el.querySelector('.NewPatch_matchList')

		newMatchListEl.value = this.newPatchMatchList
		this.el.querySelector('.NewPatch_patchFiles #css').checked = this.cssChecked
		this.el.querySelector('.NewPatch_patchFiles #js').checked = this.jsChecked

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
				console.debug(res)
			})
		}
		
		this.el.querySelector('.js-createFiles').addEventListener('click', createFilesHandler)
		newMatchListEl.addEventListener('changed', newMatchListHandler)
	}

	toHTML(){
		let newFileToggles = this.newFileToggles.reduce((acc, toggle) => {
			return acc + `
			<label for="${toggle.name}" class="NewPatch_patchFile">\n
				<input type="checkbox" id="${toggle.name}" data-human-name="${toggle.human}">\n
				${toggle.human}\n
			</label>\n
			`
		}, '')

		let fullTemplate = `
			<header class="NewPatch_header">New patch:</header>
			<input type="text" class="NewPatch_matchList">
			<div class="NewPatch_patchFiles">
				${newFileToggles}
			</div>
			<button class="js-createFiles btn">Create files</button>
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

		this.patches = getActivePatches()

		this.activeMatcher = null
		this.render()
	}

	toHTML(){
		let patches = [...this.patches.values()].reduce((acc, patch) => {
			let matchers = patch.matchList.reduce((acc, matcher)=>{
				return acc + `
					<span class="ActivePatches_matcher ${matcher === this.activeMatcher ? 'ActivePatches_matcher-active' : ''}"> \n
						${matcher} \n
					</span> \n
				`
			}, '')
			let assets = patch.assets.reduce((acc, asset) => {
				let fullAssetPath = `${patchHost}/${asset.fileUrl}`
				return acc + `
					<a href="${fullAssetPath}" class="ActivePatches_asset">${fileExtension(asset.fileUrl).toUpperCase()}</a>
				`
			}, '')

			return acc + `
				<li class="ActivePatches_patch" data-patch-id="${patch.id}"> \n
					${matchers}
					<span class="ActivePatches_assets">
						${assets}
					</span>
				</li> \n
			`
		}, '')

		let fullTemplate = `
			<header class="ActivePatches_header">
				Active:
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