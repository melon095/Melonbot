import { Method, Response } from 'got';
import { TPubRecType } from 'Singletons/Redis/Data.Types.js';
import { Helix } from './../Typings/types.js';
import got from './../tools/Got.js';
import { token } from './../tools/tools.js';
import User from './../controller/User/index.js';

type EventSubQueryStatus =
	| 'enabled'
	| 'webhook_callback_verification_pending'
	| 'webhook_callback_verification_failed'
	| 'authorization_revoked'
	| 'user_removed';

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

interface CreateEventSubResponse {
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
}

interface DefaultEventsubCondition {
	broadcaster_user_id: string;
}

const BASE_URL = 'https://api.twitch.tv/helix/';

const _createHeaders = async (): Promise<Record<string, string>> => {
	const { error, token: t, status } = await token.Bot();
	if (status === 'ERROR') {
		throw error;
	}

	return {
		'Client-ID': Bot.Config.Twitch.ClientID,
		Authorization: `Bearer ${t}`,
	};
};

// TODO: Scrap this
const _request = async <T>(
	method: Method,
	path: string,
	options: { params?: URLSearchParams; body?: object } = {},
): Promise<T> => {
	const headers = await _createHeaders();
	const url = `${BASE_URL}${path}`;

	options.body && (headers['Content-Type'] = 'application/json');

	const response = await got('default')(url, {
		method,
		headers,
		searchParams: options.params,
		json: options.body,
		throwHttpErrors: false,
	});

	if (response.statusCode >= 400) {
		Bot.HandleErrors(
			`${path} - Helix request failed with status code ${response.statusCode}`,
			response.body,
		);
		throw new Error(`Helix request failed with status code ${response.statusCode}`);
	}

	const json = JSON.parse(response.body) as T;
	return json;
};

export default {
	// EventSub: {
	// 	Create: async function (
	// 		type: TPubRecType,
	// 		version: string | '1',
	// 		condition: DefaultEventsubCondition | object,
	// 	) {
	// 		return new Promise((Resolve, Reject) => {
	// 			const url = `eventsub/subscriptions`;
	// 			const body = {
	// 				type,
	// 				version,
	// 				condition,
	// 				transport: {
	// 					method: 'webhook',
	// 					callback: Bot.Config.EventSub.PublicUrl + '/eventsub',
	// 					secret: Bot.Config.EventSub.Secret,
	// 				},
	// 			};

	// 			_request('POST', url, { body })
	// 				.then((res: CreateEventSubResponse) => {
	// 					console.info('Helix: EventSub.Create', {
	// 						type,
	// 						condition,
	// 					});
	// 					Resolve(res);
	// 				})
	// 				.catch(() => Reject());
	// 		});
	// 	},
	// 	Delete: async function (user_id: string): Promise<void> {
	// 		/*
	//             TODO:
	//             Can't filter by a condition.
	//             Rather track ids internally.
	//             Crontab which collects all of them.
	//             Then store them based off the condition.
	//             Most conditions use broadcaster_user_id. Can just create something simple.
	//         */

	// 		return new Promise((Resolve, Reject) => {
	// 			Reject(new Error('Not implemented'));
	// 			// const list: string[] = [];
	// 			// let pagination = "";

	// 			// do {
	// 			//     const res = await this.Get();

	// 			//     pagination = res.pagination.cursor ??= "";
	// 			//     res.data.map((e) => list.push(e.id));

	// 			// } while (pagination === ""); // Checks after execution

	// 			// const url = new URLSearchParams('eventsub/subscriptions');

	// 			// url.append('id', id);

	// 			// _request('DELETE', url.toString())
	// 			// 	.then(() => {
	// 			//         console.info("Helix: EventSub.Delete", { user_id });
	// 			//         Resolve()
	// 			//     })
	// 			// 	.catch(() => Reject());
	// 		});
	// 	},
	// 	Get: async function (
	// 		status?: EventSubQueryStatus,
	// 		type?: TPubRecType,
	// 		after?: string,
	// 	): Promise<GetEventsubResponse> {
	// 		return new Promise((Resolve, Reject) => {
	// 			const url = new URLSearchParams('eventsub/subscriptions');

	// 			status && url.append('status', status);
	// 			type && url.append('type', type);
	// 			after && url.append('after', after);

	// 			_request('GET', url.toString())
	// 				.then((res: GetEventsubResponse) => {
	// 					console.info('Helix: EventSub.Get', {
	// 						status,
	// 						type,
	// 						after,
	// 					});
	// 					Resolve(res);
	// 				})
	// 				.catch(() => Reject());
	// 		});
	// 	},
	// },
	Users: async (users: User[]): Promise<Helix.Users> => {
		const url = new URLSearchParams();

		users.map((u) => url.append('id', u.TwitchUID));

		return await _request('GET', 'users', { params: url });
	},
};
