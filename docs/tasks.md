# tasks / bugs

Key: BUG, FEAT (new feature), or DEBT (technical debt)

- BUG 1: enabling/disabling patches in ext says "saved to disk" but on reopening popup, nothings changed

- BUG 1: NewPatch updateVm incorrectly setting 'create' btn validity

- BUG 1: cache keeps showing patch unless ALL assets are deleted

- FEAT 1: specify the active matcher in server res

- BUG 1: changing cache.patches at all fucks up because getAllPatches doesn't check for diffs before using caches

- FEAT 1: proper icon

- BUG 1: new patch tries to write to the whole dir!! (fixed?)



- FEAT 2: long-term storage of patches in browser to save FS reads and then you'd only need to run the native to refresh them

- FEAT 2: maybe use BrowserFS to keep track of (and store) asset files in extension? https://github.com/jvilk/BrowserFS

- FEAT 2: on server start, recurse all dirs with lstat, find any news or last-modifieds later than the last cache date. add them to the invalids list.

- FEAT 2: add app-settings.json into patches folder, for the native & all extensions

- FEAT 2: Use instructions to boot-launch https://github.com/Teamwork/node-auto-launch

- FEAT 2: make the injector wait until DOMContentLoaded to write the dep-invocations

- FEAT 2: grey out the checkbox to make a preexisting asset with the exact same matchlist

- FEAT 2: allow colons in matchers
	- must separate the IDs and asset filenames?
	- replace `:` with `_` in filenames
	- indicator `-renamed---`
	- use special comment to write matchlist in file

- DEBT 2: implement assets properly

- DEBT 2: extension should parallel-load all scripts and bodies before injecting dep-invocations

	- can't they just reference any other file in the patches folder?

	SECURITY: obvious issues

- FEAT 2: minimal memory/cpu footprint executable; boot on load
	- initially only accessible via process table `ps -e`?

- FEAT 2: use native communication instead of HTTP between server and extension

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

- BUG 3: bundle Inconsolata and Inter UI fonts

- FEAT 3: configuration using a CLI arguments library + dotenv

- FEAT 3: ext: if we're trying to create the exact same matchList and asset type as an existing patch, flash that asset indicator in the matching patches section

- FEAT 3: optionally write patches as a folder, so the the assets can reference sibling images etc within the folder

- FEAT 3: extension can directly fetch remote files or use a JS git implementation to directly check out repos

- FEAT 3: executable or CL arg to back up all patches into json
	- export to UJS&CSS, GreaseMonkey etc formats

- FEAT 3: save the urls / metadata of remote patches as a JSON file
	- MUST forewarn users of danger of remote patches



## security/trust

We can't easily do any permissions restrictions or granularity (we could try and provide a whitelist of global-object properties to the patches, but that's fraught with risk), so users must either COMPLETELY trust a patch's author or audit the patch themselves (if they can read the code).

- remote URLs
	- user must manually trust domain AND trust specific pathname (ie hopefully file) 
	- trust can be referred from a developer you trust (that can read the code and audit)
	- trust per-version; ie cache the remote file and ONLY ever use the static copy, only **manually** updating to the new version from the source URL when the auto-checker detects an update, 
	- patch update **MUST** present a diff and changelog before user can accept. 
	- changelog must be > ~30 characters. 
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
