import { IEventSubHandler } from './Base.js';
import { IPubFollow } from './../Data.Types.js';

const CHINESE_REGEX = /\p{sc=Han}/u;

export default {
	Type: () => 'channel.follow',
	Log: (message: IPubFollow) => console.log('Follow Event', message),
	Handle: (message: IPubFollow) => {
		const chl = Bot.Twitch.Controller.TwitchChannelSpecific({
			ID: message.broadcaster_user_id,
		});

		if (!chl) {
			console.warn('EventSub.Follow: Channel not found', {
				message,
			});
			return;
		}

		const thankFn = chl.ModerationModule?.ThankFollow;

		if (CHINESE_REGEX.test(message.user_name)) {
			thankFn?.(message.user_login);
		} else {
			thankFn?.(message.user_name);
		}
	},
} as IEventSubHandler<IPubFollow>;
