// Fixed header
let metabars = document.querySelectorAll('.metabar')
for (let bar of [...metabars]){
  bar.classList.remove('u-fixed')
}

// Annoyance overlay
let tick
tick = setInterval(()=>{
  let overlay = document.querySelector('.overlay')
  if (overlay){
    overlay.parentElement.removeChild(overlay)
    clearInterval(tick)  
  }
}, 1000)

// Sticky footer
let tick2
tick2 = setInterval(()=>{
  let stickyFooter = document.querySelector('.js-stickyFooter')
  if (stickyFooter){
    stickyFooter.parentElement.removeChild(stickyFooter)
    clearInterval(tick2)  
  }
  
}, 1000)