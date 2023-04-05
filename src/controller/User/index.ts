import Got from './../../tools/Got.js';
import UserTable, { UserRole } from './../DB/Tables/UserTable.js';
import Helix from './../../Helix/index.js';
import type { Ivr, OAuthToken } from './../../Typings/types.js';
import { Selectable } from 'kysely';
import { GetSafeError } from '../../Models/Errors.js';
import { GetUserData, SetUserData, UserDataStoreKeys } from '../../IndividualData.js';
import Strategy, { AuthenticationMethod } from '../../web/oauth.js';

export default class User {
	// Two hours
	static readonly cacheExpireTime = 1000 * 60 * 60 * 2;
	static readonly cacheExpireInterval = setInterval(
		() => User.Cache.clear(),
		User.cacheExpireTime,
	);

	/**
	 * Cache by the user's name
	 * This allows for name changes to not break it.
	 */
	static Cache = new Map<string, User>();

	public ID: number;
	public Name: string;
	public TwitchUID: string;
	public Role: UserRole;
	public FirstSeen: Date;

	constructor(user: Selectable<UserTable>) {
		this.ID = user.id;
		this.Name = user.name;
		this.TwitchUID = user.twitch_uid;
		this.Role = user.role;
		this.FirstSeen = user.first_seen;
	}

	static async Get(
		TwitchID: string,
		Name: string,
		options = { throwOnNotFound: false },
	): Promise<User> {
		// Check if cached
		const cacheUser = User.Cache.get(Name);

		if (cacheUser) {
			return cacheUser;
		}

		// Find the user in the database
		// Based of the twitch uid
		// Name changes won't break it as it should pick the latest detected user
		const dbUser = await Bot.SQL.selectFrom('users')
			.selectAll()
			.where('twitch_uid', '=', TwitchID)
			.orderBy('first_seen', 'desc')
			.limit(1)
			.executeTakeFirst();

		if (dbUser) {
			const user = new User(dbUser);
			User.Cache.set(Name, user);
			return user;
		}

		if (options.throwOnNotFound) {
			throw new GetSafeError(`User ${Name} not found in database.`);
		}

		// Create new user
		const newUser = await Bot.SQL.insertInto('users')
			.values({
				name: Name,
				twitch_uid: TwitchID,
				role: 'user',
			})
			.returningAll()
			.executeTakeFirst();

		if (!newUser) {
			// FIXME
			Bot.Log.Error(`Failed to create user ${Name}.`);

			throw new GetSafeError(`Failed to create user ${Name}.`);
		}

		const user = new User(newUser);
		User.Cache.set(Name, user);
		return user;
	}

	static async GetMultiple(Users: { TwitchID: string; Name: string }[]): Promise<User[]> {
		const users = [];

		for (const user of Users) {
			users.push(User.Get(user.TwitchID, user.Name));
		}

		return Promise.all(users);
	}

	static async GetEveryone(): Promise<User[]> {
		const sqlUsers = await Bot.SQL.selectFrom('users').selectAll().execute();

		const users = [];

		for (const user of sqlUsers) {
			users.push(new User(user));
		}

		return users;
	}

