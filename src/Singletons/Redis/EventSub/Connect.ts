import { IEventSubHandler } from './Base.js';
import { IPubConnect } from 'Singletons/Redis/Data.Types.js';

export default {
	Type: () => 'connect',
	Log: (logger, { Version }) => logger.Info('Connected to EventSub Broker %s', Version),
} as IEventSubHandler<IPubConnect>;
