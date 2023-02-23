import * as Events from './Data.Types.js';

export interface RedisEvents {
	connect: (Data: Events.IPubConnect) => void;
}
