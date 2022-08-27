import { TCommandContext } from './../Typings/types';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
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
		{
			name: 'alias',
			type: 'string',
		},
		{
			name: 'exact',
			type: 'boolean',
		},
	];
	Flags = [ECommandFlags.NO_EMOTE_PREPEND];
	Code = async (ctx: TCommandContext) => {
		const okay = await gql.isAllowedToModify(ctx);
		if (!okay.okay) {
			this.Resolve(okay.message);
			return;
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

		emote = await gql
			.SearchEmoteByName(ctx.input[0], filters)
			.then((res) => res.emotes.items[0])
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
			this.Resolve('No emote found with the given query. :/');
			return;
		}

		const name = (ctx.data.Params.alias as string) || emote.name;

		gql.ModifyEmoteSet(okay.emote_set!, ListItemAction.ADD, emote.id, name)
			.then(() => {
				this.Resolve(`Added the emote => ${name}`);
				const identifier: SevenTVChannelIdentifier = {
					Channel: ctx.channel.Name,
					EmoteSet: okay.emote_set!,
				};

				Bot.Twitch.Emotes.SevenTVEvent.HideNotification(
					identifier,
					emote?.name || '',
					'ADD',
				);
			})
			.catch((err) => {
				console.error(`7TV - Failed to add emote - ${err}`);
				this.Resolve(`Failed to add. ${err}`);
			});

		return;
	};
	LongDescription = async (prefix: string) => [
		`Add a 7TV emote to your emote set.`,
		`**Usage**: ${prefix}add <emote>`,
		`**Example**: ${prefix}add FloppaL`,
		`**Example**: ${prefix}add FloppaL --alias=xqcL`,

		`You can also add emotes by ID or URL.`,
		`**Example**: ${prefix}add 60aeab8df6a2c3b332d21139`,
		`**Example**: ${prefix}add https://7tv.app/emotes/60aeab8df6a2c3b332d21139`,

		`If you want to add an emote that has a similar name to another emote, you can use the --exact flag.`,
		`**Example**: ${prefix}add FloppaL --exact`,
		``,
		'**Required 7TV Flags**',
		'Modify Emotes',
	];
}
