import axios from 'axios';
import humanize from 'humanize-duration';
import { NChannel, Database, Token, TTokenFunction, NCommand } from './../Typings/types';
import { ChatUserstate } from 'tmi.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const VALIDATE_WEBSITE = 'https://id.twitch.tv/oauth2/validate';
const REFRESH_WEBSITE = 'https://id.twitch.tv/oauth2/token';

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
		'chat:read',
		'chat:edit',
		'channel:moderate',
	];

	const newToken = await axios(
		`https://id.twitch.tv/oauth2/token?client_id=${Bot.Config.Twitch.ClientID}&client_secret=${
			Bot.Config.Twitch.ClientSecret
		}&grant_type=client_credentials&scope=${scopes.join(' ')}`,
		{
			method: 'POST',
			headers: {
				accepts: 'application/json',
			},
		},
	)
		.then((res) => res.data)
		.then((data) => {
			return {
				access: data.access_token,
				expires: data.expires_in,
			};
		})
		.catch((err) => {
			console.log(err);
			return null;
		});

	if (!newToken) return null;

	await Bot.Redis.SSet('apptoken', newToken.access);
	await Bot.Redis.Expire('apptoken', newToken.expires);
	return newToken.access;
};

export const token: Token = {
	async User(id: number): Promise<TTokenFunction> {
		const result: TTokenFunction = { status: 'OK', error: '', token: '' };
		// Validate token [https://dev.twitch.tv/docs/authentication#validating-requests]
		try {
			const [access_token] = await Bot.SQL.Query<Database.tokens[]>`
                        SELECT access_token 
                        FROM tokens 
                        WHERE id = ${id}`;

			if (!access_token) {
				return {
					status: 'MESSAGE',
					error: `Sorry, user is not in our database. Please login: [ ${Bot.Config.Website.WebUrl} ]`,
					token: '',
				};
			}

			const verifiedToken: string = await axios
				.get(VALIDATE_WEBSITE, {
					headers: {
						Authorization: `Bearer ${access_token.access_token}`,
					},
				})
				.then((data) => {
					// Token works, no further action is required
					// [TODO]: Use better logger. lol.
					console.log(
						`${id} has requested their access token and is alive for ${convertHMS(
							data.data.expires_in,
						)} hours`,
					);
					return access_token.access_token;
				})
				.catch(async (error) => {
					if (error.response.data['message'] === 'invalid access token') {
						// // https://discuss.dev.twitch.tv/t/status-400-missing-client-id-when-refreshing-user-token-with-granttype-refresh-token-on-postman-it-works/26371/2
						// Refresh token
						const [refresh_token] = await Bot.SQL.Query<Database.tokens[]>`
                                    SELECT refresh_token 
                                    FROM tokens 
                                    WHERE id = ${id}`;

						if (!refresh_token) return;

						const params: URLSearchParams = new URLSearchParams();
						params.append('grant_type', 'refresh_token');
						params.append('refresh_token', refresh_token.refresh_token);
						params.append('client_id', Bot.Config.Twitch.ClientID);
						params.append('client_secret', Bot.Config.Twitch.ClientSecret);

						const token = await axios({
							method: 'POST',
							url: REFRESH_WEBSITE,
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
							},
							data: params.toString(),
						})
							.then((data) => data.data)
							.then((data) => {
								Bot.SQL.Query`
                                    UPDATE tokens 
                                    SET 
                                        access_token = ${data.access_token}, 
                                        refresh_token = ${data.refresh_token} 
                                    WHERE id = ${id}`.execute();

								return data.access_token;
							})
							.catch((error) => {
								if (error.data.message === 'Invalid refresh token')
									throw `The broadcaster is required to login to [ ${Bot.Config.Website.WebUrl} ] again.`;
								console.log(error);
								throw error;
							});
						return token;
					}
				});
			result.status = 'OK';
			result.token = verifiedToken;
		} catch (error) {
			return {
				status: 'ERROR',
				token: '',
				error: error as string,
			};
		}
		return result;
	},

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

		const token = await axios(VALIDATE_WEBSITE, {
			method: 'GET',
			headers: {
				accepts: 'application/json',
				Authorization: `Bearer ${apptoken}`,
			},
		})
			.then(() => {
				return apptoken;
			})
			.catch(async (err) => {
				// Token has either ran out or something actually failed
				// [TODO]: Better error handling.
				// Currently no idea if the token has actually failed as i can't find any documentation regarding this.
				// https://dev.twitch.tv/docs/authentication#validating-requests
				console.log(err);

				return await createToken();
			});

		if (!token) return { status: 'ERROR', token: '', error: 'No token' };

		return { status: 'OK', token: token, error: '' };
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

export function isMod(user: ChatUserstate, channel: string): boolean {
	const isMod = user.mod || user['user-type'] === 'mod';
	const isBroadcaster = channel === user.username;
	const isModUp = isMod || isBroadcaster;
	return isModUp;
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
