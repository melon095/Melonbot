import type { Database } from './../Typings/types';

(async () => {
	const axios = await (await import('axios')).default;
	const { token } = await import('./../tools/tools.js');
	const gql = await (await import('./../SevenTVGQL.js')).default;

	const STREAM_INFO_API = (stream: string) =>
		`https://api.twitch.tv/helix/streams?user_login=${stream}`;
	const VIEWER_LIST_API = (stream: string) =>
		`https://tmi.twitch.tv/group/user/${stream}/chatters`;

	const TWENTY_SECONDS = 20 * 1000;
	const ONE_MINUTE = 60 * 1000;
	const ONE_HOUR = 1000 * 60 * 60;
	const FIVE_MINUTES = 1000 * 60 * 5;

	// Every 20 seconds check if a streamer is live.
	setInterval(async () => {
		try {
			const channels = Bot.Twitch.Controller.TwitchChannels;
			for (const channel of channels) {
				if (channel.Mode !== 'Bot') {
					setTimeout(async () => {
						await axios
							.get(STREAM_INFO_API(channel.Name), {
								headers: {
									'client-id': Bot.Config.Twitch.ClientID,
									Authorization: `Bearer ${(await token.Bot()).token}`,
								},
							})
							.then((response) => response.data.data)
							.then((response: never[]) => {
								const live = response.length > 0;

								Bot.SQL.Query`
                                    UPDATE channels 
                                    SET live = ${live} 
                                    WHERE name = ${channel.Name}`.execute();

								try {
									channel.UpdateLive();
								} catch (e) {
									console.error(e);
								}
							})
							.catch((error) => {
								console.log(error);
								return;
							});
					}, 500);
				}
			}
		} catch (error) {
			Bot.HandleErrors('__loops/UpdateLiveStats', new Error(error as never));
		}
	}, TWENTY_SECONDS);

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

			for (const { name, user_id } of channels) {
				await axios
					.get(VIEWER_LIST_API(name.toLowerCase()))
					.then((response) => response.data.chatters)
					.then(async (response: ViewerList) => {
						let viewers = '';

						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						for (const [_, value] of Object.entries(response)) {
							if (value.length > 0) {
								viewers += `${value.toString()},`;
							}
						}

						if (viewers.lastIndexOf(',') === viewers.length - 1) {
							viewers = viewers.substring(0, viewers.length - 1);
						}

						await Bot.Redis.SSet(
							`channel:${user_id}:viewers`,
							JSON.stringify(viewers.split(',')),
						);
					})
					.catch((error) => {
						throw error;
					});
			}
		} catch (error) {
			Bot.HandleErrors('__loops/ViewerList', new Error(error as never));
		}
	}, ONE_MINUTE);

	/**
	 * Fetches every channels emote set on 7TV.
	 * And validates that we are an editor of the channel.
	 * And validate what emote-set is default for that user.
	 * Check what editors are on 7TV.
	 */
	setInterval(async () => {
		const bot_id = Bot.Config.SevenTV.user_id;

		const channels = await Bot.SQL.Query<Database.channels[]>`
                SELECT name, seventv_emote_set, user_id
                FROM channels`;

		if (!channels.length) return;

		// Get every channel we are editors of
		const sets = await gql.getUserEmoteSets(bot_id);
		const editor_of = sets.user.editor_of;

		for (const user of editor_of) {
			// const user = editor_of[channel]

			// Get their emote-sets
			const user_sets = await gql.getUserEmoteSets(user.id);
			if (user_sets === null) continue;

			// Find their channel.
			const channel = channels.find(({ name }) => name === user_sets.user.username);
			if (channel === undefined) continue;
			// Read-Mode.
			if (channel?.bot_permission === 0) continue;

			// Get the default emote-set.
			const { emote_set_id: default_emote_sets } = await gql.getDefaultEmoteSet(
				user_sets.user.id,
			);
			// Get every editor of their channel
			await gql.getEditors(user_sets.user.id).then(async (response) => {
				// Store the editors in redis.
				// Only editors of the channel are allowed to modify the emote-set.
				const editors = response.user.editors.map((editor) => editor.user.username);

				const current_editors = await Bot.Redis.SetMembers(
					`seventv:${default_emote_sets}:editors`,
				);

				const new_editors = editors.filter((editor) => !current_editors.includes(editor));
				const remove_editors = current_editors.filter(
					(editor) => !editors.includes(editor),
				);

				if (new_editors.length > 0) {
					Bot.Redis.SetAdd(`seventv:${default_emote_sets}:editors`, new_editors);
				}

				if (remove_editors.length > 0) {
					Bot.Redis.SetRemove(`seventv:${default_emote_sets}:editors`, remove_editors);
				}
			});

			// We don't care if we have permission or not to edit the emote-set.
			// We need the emote-set id to use EventSub

			// This means that they don't have an emote set on twitch,
			// Or they unlinked twitch.
			if (default_emote_sets === '') continue;
			if (default_emote_sets === channel?.seventv_emote_set) continue;

			console.log(
				`${channel?.name} new 7TV emote set ${channel?.seventv_emote_set} --> ${default_emote_sets}`,
			);
			Bot.SQL.Query`
                UPDATE channels 
                SET seventv_emote_set = ${default_emote_sets} 
                WHERE name = ${channel?.name}`.execute();

			const c = Bot.Twitch.Controller.TwitchChannelSpecific({ ID: channel.user_id });

			c?.joinEventSub({ Channel: channel.name, EmoteSet: default_emote_sets });
			c?.leaveEventsub({ Channel: channel.name, EmoteSet: channel.seventv_emote_set || '' });
		}
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
		const channels = await Bot.SQL.Query<Database.channels[]>`
                SELECT name, seventv_emote_set, user_id
                FROM channels`;

		for (const channel of channels) {
			const user = await gql.GetUserByUsername(channel.name).catch(() => undefined);
			if (!user) continue;

			const emote_set = await gql.getDefaultEmoteSet(user.id);
			if (emote_set === null) continue;

			const id = emote_set.emote_set_id;

			if (id !== channel.seventv_emote_set) {
				console.log(
					`${channel.name} new 7TV emote set ${channel.seventv_emote_set} --> ${id}`,
				);
				Bot.SQL.Query`
                    UPDATE channels 
                    SET seventv_emote_set = ${id} 
                    WHERE name = ${channel.name}`.execute();

				Bot.Twitch.Controller.TwitchChannelSpecific({ ID: channel.user_id })?.joinEventSub({
					Channel: channel.name,
					EmoteSet: id,
				});
			}
		}
	}, FIVE_MINUTES);
})();
