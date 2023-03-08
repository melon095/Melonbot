import { IEventSubHandler } from './Base.js';
import { IPubConnect } from '../Data.Types.js';

export default {
	Type: () => 'connect',
	Log: ({ Version }) => Bot.Log.Info('Connected to EventSub Broker %s', Version),
} as IEventSubHandler<IPubConnect>;
