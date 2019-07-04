const fs = require('fs');
const path = require('path');

const pkgUp = require('pkg-up');
const glob = require('glob');
const findUp = require('find-up');
const chalk = require('chalk');
const { get } = require('dot-prop');
const semver = require('semver');

const VERSION_REGEXP = /\[(\d*\.\d*\.\d*)]/g;

const read = (pathname) => () => new Promise((resolve, reject) =>
	fs.readFile(pathname, (err, data) => err ? reject(err) : resolve(data.toString())));

const globAsync = (search) => new Promise((resolve, reject) =>
	glob(search, {}, (err, files) => err ? reject(err) : resolve(files)));

const resolveJSON = async (cb) => {
	const raw = await cb();
	return JSON.parse(raw);
};

module.exports = async (options = {}) => {
	const pkgLocation = await pkgUp();
	const pkg = await resolveJSON(read(pkgLocation));

	if (!pkg.workspaces || !pkg.workspaces.length) {
		throw new Error('Yarn workspaces is required to use this tool.');
	}
	const files = await Promise.all(pkg.workspaces.map((w) => globAsync(w)));
	const packages = await Promise.all(files
		.reduce((acc, f) => {
			acc.push(...f);
			return acc;
		}, [])
		.map(async (f) => {
			const modulePkg = await pkgUp({ cwd: path.join(process.cwd(), f)});
			const moduleChangelog = await findUp('CHANGELOG.md', { cwd: path.join(process.cwd(), f) });

			const pkg = modulePkg.includes(f) ? await resolveJSON(read(modulePkg)) : {};
			const changelog = moduleChangelog ? await read(moduleChangelog)() : '';

			if (!changelog) {
				console.warn(chalk.yellow(`Package ${pkg.name} does not have a changelog.`));
			}

			return { pkg, changelog, modulePkg };
		}));

	return packages
		.filter(({ pkg }) => pkg.name)
		.map(({ pkg, changelog, modulePkg }) => {
			const version = {
				current: pkg.version,
				name: pkg.name,
				pkgPath: modulePkg,
				modulePath: modulePkg.replace('package.json', ''),
			};

			if (options.includePackage) {
				version.pkg = pkg;
			}

			const match = VERSION_REGEXP.exec(changelog);
			const latestVersion = get(match, '1', '');

			version.next = !latestVersion || latestVersion === version.current || semver.lt(latestVersion, version.current) ?
				undefined :
				latestVersion;

			return version;
		});
};
