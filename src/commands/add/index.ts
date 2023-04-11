import { ArgType } from '../../Models/Command.js';
import { EPermissionLevel } from './../../Typings/enums.js';
import gql, { EmoteSearchFilter, EmoteSet, ListItemAction } from './../../SevenTVGQL.js';
import SevenTVAllowed, { Get7TVUserMod } from './../../PreHandlers/7tv.can.modify.js';
import { extractSeventTVID } from './../../tools/regex.js';
import { registerCommand } from '../../controller/Commands/Handler.js';

type PreHandlers = {
	SevenTV: Get7TVUserMod;
};

const resolveEmote = async (
	name: string,
	filters: EmoteSearchFilter,
	specific: number,
): Promise<EmoteSet | null> =>
	getEmoteFromID(extractSeventTVID(name)) ?? getEmoteFromName(name, filters, specific);

const getEmoteFromName = async (name: string, filters: EmoteSearchFilter, specific: number) => {
	return gql.SearchEmoteByName(name, filters, true).then((res) => {
		const e = res?.emotes?.items;

		if (!e || !e.length)
			if (specific) {
				return e[specific];
			}

		return e[0];
	});
};

const getEmoteFromID = (name: string | undefined) => {
	if (name) return gql.GetEmoteByID(name, true);
	return null;
};

registerCommand<PreHandlers>({
	Name: 'add',
	Ping: false,
	Description: 'Add a 7TV emote',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [
		[ArgType.String, 'alias'],
		[ArgType.Boolean, 'exact'],
	],
	Flags: [],
	PreHandlers: [SevenTVAllowed],
	Code: async function (ctx, mods) {
		const { EmoteSet } = mods.SevenTV;

		if (!ctx.input[0]) {
			this.EarlyEnd.InvalidInput('No emote provided');
		}

		const filters: EmoteSearchFilter = {};

		if (ctx.data.Params.exact) {
			filters.exact_match = true;
		}

		const specific = parseInt(ctx.input[1]);

		const emote = await resolveEmote(ctx.input[0], filters, specific);

		if (!emote) {
			return {
				Success: false,
				Result: 'Could not find a emote',
			};
		}

		const name = (ctx.data.Params.alias as string) || emote.name;

		await gql.ModifyEmoteSet(EmoteSet(), ListItemAction.ADD, emote.id, name, true);
		return {
			Success: true,
			Result: `Added the emote => ${name}`,
		};
	},
	LongDescription: async (prefix) => [
		`Add a 7TV emote to your emote set.`,
		`**Usage**: ${prefix}add <emote>`,
		`**Example**: ${prefix}add FloppaL`,
		'',
		`You can also add emotes by ID or URL.`,
		`**Example**: ${prefix}add 60aeab8df6a2c3b332d21139`,
		`**Example**: ${prefix}add https://7tv.app/emotes/60aeab8df6a2c3b332d21139`,

		'-a, --alias <alias>',
		'Set an alias for the emote',
		'',
		'-e, --exact',
		'Search for an exact match',
		``,
		`Want the second emote in the list? Add a number after the emote name.`,
		`**Example**: ${prefix}add FloppaL 1`,
		'Index is 0 based, so 0 is the first emote in the list.',
		'',
		'**Required 7TV Permissions**',
		'Modify Emotes',
	],
});
