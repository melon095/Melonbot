import { IEventSubHandler } from './Base.js';
import { IPubFollow } from './../Data.Types.js';

const CHINESE_REGEX = /\p{sc=Han}/u;

export default {
	Type: () => 'channel.follow',
	Log: (logger, message) => logger.Info('Follow Event %O', message),
	Handle: (message, logger) => {
		const channel = Bot.Twitch.Controller.TwitchChannelSpecific({
			ID: message.broadcaster_user_id,
		});

		if (!channel) {
			logger.Error('No channel found %O', message);
			return;
		}

		const thankFn = async (name: string) => {
			const message = (await channel?.GetSettings()).FollowMessage.ToString() ?? '';

			channel.say(message.replace(/{{name}}/g, name));
		};

		if (CHINESE_REGEX.test(message.user_name)) {
			thankFn?.(message.user_login);
		} else {
			thankFn?.(message.user_name);
		}
	},
} as IEventSubHandler<IPubFollow>;
