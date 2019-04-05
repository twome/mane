let d = document

let getAncestorQuery = (startingElem, selector, ceilingElem)=>{
	ceilingElem = ceilingElem || document.body
	let targets = ceilingElem.querySelectorAll(selector)
	let correctParent = null
	for (let target of targets){
		if (target.contains(startingElem)){
			return correctParent = target  
		}
	}
	
	return correctParent
}

let externalLinks = d.querySelectorAll('.UnifiedAnswerPagedList [id^=__] .external_link')

externalLinks.forEach((val)=>{
	if (val.innerHTML.trim().match(/^Learn more at/i)){
		let adEl = getAncestorQuery(val, '.UnifiedAnswerPagedList')
		if (!adEl.classList.contains('PagedListFoo')){ 
			adEl.classList.add('advertisement')
		}
	}
})