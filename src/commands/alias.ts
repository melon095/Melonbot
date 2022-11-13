import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
import gql, { ListItemAction } from './../SevenTVGQL.js';
import { SevenTVChannelIdentifier } from './../controller/Emote/SevenTV/EventAPI';

export default class extends CommandModel {
	Name = 'alias';
	Ping = false;
	Description = "Sets the alias of an emote, don't give it a name and it will remove the alias";
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [ECommandFlags.NO_EMOTE_PREPEND];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const { message, okay, emote_set } = await gql.isAllowedToModify(ctx);
		if (!okay) {
			return {
				Success: false,
				Result: message,
			};
		}

		if (!emote_set) {
			return {
				Success: false,
				Result: "Broadcaster doesn't have a emote set",
			};
		}

		if (ctx.input[0] === undefined) {
			return {
				Success: false,
				Result: 'GIve me something to alias :)',
			};
		}

		const input = ctx.input[0];

		const [src] = await gql.CurrentEnabledEmotes(emote_set, (emote) => emote.name === input);

		if (!src) {
			return {
				Success: false,
				Result: "Can't find that emote :(",
			};
		}

		const dst = ctx.input[1] || '';

		return await gql
			.ModifyEmoteSet(emote_set, ListItemAction.UPDATE, src.id, dst)
			.then((emotes) => {
				const identifier: SevenTVChannelIdentifier = {
					Channel: ctx.channel.Name,
					EmoteSet: emote_set,
				};

				Bot.Twitch.Emotes.SevenTVEvent.HideNotification(
					identifier,
					src?.name || '',
					'REMOVE',
				);

				if (dst === '') {
					const newEmote = emotes.emoteSet.emotes.find((emote) => emote.id === src.id);

					return {
						Success: true,
						Result: `I reset the alias of ${src.name} to ${newEmote?.name}`,
					};
				}

				return {
					Success: true,
					Result: `I set the alias of ${src.name} to ${dst}`,
				};
			})
			.catch((err) => {
				console.error(`7TV - Failed to alias emote - ${err}`);
				return {
					Success: false,
					Result: `Failed to alias emote - ${err}`,
				};
			});
	};
	LongDescription = async (prefix: string) => [
		`This command allows you to set the alias of an emote.`,
		`If you don't give it a name, it will remove the alias.`,
		'',
		`**Usage**: ${prefix}alias <emote> [alias]`,
		`**Example**: ${prefix}alias FloppaL xqcL`,
		'',
		'**Required 7TV Flags**',
		'Modify Emotes',
	];
}
