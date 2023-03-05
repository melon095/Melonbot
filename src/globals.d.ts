/* eslint-disable no-var */
import { Helix, TConfigFile, TStaticDataConfig } from './Typings/types';
import { ErrorFunction } from './ErrorHandler.js';
import { Logger } from './logger.js';

import User from './controller/User/index.js';

import { RedisSingleton } from './Singletons/Redis/index.js';
import { RedisEvents } from './Singletons/Redis/Redis.Events.js';
import { Kysely } from 'kysely';
import { KyselyDB } from './controller/DB/index.js';

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
		SQL: KyselyDB;
		Redis: RS;
		Twitch: {
			Controller: import('./Twitch.js').default;
			Emotes: {
				SevenTVEvent: import('./controller/Emote/SevenTV/EventAPI.js').SevenTVEvent;
			};
		};
		User: typeof User;
		ID: string;
		Log: Logger;
	};
}

export {};
