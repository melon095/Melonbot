import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { EPermissionLevel } from './../Typings/enums.js';
import gql, { ListItemAction } from './../SevenTVGQL.js';
import SevenTVAllowed, { Get7TVUserMod } from './../PreHandlers/7tv.can.modify.js';
import { registerCommand } from '../controller/Commands/Handler.js';

type PreHandlers = {
	SevenTV: Get7TVUserMod;
};

registerCommand<PreHandlers>({
	Name: 'remove',
	Ping: false,
	Description: 'Remove 7TV emotes',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [],
	Flags: [],
	PreHandlers: [SevenTVAllowed],
	Code: async function (ctx, mods) {
		const { EmoteSet } = mods.SevenTV;

		if (ctx.input[0] === undefined) {
			return {
				Success: false,
				Result: 'Give me something to remove :)',
			};
		}

		const emote = (await gql.CurrentEnabledEmotes(EmoteSet())).find(
			(emote) => emote.name === ctx.input[0],
		);

		if (!emote) {
			return {
				Success: false,
				Result: 'Could not find that emote',
			};
		}

		try {
			await gql.ModifyEmoteSet(EmoteSet(), ListItemAction.REMOVE, emote.id);
		} catch (error) {
			ctx.Log('info', '7TV - Failed to remove emote', error);
			return {
				Success: false,
				Result: `Error removing the emote => ${emote.name}`,
			};
		}

		return {
			Success: true,
			Result: `Removed the emote => ${emote.name}`,
		};
	},
	LongDescription: async (prefix) => [
		`Remove a 7TV emote from your emote set.`,
		`Usage: ${prefix}remove <emote name>`,
		'',
		'**Required 7TV Permissions:**',
		'Manage Emotes',
	],
});
