import { promises as fs } from 'node:fs';
import { getDirname } from './../tools/tools.js';

async function getFiles(cwd: string) {
	const commandList = await fs.readdir(cwd);
	return commandList.filter((x) => !x.match(/\.js(\.map)?$/));
}

export default async function () {
	const cwd = getDirname(import.meta.url);

	const commandList = await getFiles(cwd);

	await Promise.all(
		commandList.map(async (command) => {
			return import(`./${command}/index.js`);
		}),
	);
}
