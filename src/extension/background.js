/* global chrome, browser */

console.info('Mane background script')

let config = {
	patchHost: 'http://localhost:1917',
	routes: {
		testConnection: 'test-connection',
		createPatchFile: 'create-patch',
		openFileNative: 'open-file',
		setPatchOptions: 'set-options',
		patches: 'patches',
	},
	testConnectionIntervalMs: 3000
}

let state = {
	serverAvailable: null
}

let testConnection = () => {
	fetch(`${config.patchHost}/${config.routes.testConnection}`, {
		mode: 'cors'
	}).then(res => {
		state.serverAvailable = res.ok
	}, err => {
		state.serverAvailable = false
	}).finally(() => {
		browser.browserAction.setIcon({
			path: {
				16: state.serverAvailable ? './images/icon/mane_16.png' : './images/icon/mane_16_grey.png'
			}
		})
	})
}
setInterval(testConnection, config.testConnectionIntervalMs)
testConnection() // Initial run on browser start / extension reload