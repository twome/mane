class EnumOption {
	constructor(accessor, humanName){
		this.accessor = accessor
		this.humanName = humanName
	}

	valueOf(){
		return this.accessor
	}

	toString(){
		return this.humanName
	}

	[Symbol.toPrimitive](hint){
		if (hint === 'number') return this.accessor
		return this.toString()
	}
}

export default class {
	constructor(inputArr, simpleMode = false){
		if (simpleMode){
			let simpleEnum = {}
			inputArr.forEach((enumOptionString, index) => {
				simpleEnum[enumOptionString] = index + 1
			})
			return simpleEnum
		}

		for (let item of inputArr){
			let index = inputArr.indexOf(item)
			// You can give this an array of strings which are converted to objects
			if (typeof item === 'string'){
				this[item] = new EnumOption(
					index + 1, // Don't use zero-based indices by default in enums; for truthiness we want the first index to be index 1
					item
				)
			} else if (typeof item === 'object'){
				let option = new EnumOption(
					item.accessor,
					item.humanName || item.accessor
				)
				
				if (item.humanName){
					if (this[item.humanName] !== undefined) throw Error(`Tried to set property "${item.humanName}" to pre-existing property on this Enum`)
					this[item.humanName] = option
				}

				if (item.accessor === undefined) throw Error('No accessor provided for this option')
				this[item.accessor] = option
				
			} else {
				throw Error('Unknown type for Enum values: must be a string or object with properties "accessor" [and "humanName"]')
			}
		}

		Object.freeze(this)
	}
}