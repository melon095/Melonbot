import { PreHandlerError } from '../Models/Errors.js';
import { ModBuilder } from './../Models/Command.js';
import gql from './../SevenTVGQL.js';

export interface Get7TVUserMod {
	EmoteSet(): string;
	UserID(): string;
}

export default {
	Name: () => 'SevenTV',
	Build: async (ctx) => {
		const channel = await ctx.channel.User();

		const { message, okay, emote_set, user_id } = await gql.isAllowedToModify(
			channel,
			ctx.user,
		);

		if (!okay) {
			throw new PreHandlerError('7TV', message);
		}

		if (!emote_set) {
			throw new PreHandlerError('7TV', 'Broadcaster is missing a emote set.');
		}

		if (!user_id) {
			throw new PreHandlerError('7TV', 'Broadcaster has not setup a 7TV Account.');
		}

		return {
			EmoteSet: () => emote_set,
			UserID: () => user_id,
		};
	},
} as ModBuilder;
