# App-wide settings

## startAppWithOsLogin ~ Boolean
Default `false`

Whether to automatically start Mane when you log in to your OS.

macOS: `System Preferences` › `Users and Groups` › `Login Items`
Windows: TODO
Linux: TODO

## hideUntilAppOpened ~ Boolean. 
Default `false`

Whether Mane shows itself in the menubar/tray, or is completely hidden and runs as a "background process". Mane will always show itself on the menubar/tray and set this option back to `false` when you manually open Mane again, so you can't accidentally lose control of it. 

**We recommend hiding Mane's menubar/tray icon** if you only use Mane through the browser extension. The plan is for every option & behaviour within the menubar/tray app to be accessible through the extension (the only exception is opening the Mane native app, which for security reasons must be manually opened by you, or automatically run on startup). The only reason we need the menubar/tray app at all is to write/read patch files from the OS hard drive, and to share patches & settings between different browsers.

# Per-patch options (can be overriden by each patch)

## whenToRun ~ String|Number
Default `dom`

When to inject the asset into the page.

- 'immediate': Run as soon as possible.
- 'dom': When the DOM structure is loaded, but external resources (images, styles etc) aren't. This is the 'DOMContentLoaded' event.
- 'everything': When everything in the page is loaded. This is the 'load' JS event.
- Number: Run after X milliseconds delay