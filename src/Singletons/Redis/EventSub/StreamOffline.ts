import { IEventSubHandler } from './Base.js';
import { IPubStreamOffline } from './../Data.Types.js';

export default {
	Type: () => 'stream.offline',
	Log: ({ broadcaster_user_login }: IPubStreamOffline) =>
		console.log(`[${broadcaster_user_login}] Is now offline!`),
	Handle: async ({ broadcaster_user_id }: IPubStreamOffline) => {
		const channel = Bot.Twitch.Controller.TwitchChannelSpecific({
			ID: broadcaster_user_id,
		});

		if (!channel) {
			console.warn('EventSub.StreamOffline: Channel not found', {
				broadcaster_user_id,
			});
			return;
		}

		await Bot.SQL.Query`
            UPDATE channels
            SET live = ${false}
            WHERE name = ${channel.Name}
        `;

		await channel.UpdateLive();
	},
} as IEventSubHandler<IPubStreamOffline>;
