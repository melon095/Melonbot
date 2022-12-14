import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { EPermissionLevel } from './../Typings/enums.js';
import gql, { ListItemAction } from './../SevenTVGQL.js';
import { SevenTVChannelIdentifier } from './../controller/Emote/SevenTV/EventAPI';
import SevenTVAllowed, { Get7TVUserMod } from './../PreHandlers/7tv.can.modify.js';

type PreHandlers = {
	SevenTV: Get7TVUserMod;
};

export default class extends CommandModel<PreHandlers> {
	Name = 'alias';
	Ping = false;
	Description = "Sets the alias of an emote, don't give it a name and it will remove the alias";
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [];
	PreHandlers = [SevenTVAllowed];
	Code = async (ctx: TCommandContext, mods: PreHandlers): Promise<CommandResult> => {
		const { EmoteSet } = mods.SevenTV;

		if (ctx.input[0] === undefined) {
			return {
				Success: false,
				Result: 'GIve me something to alias :)',
			};
		}

		const input = ctx.input[0];

		const [src] = await gql.CurrentEnabledEmotes(EmoteSet(), (emote) => emote.name === input);

		if (!src) {
			return {
				Success: false,
				Result: "Can't find that emote :(",
			};
		}

		const dst = ctx.input[1] || '';

		try {
			const emotes = await gql.ModifyEmoteSet(EmoteSet(), ListItemAction.UPDATE, src.id, dst);

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
		} catch (error) {
			ctx.Log('info', '7TV - Failed to alias emote', error);
			return {
				Success: false,
				Result: `Failed to alias emote - ${error}`,
			};
		}
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
