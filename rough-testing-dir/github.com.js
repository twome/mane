if (['', '/'].includes(location.pathname)){ // Home page

let h4Els = document.querySelectorAll('.application-main > div .team-left-column h4')

let arrayedEls = [...h4Els]

arrayedEls.forEach(el => {
  if (el.innerText.match(/discover repositories/i)){
    let discoverSidebar = el.parentElement
    discoverSidebar.parentElement.removeChild(discoverSidebar)
  }
})

}