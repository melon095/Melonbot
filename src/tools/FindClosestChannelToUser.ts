import { Channel } from './../controller/Channel/index.js';

export const FindClosestChannelToUser = async (
	Username: string,
	ID: string,
): Promise<Channel[] | null> => {
	return new Promise((Resolve) => {
		const res = Bot.SQL.Query<{ user_id: string }[]>`
            SELECT user_id 
            FROM channels 
            WHERE JSON_CONTAINS( JSON_EXTRACT(${'viewers'}, '$'), '${Username}', '$' );`;

		res.then((data) => {
			if (!data.length) {
				console.error(
					`[FindClosestChannelToUser] Request user ${Username} was not found in any channel.. Somehow`,
				);
				Resolve(null);
				return;
			}
			const channels: Channel[] = [];

			for (const { user_id } of data) {
				const r = Bot.Twitch.Controller.channels.find(
					(chl) => chl.Id === user_id && /* Favor offline. */ chl.Live === false,
				);
				if (r !== undefined) channels.push(r);
			}

			if (channels.length <= 0) {
				return Resolve(null);
			}

			const own = channels.find((chl) => chl.Id === ID);

			if (own === undefined) {
				Resolve(channels);
			} else {
				Resolve([own]);
			}
		});

		res.catch(() => {
			Resolve(null);
		});
	});
};
