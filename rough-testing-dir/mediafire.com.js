let tryingTick
let clickedDownload = false

let tryRemovingAdModal = ()=>{
	
	let adblockEl = document.querySelector('.lightbox.on')
	let downloadBtnEl = document.querySelector('#download_link [aria-label*="Download"]')
	
	if (adblockEl){
		adblockEl.parentElement.removeChild(adblockEl)
		if (!clickedDownload){
		  downloadBtnEl.click()
		  clickedDownload = true
		}
		clearInterval(tryingTick)
	}
}

tryingTick = setInterval(tryRemovingAdModal, 2000)