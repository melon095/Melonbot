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
import { Channel, GetSettings } from './controller/Channel/index.js';
import { NChannelFunctions, Sleep } from './tools/tools.js';
import { RedisSingleton } from './Singletons/Redis/index.js';
import * as tools from './tools/tools.js';
import User from './controller/User/index.js';
import TimerSingleton from './Singletons/Timers/index.js';

type ProcessType = 'BOT' | 'WEB';

export const Setup = {
	All: async (Process: ProcessType): Promise<void> => {
		process.env.TYPE = Process;

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

		await TimerSingleton.I().Initialize();

		await Bot.Twitch.Controller.InitPromise;

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
				let mode = NChannelFunctions.DatabaseToMode(channel.bot_permission);
				const user = await Bot.User.Get(channel.user_id, channel.name);
				let doEventsub = true;

				console.log(`#Twitch Joining ${channel.name}`);
				try {
					await twitch.client.join(channel.name);
				} catch (error) {
					Bot.HandleErrors(`Joining ${channel.name}`, error);
					mode = 'Read'; // We want to create a channel object, but since we can't join, we set the mode to read
					doEventsub = false;
				}
				const newChannel = await Channel.New(user, mode, channel.live);

				if (doEventsub) {
					const emote_set = await GetSettings(user).then(
						(settings) => settings.SevenTVEmoteSet.ToString() ?? undefined,
					);

					await Channel.WithEventsub(newChannel, emote_set);
				}

				twitch.channels.push(newChannel);

				await Sleep(Bot.Config.Verified ? 0.025 : 1);
			}
		}

		// Spawn loops after everything is setup
		await import('./loops/loops.js');
	},
};

export const addConfig = (cfg: object) => {
	for (const [name, value] of Object.entries(cfg)) Bot.Config[name] = value;
};

export {};
