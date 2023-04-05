import assert from 'node:assert';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { RefreshTwitchToken } from '../controller/User/index.js';
import Strategy from '../web/oauth.js';
import Got from './Got.js';

type TSecondsConvertions = {
	fy: number;
	y: number;
	mo: number;
	d: number;
	h: number;
	m: number;
	s: number;
};

const defaultSecondsConvertions: TSecondsConvertions = {
	fy: 0,
	y: 0,
	mo: 0,
	d: 0,
	h: 0,
	m: 0,
	s: 0,
};

/*
    Uhh made by brian6932 :)
*/
const secondsConverter = function (this: TSecondsConvertions, input: number): TSecondsConvertions {
	input -= 0;
	const y = 31_536_000;
	const mo = 2_629_757;
	const d = 86_400;
	const h = 3_600;
	const m = 60;
	let remainder;

	this.fy = ~~((input + 62_125_938_000) / y) - -1;
	this.y = ~~(input / y);
	this.mo = ~~((remainder = input - y * this.y) / mo);
	this.d = ~~((remainder -= mo * this.mo) / d);
	this.h = ~~((remainder -= d * this.d) / h);
	this.m = ~~((remainder -= h * this.h) / m);
	this.s = ~~(input % m);
	return this;
};

export const SecondsFmt = (input: number, join = ', ', limit = 2): string => {
	return Object.entries(secondsConverter.call(defaultSecondsConvertions, input))
		.filter((t) => t[1])
		.slice(1)
		.map((t) => t[1] + t[0])
		.slice(0, limit)
		.join(join);
};

export const DifferenceFmt = (numToDiff: number, join = ', '): string => {
	return SecondsFmt(~~(Date.now() * 0.001) - Number(String(numToDiff).slice(0, 10)), join);
};

const TWITCH_BOT_TOKEN_SCOPES = [
	'channel:manage:broadcast',
	'moderation:read',
	'whispers:read',
	'whispers:edit',
	'chat:read',
	'chat:edit',
	'channel:moderate',
].join(' ') as string;

const TWITCH_VALIDATE_WEBSITE = 'https://id.twitch.tv/oauth2/validate' as const;

function CreateOauth2TokenURL(): string {
	const { ClientID, ClientSecret } = Bot.Config.Twitch;

	const url = new URL('https://id.twitch.tv/oauth2/token');

	url.searchParams.append('client_id', ClientID);
	url.searchParams.append('client_secret', ClientSecret);
	url.searchParams.append('grant_type', 'client_credentials');
	url.searchParams.append('scope', TWITCH_BOT_TOKEN_SCOPES);

	return url.toString();
}

async function GenerateNewBotToken(): Promise<string> {
	const url = CreateOauth2TokenURL();

	const { statusCode, body } = await Got('json').post(url);

	switch (statusCode) {
		case 200:
			const json = JSON.parse(body);

			const { access_token, expires_in } = json;
			const clear_token_fn = await Bot.Redis.SSet('apptoken', access_token);

			clear_token_fn(expires_in);
			return access_token;
		default:
			throw new Error(`Could not generate new token. ${statusCode} ${body}`);
	}
}

/**
 * Fetches a valid App access token for the bot.
 */
export async function GetOrGenerateBotToken(): Promise<string> {
	const apptoken = await Bot.Redis.SGet('apptoken');

	if (!apptoken) {
		return GenerateNewBotToken();
	}

	const validate = await Got('json')({
		url: TWITCH_VALIDATE_WEBSITE,
		headers: {
			Authorization: `Bearer ${apptoken}`,
		},
	});

	switch (validate.statusCode) {
		case 200: {
			return apptoken;
		}

		case 401: {
			return GenerateNewBotToken();
		}

		default: {
			throw new Error(`Failed to validate token -> ${validate.statusCode} ${validate.body}}`);
		}
	}
}

/**
 * Fetches a User Access token for the bot.
 */
export async function GetVeryPrivatePersonalToken(): Promise<string> {
	const [access, refresh] = await Promise.all([
		Bot.Redis.SGet('UserToken:Access'),
		Bot.Redis.SGet('UserToken:Refresh'),
	]);

	assert(access && refresh, 'No user token found!');

	const validate = await Got('json')({
		url: TWITCH_VALIDATE_WEBSITE,
		headers: {
			Authorization: `Bearer ${access}`,
		},
	});

	switch (validate.statusCode) {
		case 200:
			return access;

		case 401: {
			const result = await RefreshTwitchToken(refresh);

			await Bot.Redis.SSet('UserToken:Access', result.access_token);

			return result.access_token;
		}

		default: {
			throw new Error(`Failed to validate token -> ${validate.statusCode} ${validate.body}}`);
		}
	}
}

export async function Live(id: string): Promise<boolean> {
	const isLive = await Bot.SQL.selectFrom('channels')
		.select('live')
		.where('user_id', '=', id)
		.executeTakeFirst();

	return Boolean(isLive?.live);
}

export const Sleep = async (seconds = 1): Promise<void> => {
	return new Promise((Resolve) => {
		setTimeout(() => {
			Resolve();
		}, seconds);
	});
};

// Generate random number with fixed length and return as number
export const RandomNumber = (length: number): number => {
	let result = '';
	const characters = '0123456789';
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return Number(result);
};

/**
 * @param url - import.meta.url
 * @returns
 */
export const getDirname = (url: string) => dirname(fileURLToPath(url));

/**
 * Import that actually works
 * @returns Module
 */
export const Import = async (folder: string, route: string) =>
	await (
		await import(join('file://', folder, route))
	).default;

export const UnpingUser = (user: string) => `${user[0]}\u{E0000}${user.slice(1)}`;
export const Unping = async (users: string[], message: string): Promise<string> => {
	return message
		.split(' ')
		.map((x) => {
			const x2 = x.replace(/[@#.,:;?!.,:;\s]/gm, '');

			return users.includes(x2.toLowerCase()) ? UnpingUser(x) : x;
		})
		.join(' ');
};

/**
 * UnwrapPromise takes in an array of promises and returns an array of resolved, rejected values.
 */
export const UnwrapPromises = async <T, E>(promises: Promise<T>[]): Promise<[T[], E[]]> => {
	const results = await Promise.allSettled(promises);

	const success: T[] = [];
	const error: E[] = [];

	results.map((result) => {
		if (result.status === 'fulfilled') {
			success.push(result.value);
		} else {
			error.push(result.reason);
		}
	});

	return [success, error];
};

export const UppercaseFirst = (str: string): string => {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Returns a tuple of [success, error]
 */
export const ExtractAllSettledPromises = <S = void, E = Error>(
	promises: PromiseSettledResult<S>[],
): [S[], E[]] => {
	const success: S[] = [];
	const error: E[] = [];

	promises.map((result) => {
		if (result.status === 'fulfilled') {
			success.push(result.value);
		} else {
			error.push(result.reason);
		}
	});

	return [success, error];
};
