const afterSiteInit = ()=>{ // This code will wait until the site's code has finished initialising the DOM state.
	
/*
	Remove useless 'Share' and 'Give gold' buttons from comments which add clutter.
*/
let comments = document.querySelectorAll('.Comment')
let underBtns
comments.forEach((comment, i)=>{
	// Reddit obscures/randomises the button css-class, so we can't use that, but they only uses <button> elements.
	underBtns = comment.querySelectorAll('button')
	
	underBtns.forEach((btn, i)=>{
		// We can't use any structured-data clues so we just use the exact button content as a string
		const isBadWord = ['Give gold'].includes(btn.innerHTML.trim())
		if (isBadWord){
			btn.parentElement.removeChild(btn)
		}
	})
	
	let divs = comment.querySelectorAll('div')
	divs.forEach((div)=>{
		if (div.id.match(/-comment-share-menu/)){
			div.parentElement.removeChild(div)
		}
	})
})

}
window.setTimeout(afterSiteInit, 10000) // this is a hack/guess



// Create window-blocking modal to challenge yourself that checking this site is actually a good idea.

// // Settings:
// const challengeTimerMinutes = 30
// const siteName = 'Reddit'
// const effect = 'make you depressed and angry'
// const mistakesMade = 3 // Update this every time you proceed and end up angry & depressed anyway.
// const challengeText = `Is checking ${siteName} going to ${effect}, or help in some way? It has already, at least ${mistakesMade} times. \nFor real, is it worth it?`

// // State:
// let proceedEl

// const resetChallengeTimer = ()=>{
// 	localStorage.setItem('intentCheckerLastConfirmed', String(Date.now()))
// }

// const hasTimerExpired = (minutes)=>{
// 	return Date.now() - Number(localStorage.getItem('intentCheckerLastConfirmed')) > 1000 * 60 * minutes
// }

// setInterval(()=>{
//   if (hasTimerExpired(challengeTimerMinutes)){
// 	  let intentCheckerEl = document.createElement('div')
//   	intentCheckerEl.classList.add('intent-checker')
  	
//   	let blockingEl = document.createElement('div')
//   	blockingEl.classList.add('intent-checker__blocker')
  	
//   	let challengeEl = document.createElement('span')
//   	challengeEl.classList.add('intent-checker__challenge')
//   	challengeEl.innerText = challengeText
  	
//   	proceedEl = document.createElement('button')
//   	proceedEl.innerText = 'Help in some way'
//   	proceedEl.classList.add('intent-checker__proceed-btn')
//   	proceedEl.addEventListener('click', ()=>{
//   		resetChallengeTimer()
//   		intentCheckerEl.parentElement.removeChild(intentCheckerEl)
//   	})
  	
//   	intentCheckerEl.appendChild(blockingEl)
//   	intentCheckerEl.appendChild(challengeEl)
//   	intentCheckerEl.appendChild(proceedEl)
//   	document.body.appendChild(intentCheckerEl)
  	
//   	proceedEl.focus()
//   } else {
//     // proceedEl && proceedEl.click()
//   }
// }, 500)

// const isInPage = node => {
//   return (node === document.body) ? false : document.body.contains(node)
// }

// let focusProceedTick = setInterval(()=>{
//   if (isInPage(proceedEl)){
//     proceedEl.focus()
//   } else {
//     clearInterval(focusProceedTick) 
//   }
// }, 200)