import { ChannelSettingsValue, GetSettings, UpdateSetting } from './../controller/Channel/index.js';
import { ConnectionPlatform, Editor } from './../SevenTVGQL.js';

(async () => {
	const Got = (await import('./../tools/Got.js')).default;
	const Helix = (await import('./../Helix/index.js')).default;
	const gql = (await import('./../SevenTVGQL.js')).default;

	const VIEWER_LIST_API = (stream: string) =>
		`https://tmi.twitch.tv/group/user/${stream}/chatters`;

	const THIRTY_SECONDS = 30 * 1000;
	const ONE_MINUTE = 60 * 1000;
	const ONE_HOUR = 1000 * 60 * 60;
	const FIVE_MINUTES = 1000 * 60 * 5;

	// Every 30 seconds check if a streamer is live.
	setInterval(async () => {
		try {
			const channels = Bot.Twitch.Controller.TwitchChannels.filter(
				(c) => c.Mode !== 'Bot',
			).map((c) => {
				return { TwitchID: c.Id, Name: c.Name };
			});

			const users = await Bot.User.GetMultiple(channels);

			const streams = await Helix.Stream(users);

			const live = streams.data;
			const notLive = streams.notLive;

			for (const stream of live) {
				const channel = Bot.Twitch.Controller.TwitchChannels.find(
					(c) => c.Id === stream.user_id,
				);
				if (!channel) continue;

				Bot.SQL.Query`
                UPDATE channels 
                SET live = ${true} 
                WHERE name = ${channel.Name}`.execute();

				try {
					channel.UpdateLive();
				} catch (e) {
					console.error(e);
				}
			}

			for (const stream of notLive) {
				const channel = Bot.Twitch.Controller.TwitchChannels.find(
					(c) => c.Id === stream.TwitchUID,
				);
				if (!channel) continue;

				Bot.SQL.Query`
                UPDATE channels 
                SET live = ${false} 
                WHERE name = ${channel.Name}`.execute();

				try {
					channel.UpdateLive();
				} catch (e) {
					console.error(e);
				}
			}
		} catch (error) {
			Bot.HandleErrors('__loops/UpdateLiveStats', error);
		}
	}, THIRTY_SECONDS);

	interface ViewerResponse {
		chatters: ViewerList;
	}

	type ViewerList = {
		broadcaster: string[];
		vips: string[];
		moderators: string[];
		staff: string[];
		admins: string[];
		global_mods: string[];
		viewers: string[];
	};

	setInterval(async () => {
		try {
			const channels = await Bot.SQL.Query<
				Database.channels[]
			>`SELECT name, user_id FROM channels`;
			if (!channels.length) return;

			const promises = channels.map(async (channel) => {
				const response = (await Got('default')
					.get(VIEWER_LIST_API(channel.name))
					.json()) as ViewerResponse;

				const chatters = response.chatters;

				const viewers: string[] = [];

				for (const list of Object.values(chatters)) {
					viewers.push(...list);
				}

				await Bot.Redis.SSet(`channel:${channel.user_id}:viewers`, JSON.stringify(viewers));
			});

			await Promise.allSettled(promises);
		} catch (error) {
			Bot.HandleErrors('__loops/ViewerList', error);
		}
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
					await GetSettings(channel.User()).then((s) => s.SevenTVEmoteSet)
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
							console.warn('Failed to resolve usernames for some editors', {
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

				// We don't care if we have permission or not to edit the emote-set.
				// We need the emote-set id to use EventSub

				// This means that they don't have an emote set on twitch,
				// Or they unlinked twitch.
				if (!default_emote_sets || default_emote_sets === currentEmoteSet) return;

				console.log(
					`${channel.Name} new 7TV emote set ${currentEmoteSet} --> ${default_emote_sets}`,
				);

				await UpdateSetting(
					channel.User(),
					'SevenTVEmoteSet',
					new ChannelSettingsValue(default_emote_sets),
				);

				channel.joinEventSub({ Channel: channel.Name, EmoteSet: default_emote_sets });
				channel.leaveEventSub({
					Channel: channel.Name,
					EmoteSet: currentEmoteSet,
				});
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
				const currentEmoteSet = (await GetSettings(user)).SevenTVEmoteSet.ToString();

				const sevenUser = await gql.GetUser(user).catch(() => null);
				if (!sevenUser) return;

				const emoteSet = await gql.getDefaultEmoteSet(sevenUser.id).catch(() => null);
				if (!emoteSet) return;
				const { emote_set_id } = emoteSet;

				if (emote_set_id === currentEmoteSet) return;

				await UpdateSetting(
					user,
					'SevenTVEmoteSet',
					new ChannelSettingsValue(emote_set_id),
				);
				console.log(
					`${channel.Name} new 7TV emote set ${currentEmoteSet} --> ${emote_set_id}`,
				);
				return channel.joinEventSub({
					Channel: user.Name,
					EmoteSet: emoteSet.emote_set_id,
				});
			}),
		);
	}, FIVE_MINUTES);
})();

export {};
