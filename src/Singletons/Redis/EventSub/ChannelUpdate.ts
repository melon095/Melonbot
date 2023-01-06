import { IEventSubHandler } from './Base.js';
import { IPubChannelUpdate } from './../Data.Types.js';
import TimerSingleton from './../../Timers/index.js';
import { Logger } from './../../../logger.js';

/*
    This is only triggered on title changes.
*/

export default {
	Type: () => 'channel.update',
	Log: (logger, { broadcaster_user_login, title }) =>
		logger.Info('[%s] Updated their title to: %s', broadcaster_user_login, title),
	Handle: async ({ broadcaster_user_id, title }) => {
		const timers = await TimerSingleton.I().GetTimers(broadcaster_user_id);

		if (timers.size === 0) {
			return;
		}

		for (const timer of timers.values()) {
			timer.OnTitleChange(title);
		}
	},
} as IEventSubHandler<IPubChannelUpdate>;
