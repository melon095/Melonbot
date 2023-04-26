import { IEventSubHandler } from './Base.js';
import { IPubChannelModeUpdate } from '../Data.Types.js';

export default {
	Type: () => 'channel.mode_update',
	Handle: ({ Channel, Mode }) => {
		const channel = Bot.Twitch.Controller.TwitchChannelSpecific({ ID: Channel });

		if (!channel) {
			Bot.Log.Error(`Channel ${Channel} mode updated to ${Mode} but channel not found`);
			return;
		}
		Bot.Log.Info(`Channel ${Channel} mode updated to ${Mode}`);
		channel.Mode = Mode;
	},
} as IEventSubHandler<IPubChannelModeUpdate>;
