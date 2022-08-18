import { Method, Response } from 'got';
import { TPubRecType } from 'Singletons/Redis/Data.Types.js';
import got from './../tools/Got.js';
import { token } from './../tools/tools.js';

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
	return {
		'Client-ID': Bot.Config.Twitch.ClientID,
		Authorization: `Bearer ${(await token.Bot()).token}`,
	};
};

const _request = async (
	method: Method,
	path: string,
	body?: object,
): Promise<any> => {
	return new Promise(async (Resolve, Reject) => {
		const headers = await _createHeaders();
		const url = `${BASE_URL}${path}`;

		body && (headers['Content-Type'] = 'application/json');

		let response: Response<string> | Error;

		got(url, {
			method,
			headers,
			json: body,
		})
			.then((res) => {
				response = res;
			})
			.catch((error) => {
				response =
					error.response && error.response.body
						? new Error(error.response.body)
						: new Error(error);
				Bot.HandleErrors(`Helix: ${path}`, response);
			})
			.finally(() => {
				if (response instanceof Error) Reject();
				else {
					try {
						Resolve(JSON.parse(response.body));
					} catch (err) {
						Reject();
					}
				}
			});
	});
};

export default {
	EventSub: {
		Create: async function (
			type: TPubRecType,
			version: string | '1',
			condition: DefaultEventsubCondition | object,
		) {
			return new Promise((Resolve, Reject) => {
				const url = `eventsub/subscriptions`;
				const body = {
					type,
					version,
					condition,
					transport: {
						method: 'webhook',
						callback: Bot.Config.EventSub.PublicUrl + '/eventsub',
						secret: Bot.Config.EventSub.Secret,
					},
				};

				_request('POST', url, body)
					.then((res: CreateEventSubResponse) => {
						console.info('Helix: EventSub.Create', {
							type,
							condition,
						});
						Resolve(res);
					})
					.catch(() => Reject());
			});
		},
		Delete: async function (user_id: string): Promise<void> {
			/*
                TODO:
                Can't filter by a condition.
                Rather track ids internally.
                Crontab which collects all of them.
                Then store them based off the condition.
                Most conditions use broadcaster_user_id. Can just create something simple.
            */

			return new Promise((Resolve, Reject) => {
				Reject(new Error('Not implemented'));
				// const list: string[] = [];
				// let pagination = "";

				// do {
				//     const res = await this.Get();

				//     pagination = res.pagination.cursor ??= "";
				//     res.data.map((e) => list.push(e.id));

				// } while (pagination === ""); // Checks after execution

				// const url = new URLSearchParams('eventsub/subscriptions');

				// url.append('id', id);

				// _request('DELETE', url.toString())
				// 	.then(() => {
				//         console.info("Helix: EventSub.Delete", { user_id });
				//         Resolve()
				//     })
				// 	.catch(() => Reject());
			});
		},
		Get: async function (
			status?: EventSubQueryStatus,
			type?: TPubRecType,
			after?: string,
		): Promise<GetEventsubResponse> {
			return new Promise((Resolve, Reject) => {
				const url = new URLSearchParams('eventsub/subscriptions');

				status && url.append('status', status);
				type && url.append('type', type);
				after && url.append('after', after);

				_request('GET', url.toString())
					.then((res: GetEventsubResponse) => {
						console.info('Helix: EventSub.Get', {
							status,
							type,
							after,
						});
						Resolve(res);
					})
					.catch(() => Reject());
			});
		},
	},
};
