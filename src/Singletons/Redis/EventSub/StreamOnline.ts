import { IEventSubHandler } from './Base.js';
import { IPubStreamOnline } from './../Data.Types.js';
import { UppercaseFirst } from './../../../tools/tools.js';

export default {
	Type: () => 'stream.online',
	Log: ({ broadcaster_user_login, type }: IPubStreamOnline) =>
		console.log(`[${broadcaster_user_login}] Is now online! (${UppercaseFirst(type)})`),
	Handle: async ({ broadcaster_user_id }: IPubStreamOnline) => {
		const channel = Bot.Twitch.Controller.TwitchChannelSpecific({
			ID: broadcaster_user_id,
		});

		if (!channel) {
			console.warn('EventSub.StreamOnline: Channel not found', {
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
