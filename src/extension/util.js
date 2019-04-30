/* global browser */

// TEMP DEV
let mockUrlToCheck = 'https://mockurl.example.com/a-path?fake-query=sure'
let mockAssets = [
	{
		fileUrl: 'bingbong.com.js',
		assetType: 'js',
		forPatch: 'bingbong.com',
	},
	{
		fileUrl: 'wimwam.flam,bingbong.com,hiphop.stop,bingobango.bongo,hothere.stranger.css',
		assetType: 'js',
		forPatch: 'wimwam.flam,bingbong.com,hiphop.stop,bingobango.bongo,hothere.stranger',
	},
	{
		fileUrl: 'wimwam.flam,bingbong.com,hiphop.stop,bingobango.bongo,hothere.stranger.js',
		assetType: 'js',
		forPatch: 'wimwam.flam,bingbong.com,hiphop.stop,bingobango.bongo,hothere.stranger',
	}
]
let mockPatches = [
	{
		id: mockAssets[1].forPatch,
		matchList: mockAssets[1].forPatch.split(','),
		assets: [mockAssets[1], mockAssets[2]],
		options: {
			on: true
		}
	},
	{
		id: mockAssets[0].forPatch,
		matchList: mockAssets[0].forPatch.split(','),
		assets: [mockAssets[0]],
		options: {
			on: false
		}
	}
]

export let last = arr => arr.reverse()[0]
export let fileExtension = path => last(path.split('.'))

export const getActiveAssets = (app) => {
	// TODO - DEV ONLY
	if (!app.weApiAvailable && !app.chromeWeApiAvailable){
		// Mock real asset dep-invocations
		return mockAssets
	}

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

export const makePatchMapFromStrings = matchListStrings => new Map(matchListStrings.map(matchListString => {
	let patch = new Patch(matchListString)
	return [patch.id, patch]
}))

export const assetsToPatchMap = assets => {
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

export const getActivePatches = (app) => assetsToPatchMap(getActiveAssets(app))

export const getActiveTabUrl = async (app) => {
	// TODO - DEV ONLY
	if (!app.weApiAvailable && !app.chromeWeApiAvailable){
		// Mock a real URL
		return mockUrlToCheck
	}

	return new Promise((res, rej) => {
		let onTabsFound = tabs => {
			if (tabs[0]){
				res(tabs[0].url)
			} else {
				rej(Error('No tabs found'))
			}
		}

		if (app.chromeWeApiAvailable) {
			browser.tabs.query({
				active: true,
				currentWindow: true
			}, onTabsFound)
		} else if (app.weApiAvailable){
			return browser.tabs.query({
				active: true,
				currentWindow: true
			}).then(onTabsFound, err => {
				console.error({err})
			})
		}
	})
}

// TODO: Why is our CORS not working here?
export const getMatchingPatches = async (url, {app}) => {
	if (!app.weApiAvailable && !app.chromeWeApiAvailable){
		return mockPatches
	}

	if (!url){
		url = await getActiveTabUrl(app)
	}

	// We need to encode to escape all the special URI characters
	let patchRequestPath = `${app.cfg.patchHost}/patches-for/${encodeURIComponent(url)}`


	let response = await fetch(patchRequestPath, {
		mode: 'cors'
	})
	if (response.ok) {
		let patchArr = await response.json()
		console.debug({patchArr})
		for (let patch of patchArr){
			if (!patch.options){
				console.error('Matching patch had no options; filling with defaults', patch)
				patch.options = {
					on: true,
					waitForDomContentLoaded: true
				}
			}
		}
		return patchArr
	} else {
		throw response
	}
}

export const resolveIn = waitMs => new Promise(resolve => setTimeout(resolve, waitMs))
export const rejectIn = waitMs => new Promise((res, reject) => setTimeout(reject, waitMs))