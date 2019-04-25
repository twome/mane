class NoBrowserConnection extends Error {
	constructor(){
		super(`Couldn't connect to browser`)
	}
}

export default { NoBrowserConnection }