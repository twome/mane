let esm = require('esm')
require = esm(module)
module.exports = require('../src/server/server.js')