import { TCommandContext } from './../Typings/types';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
import gql, { ListItemAction } from './../SevenTVGQL.js';
import { ObjectID } from 'bson';
import { SevenTVChannelIdentifier } from './../controller/Emote/SevenTV/EventAPI';

export default class extends CommandModel {
	Name = 'add';
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

		const valid = [
			ObjectID.isValid(ctx.input[0]),
			/https?:\/\/(?:next\.)?7tv.app\/emotes\/\b6\d[a-f0-9]{22}\b/.test(
				ctx.input[0],
			),
		];

		let emote: { name: string; id: string } | null = {
			name: '',
			id: '',
		};

		emote = await gql
			.SearchEmoteByName(ctx.input[0])
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

		gql.ModifyEmoteSet(okay.emote_set!, ListItemAction.ADD, emote.id)
			.then(() => {
				this.Resolve(`Added the emote => ${emote?.name}`);
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
}
