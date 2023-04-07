import { IEventSubHandler } from './Base.js';
import { IPubStreamOffline } from './../Data.Types.js';
import { DataStoreContainer, UpdateChannelData } from '../../../IndividualData.js';

export default {
	Type: () => 'stream.offline',
	Log: ({ broadcaster_user_login }) =>
		Bot.Log.Info(`[%s] Is now offline!`, broadcaster_user_login),
	Handle: async ({ broadcaster_user_id }) => {
		const channel = Bot.Twitch.Controller.TwitchChannelSpecific({ ID: broadcaster_user_id });

		if (!channel) {
			Bot.Log.Error('No channel found %s', broadcaster_user_id);
			return;
		}

		await UpdateChannelData(broadcaster_user_id, 'IsLive', new DataStoreContainer('false'));

		await channel.UpdateLive();
	},
} as IEventSubHandler<IPubStreamOffline>;
