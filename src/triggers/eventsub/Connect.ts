import { IEventSubHandler } from './Base.js';
import { IPubConnect } from 'Singletons/Redis/Data.Types.js';

export default {
	Type: () => 'connect',
	Handle: ({ Version }: IPubConnect) => {
		console.log('Connected to EventSub server', {
			Version,
		});
	},
} as IEventSubHandler<IPubConnect>;
