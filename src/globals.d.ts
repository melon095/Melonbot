/* eslint-disable no-var */
import { Helix, TConfigFile, TStaticDataConfig } from './Typings/types';
import { ErrorFunction } from './ErrorHandler.js';
import { Logger } from './logger.js';

import User from './controller/User/index.js';

import { RedisSingleton } from './Singletons/Redis/index.js';
import { RedisEvents } from './Singletons/Redis/Redis.Events.js';

export declare interface RS extends RedisSingleton {
	on<U extends keyof RedisEvents>(event: U, listener: RedisEvents[U]): ThisParameterType;
}

type TGlobalConfig = TConfigFile & {
	[key: string]: string | boolean | number;
	StaticData: TStaticDataConfig;
};

declare global {
	var Bot: {
		Config: TGlobalConfig;
		SQL: import('./controller/DB/index.js').SQLController;
		Redis: RS;
		Twitch: {
			Controller: import('./Twitch.js').default;
			Emotes: {
				SevenTVEvent: import('./controller/Emote/SevenTV/EventAPI.js').SevenTVEvent;
			};
		};
		User: typeof User;
		Commands: import('./controller/Commands/Handler.js').CommandsHandler;
		ID: string;
		Log: Logger;
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
		export type timers = import('./Typings/models/bot/timers').default;
	}
}

export {};
