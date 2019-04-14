// Options
let patchHost = 'http://localhost:1917'

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
		]
	}={}){
		super(el, '.NewPatch')
		Object.assign(this, {newFileToggles})

		this.render()
	}

	toHTML(){
		let newFileToggles = this.newFileToggles.reduce((acc, toggle) => {
			return acc + `
			<label for="${toggle.name}" class="NewPatch_patchFile PillBtn">\n
				<input type="checkbox" id="${toggle.name}" data-human-name="${toggle.human}">\n
				${toggle.human}\n
			</label>\n
			`
		}, '')

		let fullTemplate = `
			<header class="NewPatch_header">New patch:</header>
			<div class="NewPatch_patchFiles">
				${newFileToggles}
			</div>
			<button class="js-createFiles btn">Go</button>
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
			console.debug('patches')
			let matchers = patch.matchList.reduce((acc, matcher)=>{
				console.debug('matchers')
				return acc + `
					<span class="ActivePatches_matcher ${matcher === this.activeMatcher ? 'ActivePatches_matcher-active' : ''}"> \n
						${matcher} \n
					</span> \n
				`
			}, '')
			console.debug({matchers})
			console.debug({patch})
			let assets = patch.assets.reduce((acc, asset) => {
				console.debug('assets')
				let fullAssetPath = `${patchHost}/${asset.fileUrl}`
				return acc + `
					<a href="${fullAssetPath}">${fileExtension(asset.fileUrl).toUpperCase()}</a>
				`
			}, '')
			console.debug({assets})

			return acc + `
				<li class="ActivePatches_patch" data-patch-id="${patch.id}"> \n
					${matchers}
					<span class="PillBtn-small">
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


for (let el of [...document.querySelectorAll(NewPatch.selector)]){
	instances.add(new NewPatch(el))
}

for (let el of [...document.querySelectorAll(ActivePatches.selector)]){
	instances.add(new ActivePatches(el))
}

let handler = () => {
	for (let instance of instances){
		instance.el.innerHTML = instance.toHTML()
	}	
}
setTimeout(handler, 3000)
