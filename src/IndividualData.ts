/**
 * ##########################
 * #    Channel Settings    #
 * ##########################
 */

import { sql } from 'kysely';
import User from './controller/User/index.js';
import { Err, Ok, Result } from './tools/result.js';

export type ChannelDataNames = 'SevenTVEmoteSet' | 'FollowMessage' | 'Pajbot1';

export type ChannelDataList = {
	[key in ChannelDataNames]: DataStoreContainer;
};

/**
 * DataStoreContainer wraps the data stored in the database and provides methods to convert it to the correct type.
 */
export class DataStoreContainer {
	static FromUnknown(value: unknown): DataStoreContainer {
		switch (typeof value) {
			case 'string':
				return new DataStoreContainer(value);
			case 'number':
			case 'boolean':
				return new DataStoreContainer(value.toString());
			default:
				return new DataStoreContainer(JSON.stringify(value));
		}
	}

	constructor(protected value: string, public metadata: { last_edited?: Date } = {}) {}

	public ToJSON<Obj extends object>(): Result<Obj, string> {
		try {
			return new Ok(JSON.parse(this.value));
		} catch (e) {
			return Err.NormalizeError(e);
		}
	}

	public ToBoolean(): boolean {
		return this.value === 'true';
	}

	public ToNumber(): number {
		return Number(this.value) || 0;
	}

	public ToString(): string {
		return this.value;
	}

	public IsEmpty(): boolean {
		return this.value === '';
	}
}

const DefaultDataStore = new DataStoreContainer('');

// Allow arbitrary key's or suggest a pre-defined list of keys.
// prettier-ignore
export function GetChannelData(channelIdentifier: string, dataIdentifier: ChannelDataNames): Promise<DataStoreContainer>;
// prettier-ignore
export function GetChannelData(channelIdentifier: string, dataIdentifier: string): Promise<DataStoreContainer>;

/**
 * Fetch data tied to a channel the store.
 *
 * @param channelIdentifier The Twitch UID of the channel. [Unfortunate, due to the way the DB is structured :/]
 * @param dataIdentifier The key of the data to fetch.
 */
export async function GetChannelData(
	channelIdentifier: string,
	dataIdentifier: ChannelDataNames | string,
): Promise<DataStoreContainer> {
	const fromDb = await Bot.SQL.selectFrom('channel_data_store')
		.select('value')
		.select('last_edited')
		.where('channel', '=', channelIdentifier)
		.where('key', '=', dataIdentifier)
		.executeTakeFirst();

	if (fromDb) {
		return new DataStoreContainer(fromDb.value, { last_edited: fromDb.last_edited });
	}

	return DefaultDataStore;
}

// prettier-ignore
export function UpdateChannelData(channelIdentifier: string, name: ChannelDataNames, value: DataStoreContainer): Promise<void>;
// prettier-ignore
export function UpdateChannelData(channelIdentifier: string, name: string, value: DataStoreContainer): Promise<void>;

/**
 * Insert or update channel data.
 *
 * @param channelIdentifier Twitch UID
 */
export async function UpdateChannelData(
	channelIdentifier: string,
	name: ChannelDataNames | string,
	value: DataStoreContainer,
): Promise<void> {
	const exists = await Bot.SQL.selectFrom('channel_data_store')
		.select('value')
		.where('channel', '=', channelIdentifier)
		.where('key', '=', name)
		.executeTakeFirst();

	if (exists) {
		await Bot.SQL.updateTable('channel_data_store')
			.set({
				value: value.ToString(),
				last_edited: sql`NOW()`,
			})
			.where('channel', '=', channelIdentifier)
			.where('key', '=', name)
			.executeTakeFirst();
	} else {
		await Bot.SQL.insertInto('channel_data_store')
			.values({
				channel: channelIdentifier,
				key: name,
				value: value.ToString(),
			})
			.execute();
	}

	// onConflict machine broken lol
	// await Bot.SQL.insertInto('channel_data_store')
	// 	.values({
	// 		channel: channelIdentifier,
	// 		key: name,
	// 		value: value.ToString(),
	// 	})
	// 	.onConflict((cf) =>
	// 		cf.column('key').doUpdateSet({
	// 			value: value.ToString(),
	// 			last_edited: sql`NOW()`,
	// 		}),
	// 	)
	// 	.execute();
}
export const InsertChannelData = UpdateChannelData;

export function DeleteChannelData(channelIdentifier: string, name: ChannelDataNames): Promise<void>;
export function DeleteChannelData(channelIdentifier: string, name: string): Promise<void>;

export async function DeleteChannelData(
	channelIdentifier: string,
	name: ChannelDataNames | string,
): Promise<void> {
	await Bot.SQL.deleteFrom('channel_data_store')
		.where('channel', '=', channelIdentifier)
		.where('key', '=', name)
		.executeTakeFirst();
}

/**
 * #######################
 * #    User Settings    #
 * #######################
 */

export enum UserDataStoreKeys {
	SpotifyToken = 'spotify_token',
	TwitchToken = 'twitch_token',
}

export async function GetUserData(user: User, key: UserDataStoreKeys): Promise<DataStoreContainer> {
	return await Bot.SQL.selectFrom('user_data_store')
		.select('value')
		.select('last_edited')
		.where('user', '=', user.ID)
		.where('key', '=', key)
		.executeTakeFirst()
		.then((data) => {
			if (data) {
				return new DataStoreContainer(data.value, { last_edited: data.last_edited });
			}

			return DefaultDataStore;
		});
}

export async function SetUserData(
	user: User,
	key: UserDataStoreKeys,
	value: object | string | number,
): Promise<void> {
	let store: string;
	if (typeof value === 'object' || Array.isArray(value)) {
		store = JSON.stringify(value);
	} else if (typeof value === 'string') {
		store = value;
	} else if (typeof value === 'number') {
		store = value.toString();
	} else {
		throw new Error('Invalid data type');
	}

	const exists = await Bot.SQL.selectFrom('user_data_store')
		.select('value')
		.where('user', '=', user.ID)
		.where('key', '=', key)
		.executeTakeFirst();

	if (exists) {
		await Bot.SQL.updateTable('user_data_store')
			.set({
				value: store,
				last_edited: sql`NOW()`,
			})
			.where('user', '=', user.ID)
			.where('key', '=', key)
			.execute();
	} else {
		await Bot.SQL.insertInto('user_data_store')
			.values({
				user: user.ID,
				key: key,
				value: store,
			})
			.execute();
	}

	// broken
	// await Bot.SQL.insertInto('user_data_store')
	// 	.values({
	// 		user: user.ID,
	// 		key: key,
	// 		value: store,
	// 	})
	// 	.onConflict((cf) =>
	// 		cf.column('key').doUpdateSet({
	// 			value: store,
	// 			last_edited: sql`NOW()`,
	// 		}),
	// 	)
	// 	.executeTakeFirst();
}

export async function DeleteUserData(option: UserDataStoreKeys): Promise<void> {
	await Bot.SQL.deleteFrom('user_data_store').where('key', '=', option).executeTakeFirst();
}
