/*
	Extremely minimal publish/subscribe event tracker
*/

class Subscribers extends Set {
	constructor(){
		super()
	}
}

export default class PubSub {
	constructor(){
		this.events = new Map()
	}

	subscribe(eventName, handler){
		if (!this.events.get(eventName)) this.events.set(eventName, new Subscribers())
		this.events.get(eventName).add(handler)
	}

	unsubscribe(eventName, handler){
		this.events.get(eventName).delete(handler)
	}

	publish(eventName, data){
		for (let handler of this.events.get(eventName)){
			handler(data)
		}
	}
}