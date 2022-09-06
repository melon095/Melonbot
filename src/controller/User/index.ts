import Got from './../../tools/Got.js';
import { JWTData } from 'web/index.js';
import { UserRole } from './../../Typings/models/bot/index.js';
import Helix from './../../Helix/index.js';

export class GetSafeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GetSafeError';
	}
}

export interface TwitchToken {
	access_token: string;
	refresh_token: string;
	expires_in: number;
}

export interface UserSettings {
	Eventsub: boolean;
	// [key: string]: string | boolean;
}

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

	public readonly ID: number;
	public readonly Name: string;
	public readonly TwitchUID: string;
	public readonly Role: UserRole;
	public readonly FirstSeen: Date;

	constructor(user: Database.users) {
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

		// Check if exists in database
		const dbUser = await Bot.SQL.Query<Database.users[]>`
            SELECT * FROM users
            WHERE name = ${Name}
            LIMIT 1
        `;

		if (dbUser.length) {
			const user = new User(dbUser[0]);
			User.Cache.set(Name, user);
			return user;
		}

		if (options.throwOnNotFound) {
			throw new GetSafeError(`User ${Name} not found in database.`);
		}

		// Create new user
		const newUser = await Bot.SQL.Query<Database.users[]>`
            INSERT INTO users (name, twitch_uid, role)
            VALUES (${Name}, ${TwitchID}, 'user')
            RETURNING *
        `;

		const user = new User(newUser[0]);
		User.Cache.set(Name, user);
		return user;
	}

	static async GetMultiple(Users: { TwitchID: string; Name: string }[]): Promise<User[]> {
		const users = [];

		for (const user of Users) {
			users.push(await User.Get(user.TwitchID, user.Name));
		}

		return users;
	}

	async SetToken(
		token: TwitchToken,
		JWTGenerator: (data: JWTData) => Promise<string>,
	): Promise<string> {
		const jwt = await JWTGenerator({
			id: this.TwitchUID,
			name: this.Name,
			v: 1,
		});

		// Expire in 7 das, same as jwt does.
		(await Bot.Redis.SSet(`session:${this.TwitchUID}:${this.Name}`, jwt))(60 * 60 * 24 * 7);

		// Store TwitchToken aswell
		await Bot.Redis.SSet(`token:${this.TwitchUID}:${this.Name}`, JSON.stringify(token));

		return jwt;
	}

	async GetProfilePicture(): Promise<string> {
		const cached = await Bot.Redis.SGet(`profilepicture:${this.TwitchUID}`);
		if (cached) {
			return cached;
		}

		const user = await Helix.Users([this]);

		const url = user.data[0].profile_image_url;

		// Expire in 30 minutes
		await (
			await Bot.Redis.SSet(`profilepicture:${this.TwitchUID}`, url)
		)(60 * 30);

		return url;
	}

	async RemoveBanphrase(id: number): Promise<'ACK'> {
		await Bot.SQL.Query<Database.banphrases[]>`
            DELETE FROM banphrases
            WHERE id = ${id}
        `;

		return 'ACK';
	}

	async GetSettings(): Promise<UserSettings> {
		const DefaultOptions: UserSettings = { Eventsub: false };

		const Options = await Bot.Redis.SGet(`user:${this.TwitchUID}:options`).then((options) => {
			if (!options) return DefaultOptions;
			return JSON.parse(options);
		});

		return Options;
	}

	async SetSettings(options: UserSettings): Promise<'ACK'> {
		await Bot.Redis.SSet(`user:${this.TwitchUID}:options`, JSON.stringify(options));
		return 'ACK';
	}
}
