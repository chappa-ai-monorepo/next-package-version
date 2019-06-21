# Next Package Version

Get the next version of each yarn workspace based on the newest changelog entries. `next-package-version` assumes that you're running with a monorepo powered by yarn workspaces.

## Usage
```
yarn add next-package-version
```

```js
const nextPkgVersion = require('next-package-version');

(async () => {
	const versions = await nextPkgVersion();
})();
```