	static CleanName(name: string) {
		return name.toLowerCase().replace(/[@#]/g, '');
	}

	static async ResolveTwitchID(id: string[]): Promise<{ Okay: User[]; Failed: string[] }> {
		const searchParams = new URLSearchParams({ id: id.join(',') });

		const response = (await Got('json')
			.get({
				url: `https://api.ivr.fi/v2/twitch/user`,
				searchParams: searchParams,
			})
			.json()) as Ivr.User[];

		if (!response.length) {
			return { Okay: [], Failed: id };
		}

		const Okay = [];
		const Failed = [];

		const promise = await Promise.allSettled(
			response.map(async (user) => {
				const { login, id: twitchID } = user;

				const a = await User.Get(twitchID, login);
				if (a) {
					return a;
				}
				throw new GetSafeError(`User ${login} not found`);
			}),
		);

		Okay.push(
			...(
				promise.filter((p) => p.status === 'fulfilled') as PromiseFulfilledResult<User>[]
			).map((p) => p.value),
		);
		Failed.push(
			...(promise.filter((p) => p.status === 'rejected') as PromiseRejectedResult[]).map(
				(p) => p.reason,
			),
		);

		return { Okay, Failed };
	}

	static async ResolveUsername(username: string): Promise<User> {
		username = User.CleanName(username.toLowerCase());

		const cache = User.Cache.get(username);

		if (cache) {
			return cache;
		}

		const user = await Bot.SQL.selectFrom('users')
			.selectAll()
			.where('name', '=', username)
			.limit(1)
			.executeTakeFirst();

		if (user) {
			const dbUser = new User(user);
			User.Cache.set(username, dbUser);
			return dbUser;
		}

		const response = (await Got('json')
			.get({
				url: `https://api.ivr.fi/v2/twitch/user`,
				searchParams: {
					login: username,
				},
			})
			.json()) as Ivr.User[];

		if (!response.length) {
			throw new GetSafeError(`User ${username} not found`);
		}

		const { login, id } = response[0];

		const newUser = await Bot.SQL.insertInto('users')
			.values({
				name: login,
				twitch_uid: id,
			})
			.returningAll()
			.executeTakeFirst();

		if (!newUser) {
			// FIXME
			Bot.Log.Error(`Failed to create user ${username}.`);

			throw new GetSafeError(`Failed to create user ${username}.`);
		}

		const newIvr = new User(newUser);
		User.Cache.set(login, newIvr);
		return newIvr;
	}

	async GetProfilePicture(): Promise<string> {
		const cached = await Bot.Redis.SGet(`profilepicture:${this.TwitchUID}`);
		if (cached) {
			return cached;
		}

		const user = await Helix.Users([this]);
		if (!user.data.length) {
			return '';
		}

		const url = user.data[0].profile_image_url;

		// Expire in 30 minutes
		await (
			await Bot.Redis.SSet(`profilepicture:${this.TwitchUID}`, url)
		)(60 * 30);

		return url;
	}

	HasSuperPermission(): boolean {
		return this.Role === 'admin' || this.Role === 'moderator';
	}

	async UpdateName(newName: string): Promise<void> {
		const usersWithUid = await Bot.SQL.selectFrom('users')
			.selectAll()
			.where('twitch_uid', '=', this.TwitchUID)
			.orderBy('first_seen', 'asc')
			.execute();

		await Bot.SQL.transaction().execute(async (tx) => {
			Bot.Log.Debug('%o', usersWithUid);

			if (usersWithUid.length <= 1) {
				return tx
					.updateTable('users')
					.set({ name: newName })
					.where('id', '=', this.ID)
					.execute();
			}

			Bot.Log.Warn(
				'%s changed name to %s but there are multiple accounts with the same twitch_uid (%s)',
				this.Name,
				newName,
				this.TwitchUID,
			);

			await tx
				.deleteFrom('users')
				.where('twitch_uid', '=', this.TwitchUID)
				.where('id', '!=', usersWithUid[0].id)
				.execute();

			await tx
				.updateTable('users')
				.set({ name: newName })
				.where('id', '=', this.ID)
				.execute();
		});
	}

	/**
	 * User((1) melon095 : 146910710 - admin - 1/4/2021)
	 */
	toString() {
		return `User((${this.ID}) ${this.Name} : ${this.TwitchUID} - ${
			this.Role
		} - ${this.FirstSeen.toLocaleDateString('no-NB')})`;
	}
}

export async function ResolveInternalID(id: number): Promise<User | null> {
	const user = await Bot.SQL.selectFrom('users')
		.selectAll()
		.where('id', '=', id)
		.executeTakeFirst();

	if (user === undefined) return null;

	const userObject = new Bot.User(user);

	Bot.User.Cache.set(userObject.TwitchUID, userObject);

	return userObject;
}

export async function GetValidTwitchToken(user: User): Promise<string | null> {
	const tokenContainer = await GetUserData(user, UserDataStoreKeys.TwitchToken);

	if (tokenContainer.IsEmpty()) {
		return null;
	}

	const token = tokenContainer.ToJSON<OAuthToken>().unwrap();

	if (token.expires_in < Date.now()) {
		const newToken = await RefreshTwitchToken(token.refresh_token);

		await SetUserData(user, UserDataStoreKeys.TwitchToken, newToken);

		return newToken.access_token;
	}

	return token.access_token;
}

export function RefreshTwitchToken(refresh_token: string) {
	return Strategy.RefreshToken(refresh_token, {
		authenticationMethod: AuthenticationMethod.Query,
		tokenURL: 'https://id.twitch.tv/oauth2/token',
		clientID: Bot.Config.Twitch.ClientID,
		clientSecret: Bot.Config.Twitch.ClientSecret,
	});
}
