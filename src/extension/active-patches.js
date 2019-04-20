import { getActiveTabUrl, getMatchingPatches, fileExtension } from './util.js'
import Growl from './growl.js'

let appConfig
class ActivePatches {
	constructor(el, {
		patches = new Map(),
	}={}){
		if (!el){
			el = document.createElement('section')
			ActivePatches.app.el.appendChild(el)
		}
		appConfig = ActivePatches.app.cfg // Convenience
		Object.assign(this, {el, patches})

		// TODO: Highlight the active matcher within each matchList (send from server?)
		this.activeMatcher = 'www.google.com' // TEMP TEST
		
		this.updateVm().then(() => {
			this.render()	
		})
	}

	async updateVm(){
		try {
			let url = await getActiveTabUrl(ActivePatches.app)
				.catch(err => { throw Error('Failed getting active tab URL') })
			this.patches = (await getMatchingPatches(url, {
				config: appConfig,
				app: ActivePatches.app
			})).reduce((map, patch) => { 
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
				fetch(`${appConfig.patchHost}/${appConfig.routes.openFileNative}/${encodeURIComponent(el.dataset.openingSrc)}`, {
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
			
			let unsyncedState = null
			toggleEl.addEventListener('click', (event) => {
				unsyncedState = unsyncedState !== null ? unsyncedState : patch.options.on // Remember until saved to server
				patch.options.on = !patch.options.on
				this.patches.set(id, patch)
				this.render()
								
				// Update this patch on the server
				fetch(`${appConfig.patchHost}/${appConfig.routes.setOptions}/${encodeURIComponent(id)}`, {
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
						unsyncedState = null
						new Growl({
							type: Growl.types.Success,
							message: 'Changed patch options and saved to disk.',
							attachPoint: ActivePatches.app.el
						})	
					} else {
						patch.options.on = unsyncedState
						unsyncedState = null
						this.patches.set(id, patch)
						new Growl({
							message: 'Server failed to save options.',
							attachPoint: ActivePatches.app.el
						})
					}
				}, err => {
					patch.options.on = unsyncedState
					unsyncedState = null
					this.patches.set(id, patch)
					new Growl({
						message: `Couldn't connect to server.`,
						attachPoint: ActivePatches.app.el
					})
				}).finally(() => {
					this.render()
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
					<a href="${appConfig.patchHost}/${assetPath}" 
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

export default ActivePatches