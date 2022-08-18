import fs from 'node:fs';
import fsPromise from 'node:fs/promises';
import { SQLController } from '../controller/DB/index.js';
import axios from 'axios';
import Path from 'node:path';

(async () => {
	console.log('Reading config.json.');

	if (!fs.existsSync(Path.join(process.cwd() + '/config.json'))) {
		console.error(
			'config.json does not exist\nCopy config.example.json\nRename it to config.json\nAnd configure it!',
		);
		process.exit(-1);
	}

	async function sleep(): Promise<void> {
		return new Promise((Resolve) => {
			setTimeout(() => {
				Resolve();
			}, 1000);
		});
	}
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	global.Bot = {};
	Bot.Config = JSON.parse(
		fs.readFileSync(process.cwd() + '/config.json', 'utf-8'),
	);
	Bot.SQL = await SQLController.getInstanceAsync();

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
	let v = (
		await Bot.SQL.promisifyQuery<{ v: string }>('SELECT VERSION() AS v')
	).SingleOrNull();
	if (v === null) {
		console.error('Database is missing critical function VERSION().');
		process.exit(-1);
	}

	v.v = v.v.split('-')[0];

	if (Number(v.v) < Number('10.3.30')) {
		console.error(
			`Mariadb server version is too old at ${v.v}. Please upgrade to atleast version 10.3.30 or higher.`,
		);
		process.exit(-1);
	}

	const sql = fs.readFileSync('./init.sql', 'utf-8').split(/\r?\n/);
	for (let i = 0; i < sql.length; i++) {
		try {
			console.log(`Creating table number ${i}`);
			Bot.SQL.query(sql[i]);
			await sleep();
		} catch (error) {
			console.log(error);
			fs.writeFileSync(
				'INIT_DATABASE_ERROR.txt',
				`ERROR INITIALIZING TABLES ERROR: \r\n${error}`,
			);
			process.exit(-1);
		}
	}

	Bot.SQL.setDatabase();

	console.log("Acquiring the bot's access token");

	const { data } = await axios(
		`https://api.ivr.fi/twitch/resolve/${Bot.Config.BotUsername}`,
		{
			method: 'GET',
			headers: { accept: 'application/json' },
		},
	);
	const id = data.id;

	const scopes: string[] = [
		'channel:manage:broadcast',
		'moderation:read',
		'whispers:read',
		'chat:read',
		'chat:edit',
		'channel:moderate',
	];

	// https://dev.twitch.tv/docs/authentication // App access token
	// Generate the bots auth token
	const token = await axios(
		`https://id.twitch.tv/oauth2/token?client_id=${
			Bot.Config.Twitch.ClientID
		}&client_secret=${
			Bot.Config.Twitch.ClientSecret
		}&grant_type=client_credentials&scope=${scopes.join(' ')}`,
		{
			method: 'POST',
			headers: {
				accept: 'application/json',
			},
		},
	)
		.then((res) => res.data)
		.then((data) => {
			return { access: data.access_token, expires: data.expires_in };
		})
		.catch((err) => {
			console.error(err);
			process.exit(-1);
		});

	const date = new Date();
	date.setDate(date.getDate() + Math.floor(token.expires / (3600 * 24)));
	const ISO = date.toISOString().slice(0, 19).replace('T', ' ');
	console.log('Saving config.json to database config table.');

	await Bot.SQL.promisifyQuery(
		'INSERT IGNORE INTO config VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		[
			1,
			Bot.Config.Twitch.ClientID,
			Bot.Config.Twitch.ClientSecret,
			Bot.Config.Twitch.OAuth,
			token.access,
			Bot.Config.Website.WebUrl,
			Bot.Config.BotUsername,
			Bot.Config.OwnerUserID,
			id,
			ISO,
		],
	);

	console.log('Finished setting up.');
	process.exit();
})();
