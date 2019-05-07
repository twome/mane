/* global chrome, browser */

// TEMP - this is just for development QoL in chrome
// DEV ONLY
// TODO
if (chrome.runtime) browser = chrome

setInterval(async () => {
	let views = chrome.extension.getViews({ type: "popup" })
	if (views[0]){
		// console.debug('Popup exists', views)
	} else {
		// console.debug('No popup; refreshing extension', views)
		browser.runtime.reload()
	}
}, 5000)