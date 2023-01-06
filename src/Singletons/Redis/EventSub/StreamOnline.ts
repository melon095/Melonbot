import { IEventSubHandler } from './Base.js';
import { IPubStreamOnline } from './../Data.Types.js';
import { UppercaseFirst } from './../../../tools/tools.js';

export default {
	Type: () => 'stream.online',
	Log: (logger, { broadcaster_user_login, type }) =>
		logger.Info(`[%s] Is now online! (%s)`, broadcaster_user_login, UppercaseFirst(type)),
	Handle: async ({ broadcaster_user_id }, logger) => {
		const channel = Bot.Twitch.Controller.TwitchChannelSpecific({
			ID: broadcaster_user_id,
		});

		if (!channel) {
			logger.Warn('EventSub.StreamOnline: Channel not found %O', {
				broadcaster_user_id,
			});
			return;
		}

		await Bot.SQL.Query`
            UPDATE channels
            SET live = ${true}
            WHERE name = ${channel.Name}
        `;

		await channel.UpdateLive();
	},
} as IEventSubHandler<IPubStreamOnline>;
