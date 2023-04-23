import fs from 'node:fs/promises';
import path from 'node:path';
import { TConfigFile } from '../Typings/types.js';

(async () => {
	/*Ignore error not containing required data*/
	// @ts-ignore
	global.Bot = {};
	// @ts-ignore
	Bot.Config = {};
	// // @ts-ignore
	// Bot.Config.Twitch = {};
	// // @ts-ignore
	// Bot.Config.SQL = {};

	const addConfig = (cfg: object) => {
		for (const [name, value] of Object.entries(cfg)) Bot.Config[name] = value;
	};

	const cfg: TConfigFile = JSON.parse(
		await fs.readFile(path.join(process.cwd() + '/config.json'), 'utf-8'),
	);

	addConfig(cfg);

	await (await import('../CreateEnv.js')).Setup.All('WEB');
	await import('../web/index.js');
})();
