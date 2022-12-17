import humanize from 'humanize-duration';
import { NChannel, TTokenFunction, NCommand } from './../Typings/types';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Got from './Got.js';
import { Result } from './result.js';

const VALIDATE_WEBSITE = 'https://id.twitch.tv/oauth2/validate';

export function convertHMS(timeInSeconds: number): string | undefined {
	try {
		const hours = Math.floor(timeInSeconds / 3600); // get hours
		const minutes = Math.floor((timeInSeconds - hours * 3600) / 60); // get minutes
		const seconds = timeInSeconds - hours * 3600 - minutes * 60; //  get seconds
		// add 0 if value < 10; Example: 2 => 02
		let returnValue = '';
		if (hours < 10) {
			returnValue += '0' + hours;
		}
		if (minutes < 10) {
			returnValue += ':0' + minutes;
		}
		if (seconds < 10) {
			returnValue += ':0' + seconds;
		}
		return returnValue;
	} catch (err) {
		console.error(err);
	}
}

export function YMD(): string {
	const date = new Date();
	return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${(
		'0' + date.getDate()
	).slice(-2)}`;
}

export function YMDHMS(): string {
	const date = new Date();
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${(
		'0' + date.getDate()
	).slice(-2)} ${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}:${
		seconds < 10 ? '0' + seconds : seconds
	}`;
}

export const secondsFormat = (input: number): string => {
	return [
		{ y: ~~(input / 31536000) },
		{ mo: ~~((input % 31536000) / 2630000) },
		{ d: ~~(((input % 31536000) % 2630000) / 86400) },
		{ h: ~~((((input % 31536000) % 2630000) % 86400) / 3600) },
		{ m: ~~(((((input % 31536000) % 2630000) % 86400) % 3600) / 60) },
		{ s: ~~(input % 60) },
	]
		.filter((t) => Object.values(t)[0] !== 0)
		.map((t) => String(Object.values(t)) + String(Object.keys(t)))
		.slice(0, 2)
		.join(`, `);
};

export const differenceFormat = (numToDiff: number) =>
	secondsFormat(
		parseInt(Date.now().toString().slice(0, 10)) - parseInt(numToDiff.toString().slice(0, 10)),
	);

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
		Bot.HandleErrors('tools/createToken', new Error(json));
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
		Bot.HandleErrors('tools/token/Bot', new Error(body));
		const newToken = await createToken();

		if (!newToken) return { status: 'ERROR', token: '', error: 'No token' };

		return { status: 'OK', token: newToken, error: '' };
	},
};

export function humanizeDuration(seconds: number): string {
	const shortHumanize = humanize.humanizer({
		language: 'shortEn',
		languages: {
			shortEn: {
				y: () => 'y',
				mo: () => 'mo',
				w: () => 'w',
				d: () => 'd',
				h: () => 'h',
				m: () => 'm',
				s: () => 's',
			},
		},
	});

	const options: humanize.Options = {
		units: ['y', 'mo', 'd', 'h', 'm', 's'],
		largest: 3,
		round: true,
		spacer: '',
	};

	return shortHumanize(seconds * 1000, options);
}

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

export const NChannelFunctions: NChannel.Functions = {
	ModeToCooldown: function (mode: NChannel.Mode): number | null {
		switch (mode) {
			case 'Read':
				return null;
			case 'Write':
				return 1250;
			case 'VIP':
				return 250;
			case 'Moderator':
				return 50;
			default:
				return null;
		}
	},

	CooldownToMode: function (val: number): NChannel.Mode {
		switch (val) {
			case 0:
				return 'Read';
			case 1250:
				return 'Write';
			case 250:
				return 'VIP';
			case 50:
				return 'Moderator';
			default:
				return 'Read';
		}
	},

	DatabaseToMode: function (val: number): NChannel.Mode {
		switch (val) {
			case 0:
				return 'Read';
			case 1:
				return 'Write';
			case 2:
				return 'VIP';
			case 3:
				return 'Moderator';
			default:
				return 'Read';
		}
	},
};

export const NCommandFunctions: NCommand.Functions = {
	DatabaseToMode: function (val: number): NCommand.Mode {
		switch (val) {
			case 0:
				return 'Viewer';
			case 1:
				return 'VIP';
			case 2:
				return 'Moderator';
			case 3:
				return 'Broadcaster';
			case 4:
				return 'Admin';
			default:
				return 'Viewer';
		}
	},

	ModeToDatabase: function (mode: NCommand.Mode): number {
		switch (mode) {
			case 'Viewer':
				return 0;
			case 'VIP':
				return 1;
			case 'Moderator':
				return 2;
			case 'Broadcaster':
				return 3;
			case 'Admin':
				return 4;
			default:
				return 0;
		}
	},
};

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

export const Unping = async (users: string[], message: string): Promise<string> => {
	const unpingUser = (user: string) => `${user[0]}\u{E0000}${user.slice(1)}`;

	return message
		.split(' ')
		.map((x) => {
			const x2 = x.replace(/[@#.,:;?!.,:;\s]/gm, '');

			return users.includes(x2.toLowerCase()) ? unpingUser(x) : x;
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
