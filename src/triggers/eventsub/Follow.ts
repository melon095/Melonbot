import { IEventSubHandler } from './Base.js';
import { IPubFollow } from './../../Singletons/Redis/Data.Types.js';

export default {
	Type: () => 'channel.follow',
	Log: (message: IPubFollow) => console.log('Follow Event', message),
	Handle: (message: IPubFollow) => {
		const chl = Bot.Twitch.Controller.channels.find(
			(c) => c.Id === message.broadcaster_user_id,
		);

		if (!chl) {
			console.warn('EventSub.Follow: Channel not found', {
				message,
			});
			return;
		}

		// TODO check for chinese | japanese characters, and then do username rather than display name.
		chl.ModerationModule?.ThankFollow(message.user_name);
	},
} as IEventSubHandler<IPubFollow>;
