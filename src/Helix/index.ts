import { Method } from 'got';
import { EventsubTypes } from '../Singletons/Redis/Data.Types.js';
import { Helix } from './../Typings/types.js';
import got from './../tools/Got.js';
import { Sleep, GetOrGenerateBotToken, GetVeryPrivatePersonalToken } from './../tools/tools.js';
import { Result, Err, Ok } from './../tools/result.js';
import User from './../controller/User/index.js';
import { chunkArr } from './../tools/generators.js';

export type EventSubQueryStatus =
	| 'enabled'
	| 'webhook_callback_verification_pending'
	| 'webhook_callback_verification_failed'
	| 'notification_failures_exceeded'
	| 'authorization_revoked'
	| 'moderator_removed'
	| 'user_removed'
	| 'version_removed';

export type EventSubFulfilledStatus = 'enabled' | 'webhook_callvack_verification_pending';

interface GetEventsubResponse {
	data: {
		id: string;
		status: EventSubQueryStatus;
		type: string;
		version: string;
		condition: object; // Dependant on type
		created_at: string;
		transport: {
			method: string;
			callback: string;
			secret: string;
		};
		cost: number;
	}[];
	total: number;
	total_cost: number;
	max_total_cost: number;
	pagination: {
		cursor: string;
	};
}

export interface CreateEventSubResponse<T extends object> {
	data: {
		id: string;
		status: EventSubFulfilledStatus;
		type: EventsubTypes;
		version: string;
		condition: T;
		created_at: string;
		transport: {
			method: 'webhook';
			callback: string;
		};
		cost: number;
	}[];
	total: number;
	total_cost: number;
	max_total_cost: number;
}

export class EventSubSubscription {
	private readonly _id: string;
	private readonly _status: EventSubFulfilledStatus;
	private readonly _type: EventsubTypes;

	constructor(id: string, status: EventSubFulfilledStatus, type: EventsubTypes) {
		this._id = id;
		this._status = status;
		this._type = type;
	}

	public toString(): string {
		return JSON.stringify({
			status: this._status,
			type: this._type,
		});
	}

	public toRedis(): [string, string] {
		return [this._id, this.toString()];
	}

	public ID = () => this._id;
	public Status = () => this._status;
	public Type = () => this._type;
}

// TODO: Handle different types of conditions.
export type DefaultEventsubCondition = {
	type: EventsubTypes;
	broadcaster_user_id: string;
};

interface RequestOpts {
	CustomHeaders?: Record<string, string>;
}

const BASE_URL = 'https://api.twitch.tv/helix/';

const _createHeaders = async (): Promise<Record<string, string>> => {
	const token = await GetOrGenerateBotToken();

	return {
		'Client-ID': Bot.Config.Twitch.ClientID,
		Authorization: `Bearer ${token}`,
	};
};

const _request = async <T>(
	method: Method,
	path: string,
	options: { params?: URLSearchParams; body?: object } = {},
	requestOpts: RequestOpts = {},
): Promise<Result<T, string>> => {
	let headers;
	try {
		headers = await _createHeaders();
	} catch (e) {
		// FIXME: cleanup
		return new Err((e as Error).message);
	}
	const url = `${BASE_URL}${path}`;

	options.body && (headers['Content-Type'] = 'application/json');

	if (requestOpts.CustomHeaders) {
		Object.assign(headers, requestOpts.CustomHeaders);
	}

	const response = await got('default')(url, {
		method,
		headers,
		searchParams: options.params,
		json: options.body,
	});

	if (response.statusCode >= 400) {
		Bot.Log.Warn(
			`%s - Helix request failed with status code %d - %s`,
			path,
			response.statusCode,
			response.body,
		);

		return new Err(response.body);
	}

	const json = JSON.parse(response.body) as T;
	return new Ok(json);
};

/**
 * Helper function for dealing with pagination
 */
async function DoPagination<ResponseBody extends { pagination: { cursor: string } }>(
	doRequestFn: (pagination: string) => Promise<Result<ResponseBody, string>>,
	onDataReceived: (body: ResponseBody) => void,
) {
	let pagination = '';

	do {
		const response = await doRequestFn(pagination);

		if (response.err) {
			return;
		}

		onDataReceived(response.inner);

		pagination = response.inner.pagination.cursor;
	} while (pagination);
}

