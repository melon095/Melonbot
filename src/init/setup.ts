import fs from 'node:fs';
import { SQLController } from '../controller/DB/index.js';
import { token, Sleep } from './../tools/tools.js';
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
	Bot.Config = JSON.parse(
		fs.readFileSync(process.cwd() + '/config.json', 'utf-8'),
	);
	Bot.SQL = await SQLController.getInstanceAsync();
	Bot.Redis = RedisSingleton.Factory(Bot.Config.Redis.Address);
	await Bot.Redis.Connect();

	for (const folder of [`${process.cwd()}/stats`, `${process.cwd()}/logs`]) {
		fs.mkdir(folder, (err) => {
			console.log(`Creating folder ${folder}`);
			if (err) {
				if (err.code === 'EEXIST') return;
				console.error(err);
			}
		});
	}

	// Setup database
	const version = (
		await Bot.SQL.promisifyQuery<{ v: string }>('SELECT VERSION() AS v')
	).SingleOrNull();
	if (version === null) {
		console.error('Database is missing critical function VERSION().');
		process.exit(-1);
	}

	version.v = version.v.split('-')[0];

	if (Number(version.v) < Number('10.3.30')) {
		console.error(
			`Mariadb server version is too old at ${version.v}. Please upgrade to atleast version 10.3.30 or higher.`,
		);
		process.exit(-1);
	}

	const migration = await Bot.SQL.RunMigration();
	console.log(
		`Migrated from version ${migration.OldVersion} to ${migration.NewVersion}`,
	);

	Bot.SQL.setDatabase();

	// Generate the bots auth token
	const t = await token.Bot();
	if (t.status === 'ERROR') {
		console.error(t.error);
		process.exit(-1);
	}

	console.log('Finished setting up.');
	process.exit();
})();
