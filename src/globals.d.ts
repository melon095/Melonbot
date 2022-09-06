/* eslint-disable no-var */
import Twitch from './Twitch.js';

import { SQLController } from './controller/DB/index.js';
import { CommandsHandler } from './controller/Commands/Handler.js';
import { TConfigFile, TStaticDataConfig } from './Typings/types';
import { SevenTVEvent } from './controller/Emote/SevenTV/EventAPI.js';
import HandleErrors from './ErrorHandler.js';

import User from './controller/User/index.js';

import { RedisSingleton } from './Singletons/Redis/index.js';
import { RedisEvents } from './Singletons/Redis/Redis.Events.js';

declare interface RS extends RedisSingleton {
	on<U extends keyof RedisEvents>(event: U, listener: RedisEvents[U]): ThisParameterType;

	// emit<U extends keyof RedisEvents>(
	// 	event: U,
	// 	...args: Parameters<RedisEvents[U]>
	// ): boolean;
}

interface TGlobalConfig extends TConfigFile {
	[key: string]: string | boolean | number;
	StaticData: TStaticDataConfig;
}

declare global {
	var Bot: {
		Config: TGlobalConfig;
		SQL: SQLController;
		Redis: RS;
		Twitch: {
			Controller: Twitch;
			Emotes: {
				SevenTVEvent: SevenTVEvent;
			};
		};
		User: typeof User;
		Commands: CommandsHandler;
		HandleErrors: typeof HandleErrors;
		ID: string;
	};
	declare namespace Database {
		export type banphrases = import('./Typings/models/bot/index').banphrases;
		export type banphrase_type = import('./Typings/models/bot/index').banphrase_type;
		export type channels = import('./Typings/models/bot/index').channels;
		export type commands = import('./Typings/models/bot/index').commands;
		export type error_logs = import('./Typings/models/bot/index').error_logs;
		export type migration = import('./Typings/models/bot/index').migration;
		export type suggestions = import('./Typings/models/bot/index').suggestions;
		export type trivia = import('./Typings/models/bot/index').trivia;
		export type users = import('./Typings/models/bot/index').users;
		export type UserRole = import('./Typings/models/bot/index').UserRole;
		export type commands_execution = import('./Typings/models/logs/index').commands_execution;
		export type web_requests = import('./Typings/models/logs/index').web_request;
	}
}

export {};
