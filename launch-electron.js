const childProcess = require('child_process')
const path = require('path')

const electronBinaryPath = require('electron')

const electronProcess = childProcess.spawn(electronBinaryPath, [
	path.join(__dirname, 'src/native')
], {
	stdio: 'inherit'
})