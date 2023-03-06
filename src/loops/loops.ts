import { EventsubTypes } from './../Singletons/Redis/Data.Types.js';
import { DataStoreContainer, UpdateChannelData } from './../IndividualData.js';
import { ConnectionPlatform, Editor } from './../SevenTVGQL.js';
import { Helix } from './../Typings/types.js';
import { UnpingUser } from './../tools/tools.js';
import { GetValidTwitchToken } from '../controller/User/index.js';

(async () => {
	const Helix = (await import('./../Helix/index.js')).default;
	const gql = (await import('./../SevenTVGQL.js')).default;

	const THIRTY_SECONDS = 30 * 1000;
	const ONE_MINUTE = THIRTY_SECONDS * 2;
	const THIRTY_MINUTES = ONE_MINUTE * 30;
	const ONE_HOUR = THIRTY_MINUTES * 2;
	const FIVE_MINUTES = ONE_MINUTE * 5;
	const TEN_MINUTES = FIVE_MINUTES * 2;

	setInterval(async () => {
		await Promise.all(
			Bot.Twitch.Controller.channels.map(async (channel) => {
				const user = await channel.User();

				let token;
				try {
					token = await GetValidTwitchToken(user);
				} catch (error) {
					Bot.Log.Error(error as Error);
					return;
				}

				const users = await Helix.Viewers(user.TwitchUID, token);

				const stringified = JSON.stringify(Array.from(users));

				await UpdateChannelData(
					user.TwitchUID,
					'ViewerList',
					new DataStoreContainer(stringified),
				);

				Bot.Log.Info(
					`Updated viewer list for ${user.Name} (${user.TwitchUID}) with ${users.size} viewers`,
				);
			}),
		);
	}, ONE_MINUTE);

	/**
	 * Fetches every channels emote set on 7TV.
	 * And validates that we are an editor of the channel.
	 * And validate what emote-set is default for that user.
	 * Check what editors are on 7TV.
	 *
	 * TODO Refactor.
	 */
	setInterval(async () => {
		const bot_id = Bot.Config.SevenTV.user_id;

		const channels = Bot.Twitch.Controller.TwitchChannels;

		// Get every channel we are editors of
		const sets = await gql.getUserEmoteSets(bot_id);
		const editor_of = sets.user.editor_of.filter((e) =>
			e.user.connections.find((c) => c.platform === ConnectionPlatform.TWITCH),
		);

		await Promise.allSettled(
			editor_of.map(async (user) => {
				// Get their emote-sets
				const user_sets = await gql.getUserEmoteSets(user.id);
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
				);
				// Get every editor of their channel
				await gql.getEditors(user_sets.user.id).then(async (response) => {
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

					const resEditors = response.user.editors;

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

					const current_editors = await Bot.Redis.SetMembers(
						`seventv:${default_emote_sets}:editors`,
					);

					const new_editors = editors.filter(
						(editor) => !current_editors.includes(editor),
					);
					const remove_editors = current_editors.filter(
						(editor) => !editors.includes(editor),
					);

					if (new_editors.length > 0) {
						Bot.Redis.SetAdd(`seventv:${default_emote_sets}:editors`, new_editors);
					}

					if (remove_editors.length > 0) {
						Bot.Redis.SetRemove(
							`seventv:${default_emote_sets}:editors`,
							remove_editors,
						);
					}
				});

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
	}, ONE_MINUTE);

	/**
	 * Fetches 7TV roles
	 */
	setInterval(async () => {
		const roles = await gql.GetRoles();

		if (roles === null) return;

		await Bot.Redis.SSet('seventv:roles', JSON.stringify(roles));
	}, ONE_HOUR);

	/**
	 * Keep track of channels 7TV Emote Set.
	 *
	 * Cheap way of doing it.
	 */
	setInterval(async () => {
		await Promise.allSettled(
			Bot.Twitch.Controller.TwitchChannels.map(async (channel) => {
				const user = await channel.User();
				const currentEmoteSet = (
					await channel.GetChannelData('SevenTVEmoteSet')
				).ToString();

				const sevenUser = await gql.GetUser(user).catch(() => null);
				if (!sevenUser) return;

				const emoteSet = await gql.getDefaultEmoteSet(sevenUser.id).catch(() => null);
				if (!emoteSet) return;
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
			}),
		);
	}, ONE_MINUTE);

	// Prevent accidently subscribing to channel.follow, (Reserved only for me.)
	const VALID_EVENTSUB_TYPES: EventsubTypes[] = [
		'channel.update',
		'stream.offline',
		'stream.online',
	];

	/**
	 * Check the current Twitch eventsub subscriptions a channel is subbed to.
	 * If the channel is missing a specific subscription we will subscribe.
	 */
	setTimeout(async () => {
		const channels = Bot.Twitch.Controller.TwitchChannels;

		await Promise.all(
			channels.map(async (channel) => {
				const current = channel.EventSubs.GetSubscription() ?? [];

				const missing = VALID_EVENTSUB_TYPES.filter(
					(type) => !current.some((sub) => sub.Type() === type),
				);

				if (missing.length === 0) return;

				const resp = await Promise.all(
					missing.map((type) =>
						Helix.EventSub.Create(type, { broadcaster_user_id: channel.Id }),
					),
				);

				for (const event of resp) {
					if (event.err) {
						Bot.Log.Error('Failed to subscribe to eventsub %O', {
							userid: channel.Id,
							error: event.err,
						});
						continue;
					}

					for (const data of event.inner.data) {
						channel.EventSubs.Push(data);

						Bot.Log.Info('Subscribed to eventsub %O', {
							userid: channel.Id,
							type: data.type,
						});
					}
				}
			}),
		);
	}, TEN_MINUTES);

	const handleNameChanges = async function () {
		const botChannel = Bot.Twitch.Controller.TwitchChannelSpecific({ ID: Bot.ID });
		const users = await Bot.User.GetEveryone();

		const helixUsers = await Helix.Users(users);

		const helixUsersMap = new Map<string, Helix.User>();

		for (const user of helixUsers.data) {
			helixUsersMap.set(user.id, user);
		}

		for (const user of users) {
			const helixUser = helixUsersMap.get(user.TwitchUID);

			if (!helixUser) {
				continue;
			}

			// No name changes
			if (helixUser.login === user.Name) {
				continue;
			}

			Bot.Log.Info('%O', { helixUser, user });
			Bot.Log.Info(`Updating ${user.toString()} to ${helixUser.login}`);

			await botChannel?.say(
				`Updating ${UnpingUser(user.toString())} to ${UnpingUser(
					helixUser.login,
				)} FeelsDankMan`,
			);

			await user.UpdateName(helixUser.login);

			const channel = Bot.Twitch.Controller.TwitchChannelSpecific({
				ID: user.TwitchUID,
			});

			if (channel) {
				await channel.UpdateName(helixUser.login);
			}
		}
	};

	setInterval(handleNameChanges, THIRTY_MINUTES);

	handleNameChanges();
})();

export {};
