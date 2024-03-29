import { DataStoreContainer, UpdateChannelData } from '../../IndividualData.js';
import gql, { ConnectionPlatform, Editor } from '../../SevenTVGQL.js';
import { CreateCrontab } from '../../tools/CrontabHandler.js';
import { ExtractAllSettledPromises } from '../../tools/tools.js';

const ONE_MINUTE = 60 * 1000;
const FIVE_MINUTES = ONE_MINUTE * 5;
const ONE_HOUR = ONE_MINUTE * 60;

/**
 * Fetches every channels emote set on 7TV.
 * And validates that we are an editor of the channel.
 * And validate what emote-set is default for that user.
 * Check what editors are on 7TV.
 *
 * TODO Refactor.
 */
CreateCrontab({
	func: async function () {
		const bot_id = Bot.Config.SevenTV.user_id;

		const channels = Bot.Twitch.Controller.TwitchChannels;

		// Get every channel we are editors of
		const sets = await gql.getUserEmoteSets(bot_id, false);
		const editor_of = sets.user.editor_of.filter((e) =>
			e.user.connections.find((c) => c.platform === ConnectionPlatform.TWITCH),
		);

		await Promise.allSettled(
			editor_of.map(async (user) => {
				// Get their emote-sets
				const user_sets = await gql.getUserEmoteSets(user.id, false);
				if (user_sets === null) return;

				const twitchID = user_sets.user.connections.find(
					(c) => c.platform === ConnectionPlatform.TWITCH,
				)?.id;

				// Find their channel.
				const channel = channels.find(({ Id }) => Id === twitchID);
				if (channel === undefined) return;
				// Read-Mode.
				if (channel?.Mode === 'Read') return;

				const currentEmoteSet = (
					await channel.GetChannelData('SevenTVEmoteSet')
				).ToString();

				// Get the default emote-set.
				const { emote_set_id: default_emote_sets } = await gql.getDefaultEmoteSet(
					user_sets.user.id,
					false,
				);
				// Get every editor of their channel
				const {
					user: { editors: resEditors },
				} = await gql.getEditors(user_sets.user.id, false);

				interface TempUser {
					TwitchID: string;
					Name: string;
				}

				// Finds the twitch id and the 7tv username
				const fixUser = ({ user }: Editor): Partial<TempUser> => {
					const id = user.connections.find(
						(c) => c.platform === ConnectionPlatform.TWITCH,
					)?.id;
					return { TwitchID: id, Name: user.username };
				};

				const ids = resEditors
					.map(fixUser)
					.filter((e) => e?.TwitchID !== undefined) as TempUser[];

				const knownUsers = await Bot.User.GetMultiple(ids);

				const notKnown = ids.filter(
					(id) => !knownUsers.find((u) => u.TwitchUID === id.TwitchID),
				);

				const editors: string[] = [];
				if (notKnown.length) {
					const promisedEditors = await Bot.User.ResolveTwitchID(
						notKnown.map((e) => e.TwitchID),
					);

					if (promisedEditors.Failed.length) {
						Bot.Log.Error('Failed to resolve usernames for some editors %O', {
							Channel: channel.Name,
							Failed: promisedEditors.Failed,
						});
					}
					promisedEditors.Okay.map((e) => editors.push(e.Name));
				}

				knownUsers.map((u) => editors.push(u.Name));

				Bot.Log.Debug('Editors for %s: %O', channel.Name, editors);
				await Bot.Redis.SetOverride(`seventv:${default_emote_sets}:editors`, editors);

				if (!default_emote_sets || default_emote_sets === currentEmoteSet) return;

				Bot.Log.Info(
					'%s new 7TV emote set %s --> %s',
					channel.Name,
					currentEmoteSet,
					default_emote_sets,
				);

				await UpdateChannelData(
					(
						await channel.User()
					).TwitchUID,
					'SevenTVEmoteSet',
					new DataStoreContainer(default_emote_sets),
				);
			}),
		);
	},
	interval: FIVE_MINUTES,
});
/**
 * Fetches 7TV roles
 */
CreateCrontab({
	func: async function () {
		const roles = await gql.GetRoles(false);

		if (roles === null) return;

		await Bot.Redis.SSet('seventv:roles', JSON.stringify(roles));
	},
	interval: ONE_HOUR,
});

/**
 * Keep track of channels 7TV Emote Set.
 */
CreateCrontab({
	func: async function () {
		const promises = [];

		for (const channel of Bot.Twitch.Controller.TwitchChannels) {
			promises.push(
				(async () => {
					const user = await channel.User();
					const currentEmoteSet = (
						await channel.GetChannelData('SevenTVEmoteSet')
					).ToString();

					const sevenUser = await gql.GetUser(user, false);

					const emoteSet = await gql.getDefaultEmoteSet(sevenUser.id, false);
					if (!emoteSet || !emoteSet.emote_set_id) return;
					const { emote_set_id } = emoteSet;

					if (emote_set_id === currentEmoteSet) return;

					await UpdateChannelData(
						user.TwitchUID,
						'SevenTVEmoteSet',
						new DataStoreContainer(emote_set_id),
					);

					Bot.Log.Info(
						'%s new 7TV emote set %s --> %s',
						channel.Name,
						currentEmoteSet,
						emote_set_id,
					);
				})(),
			);
		}

		const result = ExtractAllSettledPromises(await Promise.allSettled(promises));
		for (const error of result[1]) {
			Bot.Log.Error(error, 'Failed to update 7TV emote set');
		}
	},
	interval: ONE_MINUTE,
});

export {};
