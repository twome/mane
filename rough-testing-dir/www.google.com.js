// Strings or regexes
let blockList = [
  'w3schools.com', 
  'quora.com',
  'forbes.com'
].map(str => str.replace('.', '\.'))

let alreadyDone = false

const isValidUrl = str => {
  try {
    new URL(str)
    return true
  } catch (_) {
    return false
  }
}

// Visually emphasize the domain part of the URL for quick skimreading
let emphasiseDomain = citeEl => {
  let matched = citeEl.innerText.match(/[^\s]+/)
  let urlPart = matched && matched[0] // Text until whitespace
  if (urlPart){
    if (!isValidUrl(urlPart)) urlPart = 'http://' + urlPart
    if (!isValidUrl(urlPart)){
      console.warn(urlPart)
      return false
    }
    let urlObj = new URL(urlPart)
    let nonSecure = urlObj.protocol !== 'https:' ? 'domainEmphasis_nonSecure' : ''
    let hash = urlObj.hash ? '#' + urlObj.hash : ''
    let search = urlObj.search ? '?' + urlObj.search : ''
    let newHtml = `<span class="domainEmphasis"><span class="domainEmphasis_protocol ${nonSecure}">${urlObj.protocol}</span><span class="domainEmphasis_domain">${urlObj.host}</span>${urlObj.pathname}${hash}${search}</span>`
    citeEl.innerHTML = citeEl.innerHTML.replace(urlPart, newHtml)
  }
}

let hideBlocked = citeEl => {
  for (let str of blockList){
    if (citeEl.innerText.match(str)){
      let resultEl = citeEl.closest('[data-hveid], [data-ved]').parentElement
      
      resultEl.innerHTML = `<div class="blockedResult"><span class="blockedResult_preface">BLOCKED:</span> ${str}</div>`
      
      // If this is the whole result, take away the margins from the parent
      // let isAlone = [...resultEl.parentElement.children].length === 1
      // if (isAlone){
      resultEl.classList.add('blockedEntireResult')
      // }
    }  
  }
}

let processDom = ()=>{
  let cites = [...document.querySelectorAll('cite')]

  for (let citeEl of cites){
    if (citeEl.dataset.alreadyDone){ return }
    
    emphasiseDomain(citeEl)
    
    // Hide results from domains we don't want.
    hideBlocked(citeEl)
    
    citeEl.dataset.alreadyDone = 'true'
  }
  
  alreadyDone = true
}

setInterval(()=>{
  processDom()
}, 300)

document.addEventListener('DOMContentLoaded', processDom)
document.addEventListener('load', processDom)
if (['interactive', 'complete'].includes(document.readyState)){ processDom()
}