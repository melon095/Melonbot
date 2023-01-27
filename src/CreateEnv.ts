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
		Bot.Commands = new CommandsHandler();
		await Bot.Commands.initialize().catch(() => {
			process.exit();
		});

		Bot.User = User;

		return;
	},

	Bot: async () => {

	},
};

export const addConfig = (cfg: object) => {
	for (const [name, value] of Object.entries(cfg)) Bot.Config[name] = value;
};

export {};
