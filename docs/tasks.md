# tasks / bugs

Key: BUG, FEAT (new feature), DEBT (technical debt), SEC (security issue)

- DEBT 1 FIREFOX: I think we might need to use a proper, signed extension in order for the devtools to be able to see into the addon or its popup frame

- BUG 1 FIREFOX: Inconsolata not being loaded or rendered; Courier New looks like absolute shit

- BUG 1 FIREFOX: Can't scroll vertically within the popup

- BUG 1 FIREFOX: Every request to the Mane server except the matchers list is getting a CORS error - server doesn't support PUT operation?

- SEC 1: any foreign page can request anything from the patch server

- BUG 1: cache keeps showing patch unless ALL assets are deleted

- BUG 1: don't allow sub-words to match (like 'fly.biz' to match on 'www.butterfly.biz').
	- basically, for filename matchlists, just use strings + wildcards (with automatic wildcards at the beginning and end), rather than actual regexes, but let regexes (which will have to be escaped out of the asset comment, too!) still be possible via special comments for advanced cases. 
	- maybe look for JS-style /.../ regex delimeters in the matchList string?

- FEAT 1: specify the active matcher in server res

- BUG 1: changing cache.patches at all fucks up because getAllPatches doesn't check for diffs before using caches



- BUG 2 FIREFOX: Must set min-height manually to get the popup to show at all; appears to also be setting max-height?

- DEBT 2: build process for 
	1. packaged extensions and
	2. packaged native executables

- DEBT 2: serious test coverage

- SEC 2: pages can read the contents of patches inserted into the page dom. fix: run patches in/as content scripts

- BUG 2: re-enable cache for patch options

- DEBT 2: whenToRun should be per-asset, not per-patch

- FEAT 2: whereas normally dir names with the main patch folder should be used to group assets into a patch and match them to the dir name's matchlist, the url matcher should ignore dirs in patch folder prefixed with "\_", so users can easily import their own utility libraries served from urls relative to their patches

- FEAT 2: add a special comment to patch files for whenToRun

- FEAT 2: only add random string to truncated filenames if not unique, move the "truncated" bit to the end of the filename for better sorting/readability, and replace "truncated" with "mane-patch" or something

- FEAT 2: proper icon

- FEAT 2: long-term storage of patches in browser to save FS reads and then you'd only need to run the native to refresh them

- FEAT 2: maybe use BrowserFS to keep track of (and store) asset files in extension? https://github.com/jvilk/BrowserFS

- FEAT 2: on server start, recurse all dirs with lstat, find any news or last-modifieds later than the last cache date. add them to the invalids list.

- FEAT 2: add app-settings.json into patches folder, for the native & all extensions

- FEAT 2: Use instructions to boot-launch https://github.com/Teamwork/node-auto-launch

- FEAT 2: allow colons in matchers
	- must separate the IDs and asset filenames?
	- replace `:` with what in filenames? urlencode-style character–>number system?
	- indicator `-renamed---`
	- use special comment to write matchlist in file

- DEBT 2: implement assets properly

- DEBT 2: extension should parallel-load all scripts and bodies before injecting dep-invocations

	- can't they just reference any other file in the patches folder?

	SECURITY: obvious issues

- FEAT 2: minimal memory/cpu footprint executable; boot on load
	- initially only accessible via process table `ps -e` / Activity Monitor / Task Manager?

- FEAT 2: use native inter-process communication instead of HTTP between server and extension

- FEAT 2: set patch storage dir from server CL arg & extension popup

- FEAT EXTENSION 2: contentScripts API to register patches at runtime (instead of modifying <head>)
	- pro: only interference with user page is from patch itself
	- pro: faster loading / load asynchronously?
	- con: security hazard from patches having greater power?



- FEAT 3: open patches dir from ext

- FEAT 3: expose existing mono-json imports, and create exports for all formats. UJS&CSS & TamperMonkey

- FEAT 3: Disable/enable all patches in storage

- FEAT 3: package with Electron Forge

- FEAT 3: flash the extension icon when injections are finished loading & have started to run

- FEAT 3: configuration using a CLI arguments library + dotenv

- FEAT 3: ext: if we're trying to create the exact same matchList and asset type as an existing patch, flash that asset indicator in the matching patches section

- FEAT 3: optionally write patches as a folder, so the the assets can reference sibling images etc within the folder

- FEAT 3: extension can directly fetch remote files or use a JS git implementation to directly check out repos

- FEAT 3: executable or CL arg to back up all patches into json
	- export to UJS&CSS, GreaseMonkey etc formats

- FEAT 3: save the urls / metadata of remote patches as a JSON file
	- MUST forewarn users of danger of remote patches



## release checklist

- revise the manifest; remove extension-management perms


## security/trust

We can't easily do any permissions restrictions or granularity (we could try and provide a whitelist of global-object properties to the patches, but that's fraught with risk), so users must either COMPLETELY trust a patch's author or audit the patch themselves (if they can read the code).

- remote URLs
	- user must manually trust domain AND trust specific pathname (ie hopefully file) 
	- trust can be referred from a developer you trust (that can read the code and audit)
	- trust per-version; ie cache the remote file and ONLY ever use the static copy, only **manually** updating to the new version from the source URL when the auto-checker detects an update, 
	- patch update **MUST** present a diff and changelog before user can accept. 
	- changelog must be > \~30 characters. 
	- to ensure transparency & readability, minified/obscured JS is **EXPLICITLY BANNED** and warn user if patches look obscured
		- statically analyse patches for:
			- short variable names or 
			- high characters per line
			- no/few comments
			- no whitespace after semicolons
			- total size (eg from concatenation or transpilation)
		- concatenation & minification will be performed by Mane anyway, and users will only be downloading one copy each anyway, so both user load times and patchmaker bandwidth concerns are minimal.
	- automatically use https://github.com/isomorphic-git/isomorphic-git for fetching if remote url is a repo, rather than a patch file

## distant roadmap
