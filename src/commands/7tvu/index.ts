import { ECommandFlags, EPermissionLevel } from '../../Typings/enums.js';
import { DifferenceFmt } from './../../tools/tools.js';
import gql, { ConnectionPlatform } from '../../SevenTVGQL.js';
import { registerCommand } from '../../controller/Commands/Handler.js';
import User from '../../controller/User/index.js';

type Roles = {
	id: string;
	name: string;
};

async function GetInformation(internalUser: User) {
	const user = await gql
		.GetUser(internalUser, true)
		.then((u) => u)
		.catch(() => null);

	if (!user) {
		return `User ${internalUser.Name} not found.`;
	}

	const roles = await Bot.Redis.SGet(`seventv:roles`)
		.then((res) => JSON.parse(res) as Roles[])
		.then((res) => res.filter((r) => user.roles.includes(r.id) && r.name !== 'Default'))
		.catch(() => []);

	const roleString = roles.map((r) => r.name).join(', ');

	const default_emote_set = await gql.getDefaultEmoteSet(user.id, true).catch(() => null);
	if (!default_emote_set) {
		return 'User is missing default emote set';
	}

	const emote_set = user.emote_sets.find((e) => e.id === default_emote_set.emote_set_id);

	const slots = emote_set?.emotes.length || 0;
	const max_slots = emote_set?.capacity || 0;
	const id = user.connections.find((c) => c.platform === ConnectionPlatform.TWITCH)?.id ?? null;

	const result = [
		`${user.username} (${id})`,
		`7TV ID: ${user.id}`,
		roleString ? `Roles: ${roleString}` : '',
		`Created: ${DifferenceFmt(new Date(user.created_at).getTime())} ago`,
		`Slots: ${slots} / ${max_slots.toString().replace(/\B(?=(\d{3})+(?!\d))/g, `_`)}`,
	]
		.filter(Boolean)
		.join(' | ');

	return result;
}

registerCommand({
	Name: '7tvu',
	Description: 'Display information about a 7TV user',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [],
	Flags: [ECommandFlags.ResponseIsReply],
	PreHandlers: [],
	Code: async function (ctx) {
		let internalUser;

		if (ctx.input[0]) {
			try {
				const userName = Bot.User.CleanName(ctx.input[0]);
				internalUser = await Bot.User.ResolveUsername(userName);
			} catch (error) {
				return {
					Success: false,
					Result: 'Unable to find that user',
				};
			}
		} else {
			internalUser = ctx.user;
		}

		const Result = await GetInformation(internalUser);

		return {
			Success: true,
			Result,
		};
	},
	LongDescription: async function (prefix, user) {
		let example = '';
		if (user) {
			example = `**Example**: ${await GetInformation(user)}`;
		}

		return [
			`Display information about a 7TV user.`,
			'',
			`**Usage**: ${prefix}7tvu <username>`,
			`**Example**: ${prefix}7tvu @melon095`,
			'',
			'',
			example,
		];
	},
});
