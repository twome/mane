
- fs-write save in reverse domain order? au.com.google etc?

# Old instructions

Install Chrome extension [User Javascript & CSS](https://chrome.google.com/webstore/detail/user-javascript-and-css/nbhcbdghjpllgmfilhnhkllmkecfmpld?hl=en) (it's a very dry name, but a well-designed and straightforward extension), which lets you add custom JS / CSS to any page, according to a text-based filter for which pages get which JS / CSS. 

To use this JS / CSS, go to any page in your browser, click the User Javascript & CSS button, click 'Add new' and then copy the contents of these files into the relevant panes. "UJS&CSS" will then automatically detect any time you visit a URL that is based on your current page's domain (eg "twitter.com"), and will add these files into the page.

## No Chrome?

You're on your own to find an extension/method to add these scripts to Twitter pages, but there's nothing about these scripts that are specific to Chrome whatsoever.

## To-do (for developers only)

Create a cross-browser WebExtensions-based extension to read a directory (either on your PC or a remote git repo) that contains files/folders named after the domains they should be injected into, eg `facebook.com.css` or `facebook.com/*.js`. Then, make functionality to let users easily/automatically wrap up their patches for a given domain into a git repo and share it somewhere on the web.