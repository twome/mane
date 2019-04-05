// NB: To get the missing space-scrolling behaviour, you can press <PgDn> (Win) or <Option+Down> (Mac) to scroll the page down by one window-height.

window.addEventListener('load', (e)=>{
	document.addEventListener('keydown', (e)=>{
		if (e.target === document.body & e.key === ' '){ // Space button
			document.body.querySelector('.playbutton').click()
			e.preventDefault() // We don't want space to scroll the screen down
		}
	}, true)
})
