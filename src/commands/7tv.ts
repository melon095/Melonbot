import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import gql, { EmoteSearchFilter } from '../SevenTVGQL.js';
import { ObjectID } from 'bson';

export default class extends CommandModel {
	Name = '7tv';
	Ping = true;
	Description = 'Search 7TV emotes';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [
		[ArgType.String, 'index'],
		[ArgType.Boolean, 'exact'],
		[ArgType.String, 'author'],
	];
	Flags = [];
	PreHandlers = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const first = ctx.input[0];

		if (first === undefined) {
			return {
				Success: false,
				Result: 'Please provide a search term',
			};
		}

		try {
			if (isEmoteId(first)) {
				return addEmoteById(first);
			}
		} catch {
			return addEmoteByName(ctx);
		}

		return addEmoteByName(ctx);
	};
	LongDescription = async (prefix: string) => [
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
	];
}

const isEmoteId = (input: string) => {
	try {
		return ObjectID.isValid(input);
	} catch {
		return false;
	}
};

const addEmoteById = async (id: string) => {
	const emote = await gql.GetEmoteByID(id);
	return {
		Success: true,
		Result: `${emote.name} - https://7tv.app/emotes/${emote.id}`,
	};
};

const addEmoteByName = async (ctx: TCommandContext) => {
	const filter: EmoteSearchFilter = {};
	const { exact, index } = ctx.data.Params;
	if (exact) {
		filter.exact_match = true;
	}

	let emotes;
	try {
		emotes = await gql.SearchEmoteByName(ctx.input.join(' '), filter).then((res) => res.emotes);
	} catch (error) {
		return {
			Success: false,
			Result: `7TV Error: ${error}`,
		};
	}

	if (!emotes.items.length) {
		return {
			Success: false,
			Result: 'No emotes found :(',
		};
	}

	if (emotes.items.length > 1) {
		const intIdx = index ? parseInt(index as string) : 0;

		// split the emotes into chunks of 5
		const chunks = [];
		for (let i = 0; i < emotes.items.length; i += 5) {
			chunks.push(emotes.items.slice(i, i + 5));
		}

		let message;
		// send based off index
		if (intIdx < chunks.length) {
			message = chunks[intIdx]
				.map((emote) => `${emote.name} - https://7tv.app/emotes/${emote.id}`)
				.join(' ');
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
