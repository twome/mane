let esm = require('esm')
require = esm(module)
module.exports = require('./electron-background.js')