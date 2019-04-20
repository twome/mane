let instanceList = new WeakSet()

export default class Growl {
	constructor({
		/*String*/message, // Mandatory
		/*Enum - Growl.types*/type = Growl.types.Error,
		/*Boolean*/showImmediately = true,
		/*HTMLElement*/attachPoint = document.body,
		/*Number*/lifespanMs = 3000 // Set to 0 for infinite
	}){
		instanceList.add(this)
		Object.assign(this, { message, type, attachPoint, lifespanMs })

		// Options
		this.typeClasses = new Map([
			[Growl.types.Success, 'Growl-success'],
			[Growl.types.Info, 'Growl-info'],
			[Growl.types.Warning, 'Growl-warning'],
			[Growl.types.Error, 'Growl-error']
		])
		this.stateClasses = {
			hidden: 'u-hidden',
			trickHidden: 'Growl-isHidden'
		}

		// State
		this.shown = false // So the first show() animates from hidden to shown

		this.transitioning = false
		this.handlersRegistered = false
		this.naturalHeight = null

		this.render().then(() => {
			if (!!showImmediately){
				this.shown = true
				this.render()
			}	
		})
		
		// Start lifespan time to self-remove
		if (lifespanMs !== 0){
			setTimeout(() => {
				// this.kill()
			}, lifespanMs)
		}
	}

	waitForTransition(){
		return new Promise((res) => {
			let handler = () => {
				this.el.removeEventListener('transitionend', handler)
				this.transitioning = false
				res()
			}
			this.el.addEventListener('transitionend', handler) // TODO why doesn't this fire?
			// HACK
			setTimeout(handler, 200) // In case the transitions don't work
		})
	}

	async show(){
		if (this.transitioning) return false
		this.transitioning = true

		let transition = this.waitForTransition()
		this.el.classList.remove(this.stateClasses.trickHidden)
		
		await transition
	}

	async hide(){
		if (this.transitioning) return false
		this.transitioning = true

		let transition = this.waitForTransition()
		this.el.classList.add(this.stateClasses.trickHidden)

		await transition
	}

	registerHandlers(){
		let clickHandler = (e) => {
			this.shown = !this.shown
			this.render()
		}
		this.el.addEventListener('click', clickHandler)

		this.handlersRegistered = true
	}

	async render(){
		if (!this.el){
			this.el = document.createElement('div')
			this.el.classList.add('Growl')
			this.el.classList.add(this.typeClasses.get(this.type))
			
			let message = document.createElement('span')
			message.innerText = this.message
			this.el.appendChild(message)
		}
		if (!this.attachPoint.contains(this.el)){
			this.attachPoint.appendChild(this.el)
		}

		if (!this.handlersRegistered) this.registerHandlers()

		if (this.shown){
			await this.show()
		} else {
			await this.hide()
		}
	}

	async kill(){
		this.shown = false
		await this.render()
		// await this.waitForTransition()

		if (this.attachPoint) this.attachPoint.removeChild(this.el)
		instanceList.delete(this)
		return instanceList
	}
}
Growl.types = {
	Success: 1,
	Info: 2,
	Warning: 3,
	Error: 4
}