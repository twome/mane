# Mane

A Node + WebExtension app that automatically inserts your custom JavaScript and CSS files, stored on your hard drive or a remote Git repository, into web pages to customise them - fix bugs, improve the visual design, remove ads - whatever you want! 

It also allows you to easily share and use public community "patches", so everyone can easily benefit from one person's customisations. 

This is similar in approach to GreaseMonkey on Firefox, and 'User Javascript & CSS' on Chrome, but with an emphasis on editing and storing the patches in whatever way suits you, instead of in a custom editor and locked into a single browser extension's database.

## Interaction with the filesystem

Normally, a filename for a patch will simply be the matchList concatenated into a comma-separated string. For very large matchlists, this could easily become very unwieldy.

It's a bit risky to create gigantic path names; lots of programs don't deal well with excessive sizes. Instead, we'll: 
	- give this patch a random ID, 
	- name the assets (JS & CSS) with that ID, 
	- put them in a folder that has an ID prefix plus a few of the matches for human readability
	- create a .txt file within this folder containing the full matchList in .gitconfig style	

When applying patches, we'll resolve each domain by:
	- looking for a match in root asset (JS/CSS) filenames, then
	- looking for a match in folder names (apply all files in folder), then
	- looking for a match in folderName/matches.txt and applying all files in folder
	- (optional & slow) looking for a custom comment in the first non-whitespace line of every asset: `/* patch-urls <matches string here> */`

The app should cache an index file of the locations of assets for all matchers from every patch's matchList, as looking through so many FS files will be very slow. It should also cache the contents of the assets in memory for repeated visits to pages with the same matchers.

## Instructions for using patches' JS and CSS files without this browser extension

Install Chrome extension [User Javascript & CSS](https://chrome.google.com/webstore/detail/user-javascript-and-css/nbhcbdghjpllgmfilhnhkllmkecfmpld?hl=en) (it's a very dry name, but a well-designed and straightforward extension), which lets you add custom JS / CSS to any page, according to a text-based filter for which pages get which JS / CSS. 

To use this JS / CSS, go to any page in your browser, click the User Javascript & CSS button, click 'Add new' and then copy the contents of these files into the relevant panes. "UJS&CSS" will then automatically detect any time you visit a URL that is based on your current page's domain (eg "twitter.com"), and will add these files into the page.

### No Chrome?

You're on your own to find an extension/method to add these scripts to Twitter pages, but there's nothing about these scripts that are specific to Chrome whatsoever.