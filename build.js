import Bundler from './node_modules/parcel-bundler/index.js'
const path = require('path')

const entryFiles = path.join(__dirname, 'src/server.ts')
const parcelOpts = {
	outFile: 'server.js',
	watch: true,
	contentHash: false,
	target: 'node',
}

;(async () => {
  // Initializes a bundler using the entrypoint location and options provided
  const bundler = new Bundler(entryFiles, parcelOpts)

  // Run the bundler, this returns the main bundle
  // Use the events if you're using watch mode as this promise will only trigger once and not for every rebuild
  bundler.bundle().catch(err => console.error(err))
  bundler.on('bundled', (bundle) => {
  	console.info('Bundled ', bundle.name)
  })
})()