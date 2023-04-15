import { ECommandFlags, EPermissionLevel } from './../../Typings/enums.js';
import type { Ivr } from './../../Typings/types';
import { Channel } from './../../controller/Channel/index.js';
import User from './../../controller/User/index.js';
import Got from './../../tools/Got.js';
import { registerCommand } from '../../controller/Commands/Handler.js';
import { GetSafeError } from '../../Models/Errors.js';

const isMod = async (user: User, channel: string) => {
	const mods = await Got['Ivr']
		.get(`modvip/${channel}`, { searchParams: { skipCache: true } })
		.json<Ivr.ModVip>();

	return mods.mods.some((mod) => mod.id === user.TwitchUID);
};

registerCommand({
	Name: 'join',
	Description: 'Join a channel. Works only in bots channel',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 20,
	Params: [],
	Flags: [ECommandFlags.NoBanphrase],
	PreHandlers: [],
	Code: async function (ctx) {
		if (ctx.channel.Name !== Bot.Config.BotUsername) {
			return {
				Success: false,
				Result: 'This command works only in my channel :)',
			};
		}

		const response = (pronoun: string) =>
			`Joining ${pronoun} channel. :) Remember to read 👉 https://twitch.tv/${Bot.Config.BotUsername}/about for info on setting me up.`;

		let other = false;
		let channel = ctx.user;
		const otherUser = ctx.input[0];

		if (otherUser) {
			const user = Bot.User.CleanName(otherUser);

			if (!await isMod(ctx.user, user)) {
				return {
					Success: false,
					Result: 'You need to be a mod in the channel you want me to join :/',
				};
			}

			try {
				channel = await Bot.User.ResolveUsername(user);
			} catch (error) {
				if (error instanceof GetSafeError) {
					return {
						Success: false,
						Result: 'Unable to find a user with that name :/',
					};
				} else {
					ctx.Log('error', 'Failed to join channel', error);

					return {
						Success: false,
						Result: 'Something went wrong :/',
					};
				}
			}

			other = true;
		}

		const name = await Bot.SQL.selectFrom('channels')
			.select('name')
			.where('user_id', '=', channel.TwitchUID)
			.executeTakeFirst();

		if (name) {
			return {
				Success: false,
				Result: `I am already in ${other ? 'their' : 'your'} channel.`,
			};
		}

		return await Channel.Join(channel)
			.then(() => {
				if (!other) {
					return {
						Success: true,
						Result: response('your'),
					};
				}

				return {
					Success: true,
					Result: response(`${channel.Name}'s`),
				};
			})
			.catch(() => {
				return {
					Success: false,
					Result: 'Something went wrong :(',
				};
			});
	},
	LongDescription: async (prefix) => [
		`Join a channel. Works only in bots channel`,
		'',
		`**Usage**: ${prefix}join`,
		'',
		'Can be used by mods in the channel you want me to join.',
		`**Usage**: ${prefix}join [channel]`,
	],
});
