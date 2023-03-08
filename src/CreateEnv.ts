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
};

export const addConfig = (cfg: object) => {
	for (const [name, value] of Object.entries(cfg)) Bot.Config[name] = value;
};

export {};
