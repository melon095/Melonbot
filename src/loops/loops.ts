import { VALID_EVENTSUB_TYPES } from './../Singletons/Redis/Data.Types.js';
import { DataStoreContainer, UpdateChannelData } from './../IndividualData.js';
import { Helix } from './../Typings/types.js';
import { ExtractAllSettledPromises, UnpingUser } from './../tools/tools.js';
import { GetValidTwitchToken } from '../controller/User/index.js';
import HelixAPI from './../Helix/index.js';
import { CreateCrontab } from '../tools/CrontabHandler.js';
import { Channel } from '../controller/Channel/index.js';

const THIRTY_SECONDS = 30 * 1000;
const ONE_MINUTE = THIRTY_SECONDS * 2;
const THIRTY_MINUTES = ONE_MINUTE * 30;
const ONE_HOUR = THIRTY_MINUTES * 2;
const FIVE_MINUTES = ONE_MINUTE * 5;
const TEN_MINUTES = FIVE_MINUTES * 2;

CreateCrontab({
	func: async function () {
		const promises = [];

		for (const channel of Bot.Twitch.Controller.TwitchChannels) {
			promises.push(
				(async () => {
					if (channel.Mode === 'Bot') return;

					const user = await channel.User();

					// Check for broadcaster token (e.g logged in to website)
					let token = null;
					try {
						token = await GetValidTwitchToken(user);
					} catch (error) {
						Bot.Log.Error(
							error as Error,
							'Failed to get valid token for user %s',
							user.TwitchUID,
						);

						return;
					}

					if (token === null) {
						return;
					}

					const broadcaster = user.TwitchUID;
					const moderator = user.TwitchUID;
					const users = await HelixAPI.Viewers({ broadcaster, moderator }, token);

					const stringified = JSON.stringify(Array.from(users));

					await UpdateChannelData(
						user.TwitchUID,
						'ViewerList',
						new DataStoreContainer(stringified),
					);

					Bot.Log.Info(
						`Updated viewer list for ${user.Name} (${user.TwitchUID}) with ${users.size} viewers`,
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

/**
 * Check the current Twitch eventsub subscriptions a channel is subbed to.
 * If the channel is missing a specific subscription we will subscribe.
 */
CreateCrontab({
	func: async function () {
		async function doThing(channel: Channel) {
			const current = channel.EventSubs.GetSubscription() ?? [];

			const missing = VALID_EVENTSUB_TYPES.filter(
				(type) => !current.some((sub) => sub.Type() === type),
			);

			if (missing.length === 0) return;

			const resp = await Promise.all(
				missing.map((type) =>
					HelixAPI.EventSub.Create(type, { broadcaster_user_id: channel.Id }),
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
		}

		const promises = [];

		for (const channel of Bot.Twitch.Controller.TwitchChannels) {
			promises.push(doThing(channel));
		}

		const result = ExtractAllSettledPromises(await Promise.allSettled(promises));
		for (const error of result[1]) {
			Bot.Log.Error(error, 'Failed to update 7TV emote set');
		}
	},
	interval: TEN_MINUTES,
});

CreateCrontab({
	func: async function () {
		const botChannel = Bot.Twitch.Controller.TwitchChannelSpecific({ ID: Bot.ID });
		const users = await Bot.User.GetEveryone();

		const helixUsers = await HelixAPI.Users(users);

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
	},
	interval: THIRTY_MINUTES,
	runImmediately: true,
});

export {};
