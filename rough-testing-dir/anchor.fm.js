let audioEls = document.getElementsByTagName('audio')



let linksContainerEl = document.createElement('div')
linksContainerEl.classList.add('EasyLinksContainer')
document.body.appendChild(linksContainerEl)

let makeAudioLink = url => {
  let containerEl = document.createElement('div')
  containerEl.classList.add('EasyAudioLink')
  let linkEl = document.createElement('a')
  linkEl.href = url
  let urlBits = url.split('/')
  let dateUploaded = urlBits[urlBits.length - 2]
  let pageUrlBits = location.pathname.split('/')
  downloadFileName = dateUploaded + ' ' + pageUrlBits[pageUrlBits.length - 1] + `.m4a`
  linkEl.download = downloadFileName
  linkEl.innerText = url
  let copyInputEl = document.createElement('input')
  copyInputEl.classList.add('EasyAudioLink_copyText')
  copyInputEl.value = downloadFileName
  copyInputEl.addEventListener('click', function(e){
    this.select()
  })
  containerEl.appendChild(linkEl)
  containerEl.appendChild(copyInputEl)
  linksContainerEl.appendChild(containerEl)
}

;[...audioEls].forEach((val, i)=>{
  makeAudioLink(val.src)
})

let closeBtnEl = document.createElement('button')
closeBtnEl.classList.add('EasyLinksContainer_closeBtn')
closeBtnEl.innerText = 'fuck off you scoundrel'
closeBtnEl.addEventListener('click', ()=>{
  containerEl.parentElement.removeChild(containerEl)
})
linksContainerEl.appendChild(closeBtnEl)