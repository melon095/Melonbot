import { EPermissionLevel } from './../../Typings/enums.js';
import gql, { EnabledEmote, ListItemAction } from './../../SevenTVGQL.js';
import SevenTVAllowed, { Get7TVUserMod } from './../../PreHandlers/7tv.can.modify.js';
import { registerCommand } from '../../controller/Commands/Handler.js';
import { CommandResult } from '../../Models/Command.js';

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
			this.EarlyEnd.InvalidInput('No emote name provided');
		}

		ctx.input = ctx.input.reduce((args: string[], arg: string) => {
			if (!args.includes(arg)) args.push(arg);
			return args;
		}, []);

		const emotes: EnabledEmote[] = [];
		for (const emote of await gql.CurrentEnabledEmotes(EmoteSet())) {
			const emoteIdx: number = ctx.input.indexOf(emote.name);

			if (emoteIdx === -1) continue;

			emotes.push(emote);
			ctx.input.splice(emoteIdx, 1);

			if (!ctx.input.length) break;
		}

		if (ctx.input.length)
			ctx.channel.say(
				`Could not find the following emote${
					ctx.input.length > 1 ? 's' : ''
				}: ${ctx.input.join(' ')}`,
			);

		const failed = (
			await Promise.all(
				emotes.map(async (emote) => {
					try {
						await gql.ModifyEmoteSet(EmoteSet(), ListItemAction.REMOVE, emote.id);
					} catch (error) {
						ctx.Log('info', '7TV - Failed to remove emote', error);
						return emote.name;
					}
				}),
			)
		).reduce((emts, emt) => {
			if (!emt) return emts;
			return (emts += ` ` + emt);
		}, ``);

		// prettier-ignore
		return (function (this: CommandResult) {
			if (emotes.length === 1) this.Result = `Removed the emote => ${emotes[0].name}`;

			if (failed) {
				this.Success = false;
				// prettier-ignore
				this.Result += `${this.Result.length ? ' \u{2022} ' : ''}Error removing the following:${failed}`;
			} else if (!this.Result) this.Result = `All emotes were successfully removed`;

			return this;
			// prettier-ignore
		}).call({
			Success: true,
			Result: '',
		});
	},
	LongDescription: async (prefix) => [
		'Remove 7TV emotes from your emote set.',
		`Usage: ${prefix}remove <emote names>`,
		'',
		'**Required 7TV Permissions:**',
		'Manage Emotes',
	],
});
