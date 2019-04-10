// 3rd-party dependencies
require('dotenv').config() // We only need side-effects on: process.env
import Enum from './enum.js'

let isIntegerWithin = (string, min, max) => {
	let int = Number(string)
	let aboveMin
	let belowMax

	if (Math.floor(int) !== Number(int)) return false // Not integer (use Number to normalise -0)
	
	if (typeof min === 'number'){
		aboveMin = int >= min
	} else if (min === undefined){
		aboveMin = true
	}

	if (typeof max === 'number'){
		belowMax = int <= max
	} else if (max === undefined){
		belowMax = true
	}

	let withinBounds = aboveMin && belowMax
	return (typeof int === 'number' && withinBounds)
}

export const envs = new Enum(['development', 'staging', 'production'])

export const parseConfigs = (defaults = {}) => {
	let finalConfig = {}

	/*
		App defaults
	*/
	let defaultConfig = defaults

	/*
		Environment variables
	*/
	let envVars = {}

	// Process text environment variables into more useful types & validate them
	if (process.env.NODE_VERBOSE){
		let verbosityAsInt = Number(process.env.NODE_VERBOSE)
		if ( isIntegerWithin(verbosityAsInt, 0, 9) ){
			envVars.NODE_VERBOSE = verbosityAsInt
		} else {
			throw Error('NODE_VERBOSE must be an integer 0 to 9 inclusive' + process.env.NODE_VERBOSE)
		}	
	}
	if (process.env.CSS_SOURCEMAPS){
		if (process.env.CSS_SOURCEMAPS === 'true'){
			envVars.CSS_SOURCEMAPS = true
		} else if (process.env.CSS_SOURCEMAPS === 'false'){
			envVars.CSS_SOURCEMAPS = false
		} else {
			throw Error(`CSS_SOURCEMAPS must be a string "true" or "false"`)
		}	
	}
	if (process.env.NODE_ENV){
		if (process.env.NODE_ENV === 'development'){
			envVars.NODE_ENV = envs.development
		} else if (process.env.NODE_ENV === 'production'){
			envVars.NODE_ENV = envs.production
		} else {
			throw Error('NODE_ENV must be "production" or "development"')
		}
	}
	if (process.env.LOCAL_SERVER_PORT){
		let portAsInt = Number(process.env.LOCAL_SERVER_PORT)
		if ( isIntegerWithin(portAsInt, 0, 99999) ){
			envVars.localServerPort = portAsInt
		} else {
			throw Error('LOCAL_SERVER_PORT must be a valid port number')
		}
	}

	/*
		Command-line arguments
	*/
	let clArgs = {}

	// Normal unix order of settings precendence
	Object.assign(finalConfig, defaultConfig)
	Object.assign(finalConfig, envVars)
	Object.assign(finalConfig, clArgs)

	return finalConfig
}