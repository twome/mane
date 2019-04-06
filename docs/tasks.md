- BUG: changing moduleScope.patches at all fucks up because getAllPatches doesn't check for diffs before using caches

- BUG: truncated-name patch assets are getting duplicated

- implement assets properly

- ensure asset paths are present in responded patches

- optionally write patches as a folder, so the the assets can reference sibling images etc within the folder

- switch to Deno for extremely easy user installation

- [potential security risk]: extension can directly fetch remote files or use a JS git implementation to directly check out repos

- minimal memory/cpu footprint executable; boot on load
	- initially only accessible via process table `ps -e`

- maybe use BrowserFS to keep track of asset files? https://github.com/jvilk/BrowserFS


## security/trust

We can't easily do any permissions restrictions or granularity (we could try and provide a whitelist of global-object properties to the patches, but that's fraught with risk), so users must either COMPLETELY trust a patch's author or audit the patch themselves (if they can read the code).

- remote URLs
	- manually trust domain AND trust specific pathname (ie file) -> trust can be referred from a developer you trust (that can read the code and audit)
	- trust per-version; ie copy the remote file and ONLY ever use the static copy, only manually updating from the source URL when the auto-checker detects an update. present a diff and changelog
		- automatically use https://github.com/isomorphic-git/isomorphic-git for this if remote url is a repo, rather than a patch file




## long term

- make every patch its own domain-specific WebExtension (shows up only in the url bar) and write a federated repo server to share .ctx files