const path = require('path')

export let getConfig = () => {
	let cfg = {
		port: 1917,
		routes: {
			patchesFor: 'patches-for',
			createPatchFile: 'create-patch', // TODO: just POST on routes.patches/:id
			openFileNative: 'open-file',
			setOptions: 'set-options',
			patches: 'patches'
		},
		accomodatingUrlMatching: true,
		recentUrlsHistoryLength: 500,
		storageDir: path.join(process.cwd(), '/patches/'),
		optionsJsonPath: path.join(process.cwd(), '/patches/options.json'),
		excessLengthIndicator: '-truncated---',
		specialCommentToken: 'patch-urls',
		fsCacheDir: '.cache',
		fsCacheMatchListsFilename: 'fs-cache-matchlists.json',

		// Enums
		patchJsonSchema: {
			UserJavascriptAndCSS: 1,
			Mane: 2
		},
		assetTypes: {
			Js: 1,
			Css: 2
		}
	}
	cfg.fsCacheFilePath = path.join(cfg.storageDir, cfg.fsCacheDir, cfg.fsCacheMatchListsFilename)

	return cfg
}
