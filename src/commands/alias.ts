import { TCommandContext, Database } from './../Typings/types';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
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
	Code = async (ctx: TCommandContext) => {
		const okay = await gql.isAllowedToModify(ctx);
		if (!okay.okay) {
			this.Resolve(okay.message);
			return;
		}

		if (ctx.input[0] === undefined) {
			this.Resolve('Give me something to alias :)');
			return;
		}

		const src = (await gql.CurrentEnabledEmotes(okay.emote_set!)).find(
			(emote) => emote.name === ctx.input[0],
		);

		if (!src) {
			this.Resolve("Can't find that emote :(");
			return;
		}

		const dst = ctx.input[1] || '';

		await gql
			.ModifyEmoteSet(okay.emote_set!, ListItemAction.UPDATE, src.id, dst)
			.then((emotes) => {
				if (dst === '') {
					const newEmote = emotes.emoteSet.emotes.find((emote) => emote.id === src.id);

					this.Resolve(`I reset the alias from ${src.name} to ${newEmote?.name}`);
				} else {
					this.Resolve(`I set the alias of ${src.name} to ${dst}`);
				}

				const identifier: SevenTVChannelIdentifier = {
					Channel: ctx.channel.Name,
					EmoteSet: okay.emote_set!,
				};

				Bot.Twitch.Emotes.SevenTVEvent.HideNotification(
					identifier,
					src?.name || '',
					'REMOVE',
				);
			})
			.catch((err) => {
				console.error(`7TV - Failed to alias emote - ${err}`);
				this.Resolve(`Failed to alias emote - ${err}`);
			});
		return;
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
