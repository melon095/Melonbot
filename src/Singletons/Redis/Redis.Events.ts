import * as Events from './Data.Types.js';

export interface RedisEvents {
	connect: (Data: Events.IPubConnect) => void;
	'channel.moderator.add': (Data: Events.IPubModAdd) => void;
	'channel.moderator.remove': (Data: Events.IPubModAdd) => void;
	'channel.follow': (Data: Events.IPubFollow) => void;
	banphrase: (Data: Events.IBanphrase) => void;
	settings: (data: Events.ISettings) => void;
}
