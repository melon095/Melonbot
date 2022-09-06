/* eslint-disable @typescript-eslint/ban-ts-comment */
/*Ignore error not containing required data*/
// @ts-ignore
global.Bot = {};
// @ts-ignore
Bot.Config = {};
// @ts-ignore
Bot.Config.Twitch = {};
// @ts-ignore
Bot.Config.SQL = {};

import { SQLController } from './controller/DB/index.js';
import Twitch from './Twitch.js';
import { TConfigFile } from './Typings/types';
import { exit } from 'node:process';
import { CommandsHandler } from './controller/Commands/Handler.js';
import { SevenTVEvent } from './controller/Emote/SevenTV/EventAPI.js';
import fs from 'node:fs';
import path from 'node:path';
import ErrorHandler from './ErrorHandler.js';
// import { PM2FILENAME } from './commands/git.js';
import { Channel } from './controller/Channel/index.js';
import { NChannelFunctions, Sleep } from './tools/tools.js';
import { RedisSingleton } from './Singletons/Redis/index.js';
import * as tools from './tools/tools.js';
import User from './controller/User/index.js';

export const Setup = {
	All: async (): Promise<void> => {
		process.on('uncaughtException', function (exception) {
			console.error(exception);
			process.exitCode = -1;
			exit();
		});

		Bot.Config.StaticData = {
			messageEvasionCharacter: '\u{E0000}',
		};
		const cfg: TConfigFile = JSON.parse(
			fs.readFileSync(path.join(process.cwd() + '/config.json'), 'utf-8'),
		);
		addConfig(cfg);
		Bot.HandleErrors = ErrorHandler;
		Bot.SQL = SQLController.New();
		const migrationVersion = await Bot.SQL.RunMigration().catch((error) => {
			console.error(error);
			process.exit(-1);
		});
		if (migrationVersion.NewVersion > migrationVersion.OldVersion) {
			console.log(
				`Migrated from version ${migrationVersion.OldVersion} to ${migrationVersion.NewVersion}`,
			);
		}
		await import('./SevenTVGQL.js')
			.then((module) => module.default)
			.then((module) => {
				module.setup();
			});

		const redis = RedisSingleton.Factory(Bot.Config.Redis.Address);

		if (redis instanceof Error) {
			console.error(redis);
			process.exit(-1);
		}

		await redis.Connect();

		Bot.Redis = redis;
		Bot.Commands = new CommandsHandler();
		await Bot.Commands.initialize().catch(() => {
			process.exit();
		});

		Bot.User = User;

		return;
	},

	Bot: async () => {
		// Twitch Specific Config
		if (!(await tools.token.Bot()).token) {
			console.error('Missing Twitch Config');
			process.exit(-1);
		}
		// Create Twitch objects
		Bot.Twitch = {
			Controller: await Twitch.Init(),
			Emotes: {
				SevenTVEvent: new SevenTVEvent(),
			},
		};
		Bot.Twitch.Controller.InitPromise.then(async () => {
			// Run once connected to twitch
			const twitch = Bot.Twitch.Controller;

			Bot.Twitch.Emotes.SevenTVEvent.Connect();

			const self = await Channel.CreateBot();

			await twitch.client.join(Bot.Config.BotUsername);
			twitch.channels.push(self);

			// Join all channels
			const channelList = await Bot.SQL.Query<Database.channels[]>`
                SELECT * FROM channels 
                WHERE name NOT LIKE ${Bot.Config.BotUsername}`;

			if (channelList.length) {
				for (const channel of channelList) {
					console.log(`#Twitch Joining ${channel.name}`);
					await twitch.client
						.join(channel.name)
						.catch((err: string) => console.error(err));

					const mode = NChannelFunctions.DatabaseToMode(channel.bot_permission);
					const user = await Bot.User.Get(channel.user_id, channel.name);

					let newChannel = await Channel.New(user, mode, channel.live);
					newChannel = await Channel.WithEventsub(
						newChannel,
						channel.seventv_emote_set ?? undefined,
					);
					twitch.channels.push(newChannel);

					await Sleep(Bot.Config.Verified ? 0.025 : 1);
				}
			}

			// git | reset command specific
			// if (fs.existsSync(PM2FILENAME)) {
			// 	const controller = Bot.Twitch.Controller;
			// 	controller.client.say(
			// 		`#${controller.owner}`,
			// 		'SeemsGood Restarted!',
			// 	);

			// 	fs.unlinkSync(PM2FILENAME);
			// }
		});
	},
};

export const addConfig = (cfg: object) => {
	for (const [name, value] of Object.entries(cfg)) Bot.Config[name] = value;
};

export {};
