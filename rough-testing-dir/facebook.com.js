let switchFeedToMostRecent = ()=>{
  let getNewsFeedNav = () => document.querySelector('#universalNav [data-nav-item-id="4748854339"]')
  
  let getSortBtn = newsFeedNav => newsFeedNav.querySelector('[role="button"][aria-label="Sort options"]')
  
  let sortMenuExists = () => document.querySelector('.uiContextualLayer [role="menu"]')
  
  let getMostRecentBtn = () => document.querySelector('.uiContextualLayer a[aria-label="Most recent"]')
  
  let getTopStoriesBtn = () => document.querySelector('.uiContextualLayer a[aria-label="Top Stories"]')
  
  let newsNav, sortBtn
  
  let menuAppearedTick
  let startPollingForMenu = ()=>{
    let handlerDone = false
    let handler = ()=>{
      console.debug('handler')
      if (sortMenuExists()){
        console.debug('sort menu exists!')
        // Menu exists
        let mostRecentBtn = getMostRecentBtn()
        if (mostRecentBtn && getTopStoriesBtn()){
          console.debug('Btns exist')
          // Both options exist
          if (mostRecentBtn.getAttribute('aria-checked') !== 'true'){
            // Switching to "most recent"
            mostRecentBtn.click()
            let growl = document.createElement('span')
            growl.classList.add('userPatch----switchFeedToMostRecentPopupNotification') // up: "user patch"
            growl.innerText = 'Switching News Feed to "Most recent"...'
            document.body.appendChild(growl)
          } else {
            // Close the in-situ menu
            sortBtn.click()
          }
          handlerDone = true
        }
      }
      if (handlerDone) clearInterval(menuAppearedTick)
    }
    menuAppearedTick = setInterval(handler, 100)
  }
  
  let navExistsDone = false
  async function navExists(){
    return await new Promise(y => {
      let tick
      tick = setInterval(()=>{
        console.debug('first poll')
        newsNav = getNewsFeedNav()
        if (newsNav){
          sortBtn = getSortBtn(newsNav)
          if (sortBtn){
            console.debug('sort btn exists')
            navExistsDone = true
            y(sortBtn)
          }
        }
        if (navExistsDone) clearInterval(tick)
      }, 300)
    })
  }
  
  navExists().then(sortBtn => {
    
    console.debug('promise resolved')
    
    sortBtn.click()
    startPollingForMenu()
  })
}

switchFeedToMostRecent()