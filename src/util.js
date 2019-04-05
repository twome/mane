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


export let getMatchListPreview = (matchList, charLimit) => {
	matchList = [...matchList] // Clone to prevent mutation
	let preview = ''
	while (preview.length <= charLimit){
		let first = matchList.shift()
		if (first.length + 1 <= charLimit){
			preview = preview + first + ','
		}
	}
	return preview.substr(0, preview.length - 1) // Cut trailing comma
}