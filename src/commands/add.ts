import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
import gql, { EmoteSearchFilter, ListItemAction } from './../SevenTVGQL.js';
import { ObjectID } from 'bson';
import { SevenTVChannelIdentifier } from './../controller/Emote/SevenTV/EventAPI';

export default class extends CommandModel {
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
	Flags = [ECommandFlags.NO_EMOTE_PREPEND];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const okay = await gql.isAllowedToModify(ctx);
		if (!okay.okay) {
			return {
				Success: false,
				Result: okay.message,
			};
		}

		const valid = [
			ObjectID.isValid(ctx.input[0]),
			/https?:\/\/(?:next\.)?7tv.app\/emotes\/\b6\d[a-f0-9]{22}\b/.test(ctx.input[0]),
		];

		let emote: { name: string; id: string } | null = {
			name: '',
			id: '',
		};

		const filters: EmoteSearchFilter = {};

		if (ctx.data.Params.exact) {
			filters.exact_match = true;
		}

		const specific = parseInt(ctx.input[1]);

		emote = await gql
			.SearchEmoteByName(ctx.input[0], filters)
			.then((res) => (specific ? res.emotes.items[specific] : res.emotes.items[0]))
			.catch(() => {
				return null;
			});
		if (valid[1] && emote === null) {
			emote = await gql
				.GetEmoteByID(ctx.input[0].split('/').filter(Boolean).pop()!)
				.then((res) => res)
				.catch(() => {
					return null;
				});
		} else if (valid[0] && emote === null) {
			emote = await gql
				.GetEmoteByID(ctx.input[0])
				.then((res) => res)
				.catch(() => {
					return null;
				});
		}
		if (emote === null) {
			return {
				Success: false,
				Result: 'Could not find emote',
			};
		}

		const name = (ctx.data.Params.alias as string) || emote.name;

		return await gql
			.ModifyEmoteSet(okay.emote_set!, ListItemAction.ADD, emote.id, name)
			.then(() => {
				const identifier: SevenTVChannelIdentifier = {
					Channel: ctx.channel.Name,
					EmoteSet: okay.emote_set!,
				};

				Bot.Twitch.Emotes.SevenTVEvent.HideNotification(
					identifier,
					emote?.name || '',
					'ADD',
				);

				return {
					Success: true,
					Result: `Added the emote => ${name}`,
				};
			})
			.catch((err) => {
				console.error(`7TV - Failed to add emote - ${err}`);
				return {
					Success: false,
					Result: `Failed to add ${err}`,
				};
			});
	};
	LongDescription = async (prefix: string) => [
		`Add a 7TV emote to your emote set.`,
		`**Usage**: ${prefix}add <emote>`,
		`**Example**: ${prefix}add FloppaL`,
		'',
		// `**Example**: ${prefix}add FloppaL --alias xqcL`,
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
