import { ECommandFlags } from '../Typings/enums.js';
import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, CommandResult, TCommandContext } from '../Models/Command.js';
import { differenceFormat } from './../tools/tools.js';
import gql, { ConnectionPlatform } from '../SevenTVGQL.js';

type Roles = {
	id: string;
	name: string;
};

export default class extends CommandModel {
	Name = '7tvu';
	Ping = true;
	Description = 'Display information about a 7TV user';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [ECommandFlags.NO_EMOTE_PREPEND];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
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

		const user = await gql
			.GetUserByUsername(internalUser)
			.then((u) => u)
			.catch(() => null);

		if (!user) {
			return {
				Success: false,
				Result: `User ${internalUser.Name} not found.`,
			};
		}

		const roles = await Bot.Redis.SGet(`seventv:roles`)
			.then((res) => JSON.parse(res) as Roles[])
			.then((res) => res.filter((r) => user.roles.includes(r.id)))
			.catch(() => [{ name: 'Default' }]);

		const roleString = roles.map((r) => r.name).join(', ');

		const default_emote_set = await gql.getDefaultEmoteSet(user.id).catch(() => null);
		if (!default_emote_set) {
			return {
				Success: false,
				Result: 'User is missing default emote set',
			};
		}

		const emote_set = user.emote_sets.find((e) => e.id === default_emote_set.emote_set_id);

		const slots = emote_set?.emotes.length || 0;
		const max_slots = emote_set?.capacity || 0;
		const { id } = user.connections.find((c) => c.platform === ConnectionPlatform.TWITCH) || {
			id: null,
		};

		const Result = [
			`${user.username} (${id})`,
			`7TV ID: ${user.id}`,
			`Roles: ${roleString}`,
			`Created: ${differenceFormat(new Date(user.created_at).getTime())} ago`,
			`Slots: ${slots} / ${max_slots.toString().replace(/\B(?=(\d{3})+(?!\d))/g, `_`)}`,
		].join(' | ');

		return {
			Success: true,
			Result,
		};
	};
	LongDescription = async (prefix: string) => [
		`Display information about a 7TV user.`,
		'',
		`**Usage**: ${prefix}7tvu <username>`,
		`**Example**: ${prefix}7tvu @melon095`,
		'',
		'Displays info such as the user id, username, 7TV ID, roles, creation date, and emote slots.',
	];
}
