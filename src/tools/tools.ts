import { TTokenFunction } from './../Typings/types';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Got from './Got.js';

const VALIDATE_WEBSITE = 'https://id.twitch.tv/oauth2/validate';

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

const createToken = async (): Promise<string | null> => {
	const scopes: string[] = [
		'channel:manage:broadcast',
		'moderation:read',
		'whispers:read',
		'whispers:edit',
		'chat:read',
		'chat:edit',
		'channel:moderate',
	];

	const url = `https://id.twitch.tv/oauth2/token?client_id=${
		Bot.Config.Twitch.ClientID
	}&client_secret=${
		Bot.Config.Twitch.ClientSecret
	}&grant_type=client_credentials&scope=${scopes.join(' ')}`;

	const { statusCode, body } = await Got('json').post(url, { throwHttpErrors: false });

	const json = JSON.parse(body);

	if (statusCode >= 400) {
		Bot.Log.Error('tools/createToken %o', json);
		return null;
	}

	const { access_token, expires_in } = json;

	await (
		await Bot.Redis.SSet('apptoken', access_token)
	)(expires_in);

	return access_token;
};

export const token = {
	async Bot(): Promise<TTokenFunction> {
		const apptoken = await Bot.Redis.SGet('apptoken');

		if (!apptoken) {
			const newToken = await createToken();
			if (!newToken)
				return {
					status: 'ERROR',
					error: 'Could not get new token',
					token: '',
				};
			return { status: 'OK', error: '', token: newToken };
		}

		const token = await Got('json').get(VALIDATE_WEBSITE, {
			headers: {
				Authorization: `Bearer ${apptoken}`,
			},
			throwHttpErrors: false,
		});

		if (token.statusCode === 200) return { status: 'OK', token: apptoken, error: '' };

		const body = JSON.parse(token.body);
		Bot.Log.Error('tools/token/Bot %o', body);
		const newToken = await createToken();

		if (!newToken) return { status: 'ERROR', token: '', error: 'No token' };

		return { status: 'OK', token: newToken, error: '' };
	},
};

export async function Live(id: string): Promise<boolean> {
	const [isLive] = await Bot.SQL.Query<Database.channels[]>`
        SELECT live 
        FROM channels 
        WHERE user_id = ${id}`;

	if (!isLive) return false;
	return Boolean(isLive.live);
}

export async function ViewerList(id: string): Promise<string[]> {
	const viewers = await Bot.Redis.SGet(`channel:${id}:viewers`);
	if (!viewers) return [];
	return JSON.parse(viewers);
}

export const Sleep = async (seconds = 1): Promise<boolean> => {
	return new Promise((Resolve) => {
		setTimeout(() => {
			Resolve(true);
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
export const ExtractAllSettledPromises = <S, E>(
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
