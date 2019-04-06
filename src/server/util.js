export let getRandomId = (idLength) => {
	let palette = 'abcdefghijklmnopqrstuvwyxz0123456789'.split('')
	for (
		var i = 0, id = ''; 
		i < idLength; 
		i = i + 1
	){
		id = id + palette[Math.floor( Math.random() * palette.length )]
	}
	return id
}


export let truncateMatchList = (matchList, charLimit) => {
	matchList = [...matchList] // Clone to prevent mutation
	let truncated = ''
	while (truncated.length <= charLimit){
		let first = matchList.shift()
		if (first.length + 1 <= charLimit){
			truncated = truncated + first + ','
		}
	}
	return truncated.substr(0, truncated.length - 1) // Cut trailing comma
}