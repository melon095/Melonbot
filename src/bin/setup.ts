import fs from 'node:fs';
import { SQLController } from '../controller/DB/index.js';
import { token } from './../tools/tools.js';
import Path from 'node:path';
import ErrorHandler from './../ErrorHandler.js';
import { RedisSingleton } from './../Singletons/Redis/index.js';

(async () => {
	console.log('Reading config.json.');

	if (!fs.existsSync(Path.join(process.cwd() + '/config.json'))) {
		console.error(
			'config.json does not exist\nCopy config.example.json\nRename it to config.json\nAnd configure it!',
		);
		process.exit(-1);
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	global.Bot = {};
	Bot.HandleErrors = ErrorHandler;
	Bot.Config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json', 'utf-8'));
	Bot.SQL = SQLController.New();
	const migration = await Bot.SQL.RunMigration();
	console.log(`Migrated from version ${migration.OldVersion} to ${migration.NewVersion}`);

	Bot.Redis = RedisSingleton.Factory(Bot.Config.Redis.Address);
	await Bot.Redis.Connect();

	// Generate the bots auth token
	const t = await token.Bot();
	if (t.status === 'ERROR') {
		console.error(t.error);
		process.exit(-1);
	}

	console.log('Finished setting up.');
	process.exit();
})();
