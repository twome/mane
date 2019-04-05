const path = require('path')

// import Enum from '../node_modules/@twome/panrepo/enum.js'

export let getConfig = () => {
	return {
		port: 7473,
		routes: {
			patchesFor: '/patches-for'
		},
		accomodatingUrlMatching: true,
		recentUrlsHistoryLength: 500,
		storageDir: path.join(process.cwd(), '/rough-testing-dir/'), //DateTime.local().toISO())
		excessLengthIndicator: '-truncated---',
		specialCommentToken: 'patch-urls',
		fsCacheDir: '.cache',
		fsCacheMatchListsFilename: 'fs-cache-matchlists.json',
		// patchJsonSchema: new Enum(['UserJavascriptAndCSS', 'Mane'])
		patchJsonSchema: {
			UserJavascriptAndCSS: 1,
			Mane: 2
		}
	}
}