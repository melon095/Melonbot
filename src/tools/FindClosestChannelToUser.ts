import { Channel } from './../controller/Channel/index.js';

const FIND_IN_ARRAY = (username: string) =>
	`SELECT user_id FROM \`channels\` WHERE JSON_CONTAINS( JSON_EXTRACT(\`viewers\`, '$'), '"${username}"', '$' );`;

export const FindClosestChannelToUser = async (
	Username: string,
	ID: string,
): Promise<Channel[] | null> => {
	return new Promise((Resolve) => {
		const res = Bot.SQL.promisifyQuery<{ user_id: string }>(
			FIND_IN_ARRAY(Username),
		);

		res.then((data) => data.ArrayOrNull()).then((data) => {
			if (data === null) {
				console.error(
					`[FindClosestChannelToUser] Request user ${Username} was not found in any channel.. Somehow`,
				);
				Resolve(null);
				return;
			}
			const channels: Channel[] = [];

			for (const { user_id } of data) {
				const r = Bot.Twitch.Controller.channels.find(
					(chl) =>
						chl.Id === user_id &&
						/* Favor offline. */ chl.Live === false,
				);
				if (r !== undefined) channels.push(r);
			}

			if (channels.length <= 0) {
				return Resolve(null);
			}

			let own = channels.find((chl) => chl.Id === ID);

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
