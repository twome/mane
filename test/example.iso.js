/* global assert */

describe('Entire module', function() {
	let inputObject
	before(() => {
		inputObject = {
			str: 'a text value',
			int: 8
		}
	})

	it('runs', function() {
		assert.isObject(inputObject)
		assert.strictEqual(inputObject.int, 8)
	})
})