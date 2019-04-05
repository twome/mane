let d = document

setInterval(()=>{
  let cookieAlert = d.querySelector('.sc-link-dark[href="/pages/cookies"]').closest('.announcements')
  if (cookieAlert){
    console.log(cookieAlert)
    cookieAlert.parentElement.removeChild(cookieAlert)      
  }
}, 1000)

