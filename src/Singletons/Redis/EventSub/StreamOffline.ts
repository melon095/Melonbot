import { IEventSubHandler } from './Base.js';
import { IPubStreamOffline } from './../Data.Types.js';

export default {
	Type: () => 'stream.offline',
	Log: (logger, { broadcaster_user_login }) =>
		logger.Info(`[%s] Is now offline!`, broadcaster_user_login),
	Handle: async ({ broadcaster_user_id }, logger) => {
		const channel = Bot.Twitch.Controller.TwitchChannelSpecific({ ID: broadcaster_user_id });

		if (!channel) {
			logger.Error('No channel found %s', broadcaster_user_id);
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
