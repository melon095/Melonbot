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
import logger from './logger.js';
import SevenTVGQL from './SevenTVGQL.js';

type ProcessType = 'BOT' | 'WEB';

export const Setup = {
	All: async (Process: ProcessType): Promise<void> => {
		process.env.TYPE = Process;
		Bot.Log = logger(Process, ErrorHandler);

		process.on('uncaughtException', function (exception) {
			if (exception instanceof Error) {
				Bot.Log.Error(exception, 'Uncaught Exception');
			} else {
				Bot.Log.Error('Uncaught Exception %O', exception);
			}

			exit();
		});

		Bot.Config.StaticData = {
			messageEvasionCharacter: '\u{E0000}',
		};
		const cfg: TConfigFile = JSON.parse(
			fs.readFileSync(path.join(process.cwd() + '/config.json'), 'utf-8'),
		);
		addConfig(cfg);
		Bot.SQL = SQLController.New();
		const migrationVersion = await Bot.SQL.RunMigration().catch((error) => {
			Bot.Log.Error(error, 'Migration Error');
			exit();
		});
		if (migrationVersion.NewVersion > migrationVersion.OldVersion) {
			Bot.Log.Info(
				'Migrated from version %d to %d',
				migrationVersion.OldVersion,
				migrationVersion.NewVersion,
			);
		}

		SevenTVGQL.setup(Bot.Config.SevenTV.Bearer);

		const redis = RedisSingleton.Get(Bot.Config.Redis.Address);

		if (redis instanceof Error) {
			Bot.Log.Error(redis, 'Failed to connect to Redis');
			process.exit(-1);
		}

		await redis.Connect();

		Bot.Redis = redis;
		Bot.Commands = new CommandsHandler(Bot.Log);
		await Bot.Commands.initialize().catch(() => {
			process.exit();
		});

		Bot.User = User;

		return;
	},

	Bot: async () => {
		// Twitch Specific Config
		if (!(await tools.token.Bot()).token) {
			Bot.Log.Error('Missing Twitch Config');
			process.exit(-1);
		}
		// Create Twitch objects
		Bot.Twitch = {
			Controller: await Twitch.Init(Bot.Log.WithCategory('Twitch')),
			Emotes: {
				SevenTVEvent: new SevenTVEvent(Bot.Log.WithCategory('7TV Websocket')),
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
				Bot.Log.Info(`Twitch Joining %s`, channel.name);
				try {
					await twitch.client.join(channel.name);
				} catch (error) {
					Bot.Log.Error(error as Error, `Joining ${channel.name}`);
					continue;
				}

				const mode = NChannelFunctions.DatabaseToMode(channel.bot_permission);
				const user = await Bot.User.Get(channel.user_id, channel.name);

				const newChannel = await Channel.New(user, mode, channel.live);

				const emote_set = await GetSettings(user).then(
					(settings) => settings.SevenTVEmoteSet.ToString() ?? undefined,
				);

				await Channel.WithEventsub(newChannel, emote_set);

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
