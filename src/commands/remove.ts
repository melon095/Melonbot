import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';

import gql, { ListItemAction } from './../SevenTVGQL.js';
import { SevenTVChannelIdentifier } from './../controller/Emote/SevenTV/EventAPI';

export default class extends CommandModel {
	Name = 'remove';
	Ping = false;
	Description = 'Remove 7TV emotes';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [ECommandFlags.NO_EMOTE_PREPEND];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const okay = await gql.isAllowedToModify(ctx);
		if (!okay.okay) {
			return {
				Success: false,
				Result: okay.message,
			};
		}

		if (ctx.input[0] === undefined) {
			return {
				Success: false,
				Result: 'Give me something to remove :)',
			};
		}

		const emote = (await gql.CurrentEnabledEmotes(okay.emote_set!)).find(
			(emote) => emote.name === ctx.input[0],
		);

		if (!emote) {
			return {
				Success: false,
				Result: 'Could not find that emote',
			};
		}

		try {
			await gql.ModifyEmoteSet(okay.emote_set!, ListItemAction.REMOVE, emote.id);
		} catch (error) {
			console.error(`7TV - Failed to remove emote - ${error}`);
			return {
				Success: false,
				Result: `Error removing the emote => ${emote.name}`,
			};
		}
		const identifier: SevenTVChannelIdentifier = {
			Channel: ctx.channel.Name,
			EmoteSet: okay.emote_set!,
		};

		Bot.Twitch.Emotes.SevenTVEvent.HideNotification(identifier, emote?.name || '', 'REMOVE');

		return {
			Success: true,
			Result: `Removed the emote => ${emote.name}`,
		};
	};
	LongDescription = async (prefix: string) => [
		`Remove a 7TV emote from your emote set.`,
		`Usage: ${prefix}remove <emote name>`,
		'',
		'**Required 7TV Permissions:**',
		'Manage Emotes',
	];
}
