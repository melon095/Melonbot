import fs from 'node:fs/promises';
import path from 'node:path';
import { TConfigFile } from '../Typings/types.js';

(async () => {
	/*Ignore error not containing required data*/
	// @ts-ignore
	global.Bot = {};
	// @ts-ignore
	Bot.Config = {};

	// Import and load config before anything is imported
	const addConfig = (cfg: object) => {
		Object.assign(Bot.Config, cfg);
	};

	const cfg: TConfigFile = JSON.parse(
		await fs.readFile(path.join(process.cwd() + '/config.json'), 'utf-8'),
	);

	addConfig(cfg);

	const { Setup } = await import('../CreateEnv.js');

	//do something when app is closing
	process.on('exit', exitHandler.bind(null));

	//catches ctrl+c event
	process.on('SIGINT', exitHandler.bind(null));

	// catches "kill pid" (for example: nodemon restart)
	process.on('SIGUSR1', exitHandler.bind(null));
	process.on('SIGUSR2', exitHandler.bind(null));

	process.on('unhandledRejection', async (err, promise) => {
		console.error('Unhandled rejection', { err, promise });
	});

	Setup.All('BOT').then(() => Setup.Bot());

	async function exitHandler(): Promise<void> {
		await Bot.SQL.destroy();
	}
})();