export default {
	EventSub: {
		Create: async function <T extends object = DefaultEventsubCondition>(
			type: EventsubTypes,
			condition: T,
		) {
			const { PublicUrl, Secret } = Bot.Config.EventSub;
			if (!PublicUrl || !Secret) {
				return new Err('EventSub is not configured');
			}

			const url = `eventsub/subscriptions`;
			const body = {
				type,
				version: '1',
				condition,
				transport: {
					method: 'webhook',
					callback: PublicUrl + '/eventsub',
					secret: Secret,
				},
			};

			return _request<CreateEventSubResponse<T>>('POST', url, { body });
		},
		Get: async function (status: EventSubQueryStatus, type: EventsubTypes) {
			const done: Omit<GetEventsubResponse, 'pagination'> = {
				data: [],
				total: 0,
				total_cost: 0,
				max_total_cost: 0,
			};
			const params = new URLSearchParams();

			status && params.append('status', status);
			type && params.append('type', type);
			const url = 'eventsub/subscriptions';

			await DoPagination<GetEventsubResponse>(
				(pagination) => {
					if (pagination) {
						params.append('after', pagination);
					}

					return _request('GET', url, { params });
				},
				(body) => {
					const { data, max_total_cost, total, total_cost } = body;

					done.data.push(...data);
					done.max_total_cost = max_total_cost;
					done.total = total;
					done.total_cost = total_cost;
				},
			);

			return new Ok(done);
		},
		Delete: async function (id: string) {
			const url = 'eventsub/subscriptions';

			const params = new URLSearchParams();
			params.append('id', id);

			return _request('DELETE', url, { params });
		},
	},
	Users: async (users: User[], opts: RequestOpts = {}): Promise<Helix.Users> => {
		const done: Helix.User[] = [];

		await Promise.all(
			[...chunkArr(users, 100)].map(async (chunk, i) => {
				// Rate limit ... 0, 500, 1000, etc. Unsure if this is a good way to do it.
				// 150 requests per second is the limit, this should be fine.
				await Sleep(i * 500);

				const url = new URLSearchParams();

				chunk.map((u) => url.append('id', u.TwitchUID));

				Bot.Log.Info('Helix Users request %O', { size: chunk.length });

				const res = await _request<Helix.Users>('GET', 'users', { params: url }, opts);

				if (res.err) {
					return;
				}

				const { data } = res.inner;

				done.push(...data);
			}),
		);

		return { data: done };
	},
	Stream: async (
		users: User[],
		opts: RequestOpts = {},
	): Promise<{ data: Helix.Stream['data']; notLive: User[] }> => {
		const promises = [...chunkArr(users, 100)].map(async (channels) => {
			const url = new URLSearchParams();

			channels.map((c) => url.append('user_id', c.TwitchUID));

			const res = await _request<Helix.Stream>('GET', 'streams', { params: url }, opts);

			if (res.err) {
				return { 0: { data: [] as Helix.Stream['data'] }, 1: [] as User[] };
			}

			const notLive = channels.filter(
				(c) => !res.inner.data.find((s) => s.user_id === c.TwitchUID),
			);

			return { 0: res.inner.data, 1: notLive };
		}) as Promise<[Helix.Stream['data'], User[]]>[];

		const result = await Promise.all(promises);
		const data = result.map((r) => r[0]).flat();
		const notLive = result.map((r) => r[1]).flat();

		return { data, notLive };
	},
	/**
	 * @returns A set of logins of all the viewers in the channel
	 */
	Viewers: async function (
		identifier: { broadcaster: string; moderator?: string },
		userToken: string,
	): Promise<Set<string>> {
		const users = new Set<string>();

		const params = new URLSearchParams();

		params.append('broadcaster_id', identifier.broadcaster);
		params.append('moderator_id', identifier.moderator || identifier.broadcaster);
		params.append('first', '1000');

		await DoPagination<Helix.ViewerList>(
			async (pagination) => {
				if (pagination) {
					params.append('after', pagination);
				}

				return _request(
					'GET',
					'chat/chatters',
					{ params },
					{
						CustomHeaders: {
							Authorization: `Bearer ${userToken}`,
						},
					},
				);
			},
			(body) => {
				const { data } = body;

				for (const user of data) {
					users.add(user.user_login);
				}
			},
		);

		return users;
	},
	Whisper: async function (message: string, user_id_recipient: string): Promise<void> {
		const token = await GetVeryPrivatePersonalToken();
		const url = `${BASE_URL}whispers`;

		const response = await got('default')(url, {
			method: 'POST',
			headers: {
				'Client-ID': Bot.Config.Twitch.ClientID,
				Authorization: `Bearer ${token}`,
			},
			searchParams: {
				from_user_id: String(Bot.ID),
				to_user_id: user_id_recipient,
			},
			json: {
				message,
			},
		});

		if (response.statusCode !== 201) {
			Bot.Log.Warn(
				'Failed to send whisper %i %O',
				response.statusCode,
				JSON.parse(response.body),
			);
		}
	},
	Raw: <T>() => _request<T>,
};
