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
			hidden: 'u-hidden'
		}

		// State
		this.shown = !!showImmediately

		this.transitioning = false
		this.handlersRegistered = false
		this.naturalHeight = null

		this.render()

		// Start lifespan time to self-remove
		setTimeout(() => {
			this.kill()
		}, lifespanMs)
	}

	waitForTransition(){
		let prom = new Promise((res) => {
			let handler = (res) => {
				res()
				this.el.removeEventListener('transitionend', handler)
			}
			this.el.addEventListener('transitionend', handler)
		})
	}

	async show(){
		if (this.transitioning) return false
		this.transitioning = true

		this.el.classList.remove(this.stateClasses.hidden)

		let initial = this.el.offsetHeight

		// Instantly/invisibly get natural height
		this.el.style.height = ''
		let target = this.el.offsetHeight
		
		this.el.style.height = initial + 'px'
		setTimeout(() => { this.el.style.height = target + 'px' }, 100) // Trick to force the CSS transition to kick in

		await this.waitForTransition()
	}

	async hide(){
		if (this.transitioning) return false
		this.transitioning = true

		this.el.style.height = this.el.offsetHeight // Set to a definite value so CSS transition can work
		setTimeout(() => { this.el.style.height = '0px' }, 0) // Trick to force the CSS transition to kick in

		await this.waitForTransition()
	}

	registerHandlers(){
		let clickHandler = (e) => {
			this.shown = !this.shown
			this.render()
		}
		this.el.addEventListener('click', clickHandler)

		let transitionEndHandler = () => {
			console.debug('transitionend firing', this)
			this.transitioning = false
			this.el.style.height = ''
			if (!this.shown){
				this.el.classList.add(this.stateClasses.hidden)
			} else {
				this.el.classList.remove(this.stateClasses.hidden)
			}
		}
		this.el.addEventListener('transitionend', transitionEndHandler)

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