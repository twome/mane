#!/usr/bin/env node

/*
	ES Modules must be supported by your version of Node to run this!

	To use github.com/standard-things/esm, run `node -r esm bin/mane.js`
*/

import { makeServer } from '../src/server/server.js'

let port = 1917

let server = makeServer()
server.listen(port, (err)=>{
	if (err){
		throw err
	}
	// Server ready function
	console.info(`Running Mane server at :${port}`)
})