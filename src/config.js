const path = require('path')

// import Enum from '../node_modules/@twome/panrepo/enum.js'

export let getConfig = () => {
	return {
		port: 1917,
		routes: {
			patchesFor: '/patches-for'
		},
		accomodatingUrlMatching: true,
		recentUrlsHistoryLength: 500,
		storageDir: path.join(process.cwd(), '/patches/'), //DateTime.local().toISO())
		excessLengthIndicator: '-truncated---',
		specialCommentToken: 'patch-urls',
		fsCacheDir: '.cache',
		fsCacheMatchListsFilename: 'fs-cache-matchlists.json',

		// Enums
		// patchJsonSchema: new Enum(['UserJavascriptAndCSS', 'Mane'])
		patchJsonSchema: {
			UserJavascriptAndCSS: 1,
			Mane: 2
		},
		assetTypes: {
			Js: 1,
			Css: 2
		}
	}
}