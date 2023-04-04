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

import CreateDatabaseConnection, { DoMigration } from './controller/DB/index.js';
import Twitch from './Twitch.js';
import { TConfigFile } from './Typings/types';
import { exit } from 'node:process';
import { StoreToDB } from './controller/Commands/Handler.js';
import fs from 'node:fs';
import path from 'node:path';
import ErrorHandler from './ErrorHandler.js';
import { Channel } from './controller/Channel/index.js';
import { Sleep } from './tools/tools.js';
import { RedisSingleton } from './Singletons/Redis/index.js';
import * as tools from './tools/tools.js';
import User from './controller/User/index.js';
import TimerSingleton from './Singletons/Timers/index.js';
import logger from './logger.js';
import SevenTVGQL from './SevenTVGQL.js';
import {
	ChannelDatabaseToMode,
	PermissionModeToDatabase,
} from './controller/DB/Tables/ChannelTable.js';
import type { ProcessType } from './globals.js';

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
		Bot.SQL = CreateDatabaseConnection();
		await DoMigration(Bot.SQL);

		SevenTVGQL.setup(Bot.Config.SevenTV.Bearer);

		const redis = RedisSingleton.Get(Bot.Config.Redis.Address);

		if (redis instanceof Error) {
			Bot.Log.Error(redis, 'Failed to connect to Redis');
			process.exit(-1);
		}

		await redis.Connect();

		Bot.Redis = redis;

		const commandLoader = await import('./commands/index.js');
		await commandLoader.default();
		await StoreToDB();

		Bot.User = User;

		return;
	},

	Bot: async () => {
		// Twitch Specific Config
		await tools.GetOrGenerateBotToken();

		// Create Twitch objects
		Bot.Twitch = {
			Controller: await Twitch.Init(),
		};

		await TimerSingleton.I().Initialize();

		await Bot.Twitch.Controller.InitPromise;
		const twitch = Bot.Twitch.Controller;

		const self = await Channel.CreateBot();

		await twitch.client.join(Bot.Config.BotUsername);
		twitch.channels.push(self);

		const channels = await Bot.SQL.selectFrom('channels')
			.selectAll()
			.where('bot_permission', '!=', PermissionModeToDatabase('Bot'))
			.execute();

		for (const channel of channels) {
			let mode = ChannelDatabaseToMode(channel.bot_permission);
			const user = await Bot.User.Get(channel.user_id, channel.name);

			Bot.Log.Info(`Twitch Joining %s`, channel.name);
			try {
				await twitch.client.join(channel.name);
			} catch (error) {
				Bot.Log.Error(error as Error, `Joining ${channel.name}`);
				mode = 'Read'; // We want to create a channel object, but since we can't join, we set the mode to read
			}
			const newChannel = await Channel.New(user, mode, channel.live);

			twitch.channels.push(newChannel);

			await Sleep(Bot.Config.Verified ? 0.025 : 1);
		}

		// Spawn loops after everything is setup
		await import('./loops/loops.js');
	},
};

export const addConfig = (cfg: object) => {
	for (const [name, value] of Object.entries(cfg)) Bot.Config[name] = value;
};

export {};
