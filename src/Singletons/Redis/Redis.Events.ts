import * as Events from './Data.Types.js';

export interface RedisEvents {
	connect: (Data: Events.IPubConnect) => void;
	banphrase: (Data: Events.IBanphrase) => void;
	settings: (data: Events.ISettings) => void;
}
