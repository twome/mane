- BIG: changing moduleScope.patches at all fucks up because getAllPatches doesn't check for diffs before using caches

- ensure asset paths are present in responded patches

- fs-write save in reverse domain order? au.com.google etc?

- optionally write patches as a folder, so the the assets can reference sibling images etc within the folder

- switch to Deno for extremely easy user installation

- [potential security risk]: extension can directly fetch remote files or use a JS git implementation to directly check out repos

- minimal memory/cpu footprint executable; boot on load
	- initially only accessible via process table `ps -e`