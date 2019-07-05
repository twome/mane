// Modules to control application life and create native browser window
const { app, Menu, MenuItem, Tray, nativeImage } = require('electron')
const path = require('path')

import { makeServer, openStorageDir } from '../../lib/programmatic.js'
import * as errors from './errors.js'

// Config
let port = 1917
let trayIconConnectedPath = path.join(__dirname, './images/icon/tray_mac_grey.png')
let trayIconDisconnectedPath = path.join(__dirname, './images/icon/tray_mac_inverted-alpha.png')

// State
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let trayPopupWindow
let tray = null
let trayContextMenu = null
let state = {}
state.appSettings = {
	startAppWithOsLogin: false,
	hideUntilAppOpened: false,
	patchDefaults: {
		whenToRun: 'dom'
	}
}
// TODO // state.appLaunchedFrom = 'TODO'
state.trayIconConnected = nativeImage.createFromPath(trayIconConnectedPath)
state.trayIconDisconnected = nativeImage.createFromPath(trayIconDisconnectedPath)

let connectToBrowsers = async () => {
	// TODO
	/*
		SECURITY: We need to only accept requests from the extension, otherwise pages can request API routes and every patch in the dir. You could infer a lot about users given the sites they've chosen to modify, and the contents / comments in the patch assets. IPC? WebSockets? HTTPS?

		SECURITY: We also need to ensure there are no MITMs from other local apps watching all localhost ports (or is this already a fully compromised system then?
	*/
	throw new errors.NoBrowserConnection()
}

let onConnectionLost = () => {
	tray.setImage(state.trayIconDisconnected)
	trayContextMenu.insert(new MenuItem(0, {
		label: `Couldn't connect to any Mane browser extension.`,
		id: 'disconnectedWarning',
		enabled: false
	}))
	trayContextMenu.insert(new MenuItem(1, {
		id: 'disconnectedSeparator',
		type: 'separator'
	}))
}

let onConnectionGained = () => {
	tray.setImage(state.trayIconConnected)
	delete trayContextMenu.items['disconnectedWarning']
	delete trayContextMenu.items['disconnectedSeparator']
}

let createTray = async () => {
	tray = new Tray(state.trayIconDisconnected)

	trayContextMenu = Menu.buildFromTemplate([
		// TODO	                                         //
		/*{ label: 'Preferences',
			id: 'preferences',
			sublabel: `These save to <YOUR_PATCHES_FOLDER>/app-settings.json`,
			// icon: nativeImage.createFromPath('./images/icon/icon8-adjust-48.png'),
			submenu: [
				{ label: 'Start Mane on login', role: 'startAppWithOsLogin', type: 'checkbox' },
				{ label: 'Hide the menubar icon until Mane is next launched', role: 'hideUntilAppOpened', type: 'checkbox' },
				{ label: 'Change the patch & settings storage folder', role: 'changeDir', type: 'checkbox' },
			]
		},*/
		{
			label: `Mane server listening at localhost:${port}`,
			id: 'title',
			enabled: false
		},
		{ type: 'separator' },
		{
			label: 'Open patches folder',
			id: 'openPatchesFolderOs',
			click: (menuItem, browserWindow, event) => {
				openStorageDir()
			}
		},

		// TODO
		// { label: 'Install browser extension for > (submenu: Chrome, Firefox, Safari etc.)…', id: 'startOnBoot' },
			// ~ download extension .ctx file or navigate to relevant repo/store
		{ type: 'separator' },
		{
			label: 'Quit',
			id: 'quit',
			// icon: nativeImage.createFromPath('./images/icon/icon8-exit-48.png'),
			click: (menuItem, browserWindow, event) => {
				/*
					TODO: quitGracefully
				*/
				app.quit()
			}
		},
	])
	// BROKEN
	// tray.setToolTip(`Mane native app - serves patch files to Mane browser extensions for modifying web pages. App launched from: ${state.appLaunchedFrom}`)
	// tray.setTitle('Mane')

	tray.setContextMenu(trayContextMenu)

	if (process.env.NODE_ENV !== 'development') app.dock.hide() // We don't need a dock icon for a tray-only app

	try {
		// TODO
		// let connections = await connectToBrowsers()
		onConnectionGained()
	} catch (err) {
		console.error(err)
		onConnectionLost()
	}
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
	createTray()
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
	if (tray === null){
		createTray()
	} else if (tray){
		tray.popUpContextMenu()
	}
})



/*
	SECURITY
*/
// Don't let views be used to navigate URLs like a browser - we don't need it and don't want to risk remote JS being able to execute with any OS privileges whatsoever.
app.on('web-contents-created', (event, contents) => {
	contents.on('will-navigate', (event, navigationUrl) => {
		event.preventDefault()
	})
})



/*
	Mane patches server
*/
let server = makeServer()
server.listen(port, (err)=>{
	if (err){
		throw err
	}
	// Server ready function
	console.info(`Mane server is listening at :${port}`)
})

console.info('Starting the Mane Electron app...')