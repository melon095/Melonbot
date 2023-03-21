import { EPermissionLevel } from '../../Typings/enums.js';
import { TCommandContext, ArgType } from '../../Models/Command.js';
import gql, { EmoteSearchFilter } from '../../SevenTVGQL.js';
import { extractSeventTVID } from './../../tools/regex.js';
import { registerCommand } from '../../controller/Commands/Handler.js';

registerCommand({
	Name: '7tv',
	Ping: true,
	Description: 'Search 7TV emotes',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [
		[ArgType.String, 'index'],
		[ArgType.Boolean, 'exact'],
		[ArgType.String, 'author'],
	],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
		const first = ctx.input[0] ?? this.EarlyEnd.InvalidInput('provide a search term');

		const id = extractSeventTVID(first);

		if (id) {
			return getEmoteFromID(id);
		}

		return getEmoteFromName(ctx);
	},
	LongDescription: async (prefix) => [
		`Searches up to 100 7TV emotes.`,
		`**Usage**: ${prefix}7tv <search term>`,
		`**Example**: ${prefix}7tv Apu`,
		'-e, --exact',
		'   Search for an exact match',
		'',
		'-i, --index <number>',
		'   Return the emotes at the specified index',
		'',
		'By default the command will return the first 5 emotes',
	],
});

const getEmoteFromID = async (id: string) => {
	const emote = await gql.GetEmoteByID(id);
	return {
		Success: true,
		Result: `${emote.name} - https://7tv.app/emotes/${emote.id}`,
	};
};

const getEmoteFromName = async (ctx: TCommandContext) => {
	const filter: EmoteSearchFilter = {};
	const { exact, index } = ctx.data.Params;
	if (exact) {
		filter.exact_match = true;
	}

	const emotes = await gql
		.SearchEmoteByName(ctx.input.join(' '), filter)
		.then((res) => res.emotes);

	if (!emotes.items.length) {
		return {
			Success: false,
			Result: 'No emotes found :(',
		};
	}

	if (emotes.items.length > 1) {
		const intIdx = index ? parseInt(index as string) : 0 || 0;

		const chunks = [];
		for (let i = 0; i < emotes.items.length; i += 5) {
			chunks.push(emotes.items.slice(i, i + 5));
		}

		let message;
		if (intIdx < chunks.length) {
			message = chunks[intIdx]
				.map((emote) => `${emote.name} - https://7tv.app/emotes/${emote.id}`)
				.join(' | ');
		} else {
			message = `Index out of range (0-${chunks.length - 1})`;
		}

		return {
			Success: true,
			Result: message,
		};
	}

	return {
		Success: true,
		Result: `'${emotes.items[0].name}' - https://7tv.app/emotes/${emotes.items[0].id}`,
	};
};
