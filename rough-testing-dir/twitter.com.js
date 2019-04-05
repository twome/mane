let getStatAsInt = (el, statStr) => {
  let statKind = el.querySelector(`.ProfileTweet-action--${statStr}`)
  if (!statKind) return Error(`No 'action' element for ${statStr}`)
  // Here we'll look for a bunch of different methods that Twitter uses to show the number of times a given action happened.
  
  let dataAttr = statKind.querySelector(`[data-tweet-stat-count]`)
  if (dataAttr) return parseInt(dataAttr.dataset.tweetStatCount, 10)
  
  let isZero = statKind.querySelector('.ProfileTweet-actionCount--isZero')
  if (isZero) return 0
  
  let forPresentation = statKind.querySelector('.ProfileTweet-actionCountForPresentation')
  if (forPresentation) return parseInt(forPresentation.innerText, 10)
  
  return Error(`No count for action ${statStr} found.`)
}

let replaceTweetWithPlaceholder = tweetEl => {
  // "Stream items" are tweet threads/reply chains
  let streamItem = tweetEl.closest('.stream-item')
  let linkUrl = tweetEl.dataset.permalinkPath
  
  // This is the placeholder 'blocked' element we'll create to show that a tweet's been hidden
  let blockEl = document.createElement('a')
  blockEl.href = linkUrl
  blockEl.innerText = '[tweet insufficiently juicy to bother displaying]'
  blockEl.classList.add('NotJuicyEnough') // See the CSS for what these styles look like
  
  streamItem.innerHTML = ''
  streamItem.appendChild(blockEl)
}

let filterOutBoringTweets = ({
  blockedUsersList,
  minRatioOfRepliesPerFav = 0.5, // Minimum ratio for getting ratio'd
  maxRatioOfRetweetsPerFav = 0.1, // Maximum ratio for a Coward's Ratio
  minPsaRatioOfRetweetsPerFav = 0.8, // Minimum retweet ratio for a Public Service Announcement
}={}) => {
  let allTweets = document.querySelectorAll('.tweet')
  allTweets.forEach(tweetEl => {
    let owner = tweetEl.dataset.screenName
    let ownerIsBlocked = blockedUsersList.includes(owner)
    let id = tweetEl.dataset.tweetId
    
    let replies = getStatAsInt(tweetEl, 'reply')
    let retweets = getStatAsInt(tweetEl, 'retweet')
    let favs = getStatAsInt(tweetEl, 'favorite')
    
    let counts = [replies, retweets, favs]
    counts.forEach(count => {
      if (count instanceof Error){
        return false // Give up; we can't find any useful info from the DOM
      }
    })
    
    let classicRatio = (replies / favs) >= minRatioOfRepliesPerFav
    let cowardsRatio = (retweets / favs) <= maxRatioOfRetweetsPerFav
    let psa = (retweets / favs) >= minPsaRatioOfRetweetsPerFav
    
    if (ownerIsBlocked){
      if (classicRatio || cowardsRatio || psa){
        // Tweet displays as normal
      } else {
        replaceTweetWithPlaceholder(tweetEl)
      } 
    }
  })
}
// TODO: Search for replies to tweets with >= 1x favs vs the OP

// setInterval(()=>{
//   filterOutBoringTweets({
//     blockedUsersList: [
//       'JerkVening' // Obviously  
//     ]
//   })
// }, 500)

