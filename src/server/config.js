const path = require('path')
const os = require('os')

export let getConfig = () => {
	let cfg = {
		port: 1917,
		routes: {
			testConnection: 'test-connection',
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
		excessLengthIndicator: '_mane-patch',
		specialCommentTokenMatchList: 'patch-urls',
		specialCommentTokenWhenToRun: 'when-to-run',
		fsCacheDir: '.cache',
		fsCacheMatchListsFilename: 'fs-cache-matchlists.json',
		patchDefaultOptions: {
			on: true,
			whenToRun: 'dom'
		},

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
		},

		verbosity: 1
	}
	cfg.storageDir = path.join(os.homedir(), '/.mane-patches')
	cfg.optionsJsonPath = path.join(cfg.storageDir, 'options.json')
	cfg.fsCacheFilePath = path.join(cfg.storageDir, cfg.fsCacheDir, cfg.fsCacheMatchListsFilename)

	return cfg
}
