import { TCommandContext, Database } from './../Typings/types';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
import gql, { ListItemAction } from './../SevenTVGQL.js';
import { SevenTVChannelIdentifier } from './../controller/Emote/SevenTV/EventAPI';

export default class extends CommandModel {
	Name = 'remove';
	Ping = false;
	Description = 'Alias for removing 7TV emotes';
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
			this.Resolve('Give me something to remove :)');
			return;
		}

		const emote = (await gql.CurrentEnabledEmotes(okay.emote_set!)).find(
			(emote) => emote.name === ctx.input[0],
		);

		if (!emote) {
			this.Resolve('No emote found with the given name.');
			return;
		}

		await gql
			.ModifyEmoteSet(okay.emote_set!, ListItemAction.REMOVE, emote.id)
			.then(() => {
				this.Resolve(`Removed the emote => ${emote.name}`);

				const identifier: SevenTVChannelIdentifier = {
					Channel: ctx.channel.Name,
					EmoteSet: okay.emote_set!,
				};

				Bot.Twitch.Emotes.SevenTVEvent.HideNotification(
					identifier,
					emote?.name || '',
					'REMOVE',
				);
			})
			.catch((err) => {
				console.error(`7TV - Failed to remove emote - ${err}`);
				this.Resolve(`Error removing the emote => ${emote.name}`);
			});
		return;
	};
}
