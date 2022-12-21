import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import { EPermissionLevel } from './../Typings/enums.js';
import gql, { EmoteSearchFilter, EmoteSet, ListItemAction } from './../SevenTVGQL.js';
import { ObjectID } from 'bson';
import { SevenTVChannelIdentifier } from './../controller/Emote/SevenTV/EventAPI';
import SevenTVAllowed, { Get7TVUserMod } from './../PreHandlers/7tv.can.modify.js';

type PreHandlers = {
	SevenTV: Get7TVUserMod;
};

const resolveEmote = async (
	name: string,
	filters: EmoteSearchFilter,
	specific: number,
): Promise<EmoteSet | null> => {
	if (ObjectID.isValid(name)) {
		return getEmoteFromID(name);
	}

	if (IsSevenTVURL(name)) {
		return getEmoteFromURL(name);
	}

	return getEmoteFromName(name, filters, specific);
};

const getEmoteFromName = async (name: string, filters: EmoteSearchFilter, specific: number) => {
	return gql.SearchEmoteByName(name, filters).then((res) => {
		const e = res?.emotes?.items;

		if (!e || !e.length)
			if (specific) {
				return e[specific];
			}

		return e[0];
	});
};

const getEmoteFromID = (name: string) => {
	try {
		if (!ObjectID.isValid(name)) return null;
		return gql.GetEmoteByID(name);
	} catch {
		return null;
	}
};

const IsSevenTVURL = (url: string) =>
	/https?:\/\/(?:next\.)?7tv.app\/emotes\/\b6\d[a-f0-9]{22}\b/.test(url);

const getEmoteFromURL = (url: string) => {
	try {
		const id = url.split('/').filter(Boolean).pop();
		if (!id) {
			return null;
		}
		return gql.GetEmoteByID(id);
	} catch {
		return null;
	}
};

export default class extends CommandModel<PreHandlers> {
	Name = 'add';
	Ping = false;
	Description = 'Add a 7TV emote';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [
		[ArgType.String, 'alias'],
		[ArgType.Boolean, 'exact'],
	];
	Flags = [];
	PreHandlers = [SevenTVAllowed];
	Code = async (ctx: TCommandContext, mods: PreHandlers): Promise<CommandResult> => {
		const { EmoteSet } = mods.SevenTV;

		const filters: EmoteSearchFilter = {};

		if (ctx.data.Params.exact) {
			filters.exact_match = true;
		}

		const specific = parseInt(ctx.input[1]);

		let emote: EmoteSet | null;
		try {
			emote = await resolveEmote(ctx.input[0], filters, specific);
		} catch (error) {
			return {
				Success: false,
				Result: `7TV Error: ${error}`,
			};
		}

		if (emote === null) {
			return {
				Success: false,
				Result: 'Could not find a emote',
			};
		}

		const name = (ctx.data.Params.alias as string) || emote.name;

		try {
			await gql.ModifyEmoteSet(EmoteSet(), ListItemAction.ADD, emote.id, name);
			return {
				Success: true,
				Result: `Added the emote => ${name}`,
			};
		} catch (error) {
			ctx.Log('info', '7TV - Failed to add emote', error);
			return {
				Success: false,
				Result: `Failed to add ${error}`,
			};
		}
	};
	LongDescription = async (prefix: string) => [
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
	];
}
