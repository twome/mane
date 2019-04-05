let removeShareLinks = ()=>{
  let titles = document.querySelectorAll('.sidebar__section-title')
  console.debug(titles)
  
  let shareTitle = [...titles].filter(el => el.innerText.match(/^\s*Share\s*$/))[0]
  
  console.debug(shareTitle)
  
  let shareSection = shareTitle.closest('.sidebar__section')
  shareSection.parentElement.removeChild(shareSection)  
}

setTimeout(removeShareLinks, 1000)