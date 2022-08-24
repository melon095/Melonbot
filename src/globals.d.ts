/* eslint-disable no-var */
import Twitch from './Twitch.js';
import { SQLController } from './controller/DB/index.js';
import { CommandsHandler } from './controller/Commands/Handler.js';
import { TConfigFile, TStaticDataConfig } from './Typings/types';
import { SevenTVEvent } from './controller/Emote/SevenTV/EventAPI.js';
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
		Commands: CommandsHandler;
		HandleErrors: (Category: string, Err: Error, ...args: string[]) => void;
		ID: string;
	};
}
export {};
