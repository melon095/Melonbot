import { TCommandContext, SafeResponseError, ModBuilder } from './../Models/Command.js';
import gql from './../SevenTVGQL.js';

export interface Get7TVUserMod {
	EmoteSet(): string;
	UserID(): string;
}

export default {
	Name: () => 'SevenTV',
	Build: async (ctx: TCommandContext): Promise<Get7TVUserMod> => {
		const { message, okay, emote_set, user_id } = await gql.isAllowedToModify(ctx);

		if (!okay) {
			throw new SafeResponseError('7TV', message);
		}

		if (!emote_set) {
			throw new SafeResponseError('7TV', 'Broadcaster is missing a emote set.');
		}

		if (!user_id) {
			throw new SafeResponseError('7TV', 'Broadcaster has not setup a 7TV Account.');
		}

		return {
			EmoteSet: () => emote_set,
			UserID: () => user_id,
		};
	},
} as ModBuilder;
