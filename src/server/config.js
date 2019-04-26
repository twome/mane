const path = require('path')
const os = require('os')

export let getConfig = () => {
	let cfg = {
		port: 1917,
		routes: {
			patchesFor: 'patches-for',
			createPatchFile: 'create-patch', // TODO: just POST on routes.patches/:id
			openFileNative: 'open-file',
			setPatchOptions: 'set-options',
			patches: 'patches',
			openStorage: 'open-storage'
		},
		accomodatingUrlMatching: true,
		recentUrlsHistoryLength: 500,
		// storageDir: path.join(process.cwd(), '/patches/'),
		// optionsJsonPath: path.join(process.cwd(), '/patches/options.json'),
		excessLengthIndicator: '-truncated---',
		specialCommentToken: 'patch-urls',
		fsCacheDir: '.cache',
		fsCacheMatchListsFilename: 'fs-cache-matchlists.json',

		// Patch filenames
		maxFilenameLength: 60,
		shortIdLength: 6,

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
	cfg.storageDir = path.join(os.homedir(), '/.mane-patches')
	cfg.optionsJsonPath = path.join(cfg.storageDir, 'options.json')
	cfg.fsCacheFilePath = path.join(cfg.storageDir, cfg.fsCacheDir, cfg.fsCacheMatchListsFilename)

	return cfg
}
