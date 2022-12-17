import { IEventSubHandler } from './Base.js';
import { IPubChannelUpdate } from './../Data.Types.js';
import TimerSingleton from './../../Timers/index.js';

/*
    This is only triggered on title changes.
*/

export default {
	Type: () => 'channel.update',
	Log: ({ broadcaster_user_login, title }: IPubChannelUpdate) =>
		console.log(`[${broadcaster_user_login}] Updated their title to: ${title}`),
	Handle: async ({ broadcaster_user_id, title }: IPubChannelUpdate) => {
		const channel = Bot.Twitch.Controller.TwitchChannelSpecific({
			ID: broadcaster_user_id,
		});

		if (!channel) {
			console.warn('EventSub.ChannelUpdate: Channel not found', {
				broadcaster_user_id,
			});
			return;
		}

		const timers = await TimerSingleton.I().GetTimers(broadcaster_user_id);

		if (timers.size === 0) {
			return;
		}

		for (const timer of timers.values()) {
			timer.OnTitleChange(title);
		}
	},
} as IEventSubHandler<IPubChannelUpdate>;
