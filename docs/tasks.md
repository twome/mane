- BUG: attach options from options.json at the end of getAllPatches

- FEAT: ext: if we're trying to create the exact same matchList and asset type as an existing patch, flash that asset indicator in the matching patches section

- BUG: cache keeps showing patch unless ALL assets are deleted

- FEAT: disable/enable patches from ext

- FEAT: open patches dir

- FEAT: allow colons in matchers
	- must separate the IDs and asset filenames?
	- replace : with _ in filenames
	- indicator -renamed---
	- use special comment to write matchlist in file

- FEAT: specify the active matcher

- BUG: changing cache.patches at all fucks up because getAllPatches doesn't check for diffs before using caches

- FEAT: proper icon

- DEBT: pass a single config object down the line of each function call rather than these unwieldy duplicated argument objects

- DEBT: implement assets properly

- DEBT: extension should parallel-load all scripts and bodies before injecting dep-invocations

- FEAT: optionally write patches as a folder, so the the assets can reference sibling images etc within the folder

- FEAT: switch to Deno for extremely easy user installation

- FEAT: extension can directly fetch remote files or use a JS git implementation to directly check out repos
	SECURITY: obvious issues

- FEAT: minimal memory/cpu footprint executable; boot on load
	- initially only accessible via process table `ps -e`?

- FEAT: use native communication instead of HTTP between server and extension

- FEAT: maybe use BrowserFS to keep track of (and store) asset files in extension? https://github.com/jvilk/BrowserFS

- FEAT: long-term storage of patches in browser 

- FEAT: set patch storage dir from server CL arg & extension popup

- FEAT: executable or CL arg to back up all patches into json
	- export to UJS&CSS, GreaseMonkey etc formats

- FEAT: save the urls / metadata of remote patches as a JSON file
	- MUST forewarn users of danger of remote patches

## extension

contentScripts API to register patches at runtime (instead of modifying <head>)
	- pro: only interference with user page is from patch itself
	- pro: faster loading / load asynchronously?
	- con: security hazard from patches having greater power?

pageAction to only show up in address bar when active

## security/trust

We can't easily do any permissions restrictions or granularity (we could try and provide a whitelist of global-object properties to the patches, but that's fraught with risk), so users must either COMPLETELY trust a patch's author or audit the patch themselves (if they can read the code).

- remote URLs
	- manually trust domain AND trust specific pathname (ie file) -> trust can be referred from a developer you trust (that can read the code and audit)
	- trust per-version; ie copy the remote file and ONLY ever use the static copy, only manually updating from the source URL when the auto-checker detects an update. present a diff and changelog
		- automatically use https://github.com/isomorphic-git/isomorphic-git for this if remote url is a repo, rather than a patch file

## long term

- make every patch its own domain-specific WebExtension (shows up only in the url bar) and write a federated repo server to share .ctx files