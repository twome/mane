// NB: To get the missing space-scrolling behaviour, you can press <PgDn> (Win) or <Option+Down> (Mac) to scroll the page down by one window-height.

window.addEventListener('load', (e)=>{
	document.addEventListener('keydown', (e)=>{
		if (e.target === document.body & e.key === ' '){ // Space button
		  let playPauseContainer = document.querySelector('.play-pause')
		  let playBtn = document.querySelector('#play-player')
		  let pauseBtn = document.querySelector('#pause-player')
			playPauseContainer.click()
			e.preventDefault() // We don't want space to scroll the screen down
		}
	}, true)
})
