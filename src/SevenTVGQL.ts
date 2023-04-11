import got from 'got';
import Got from './tools/Got.js';
import User from './controller/User/index.js';
import { GetChannelData } from './IndividualData.js';
import { ThirdPartyError } from './Models/Errors.js';
import { Sleep } from './tools/tools.js';
import PQeueue from 'p-queue';

const url = 'https://7tv.io/v3/gql';

let api = got.extend();

export interface SevenTVChannelIdentifier {
	Channel: string;
	EmoteSet: string;
}

export enum ConnectionPlatform {
	TWITCH = 'TWITCH',
	YOUTUBE = 'YOUTUBE',
}

export interface Editor {
	id: string;
	user: {
		username: string;
		connections: {
			id: string;
			platform: ConnectionPlatform;
		}[];
	};
}

interface Base<T> {
	errors?: {
		message: string;
		path: string[];
		extensions: {
			code: number;
			fields: object;
			message: string;
		};
	}[];
	data: T;
}

interface GetCurrentUser {
	user: {
		id: string;
		username: string;
		connections: {
			id: string;
			platform: ConnectionPlatform;
		}[];
		editor_of: Editor[];
		emotes_sets: {
			id: string;
		}[];
	};
}

export interface EmoteSet {
	id: string;
	name: string;
}

export interface EnabledEmote {
	id: string;
	name: string;
	data: {
		/**
		 * Original name. Emote is an alias if $.data.name does not match with $.name
		 */
		name: string;
	};
	IsAlias: () => boolean;
}

export interface EmoteSearchResult {
	emotes: {
		count: number;
		items: (EmoteSet & {
			/** Nullable on the chance the user is deleted */
			owner: {
				username: string;
				id: string;
			} | null;
		})[];
	};
}

interface UserEditor {
	user: {
		id: string;
		username: string;
		editors: Editor[];
	};
}

interface Connections {
	user: {
		connections: {
			platform: ConnectionPlatform;
			emote_set_id: string;
		}[];
	};
}

export interface ChangeEmoteInset {
	emoteSet: {
		id: string;
		emotes: {
			id: string;
			name: string;
		}[];
	};
}

export interface V3User {
	id: string;
	type: string;
	username: string;
	created_at: string;
	avatar_url: string;
	roles: string[];
	connections: {
		id: string;
		platform: ConnectionPlatform;
		emote_set_id: string;
	}[];
	emote_sets: {
		id: string;
		emotes: {
			id: string;
		}[];
		capacity: number;
	}[];
}

interface UpdateUserEditors {
	editors: {
		id: string;
	}[];
}

type ModifyData = {
	okay: boolean;
	message: string;
	emote_set?: string;
	user_id?: string;
};

enum EmoteSearchCategory {
	TOP = 'TOP',
	TRENDING_DAY = 'TRENDING_DAY',
	TRENDING_WEEK = 'TRENDING_WEEK',
	TRENDING_MONTH = 'TRENDING_MONTH',
	FEATURED = 'FEATURED',
	NEW = 'NEW',
	GLOBAL = 'GLOBAL',
}

export type EmoteSearchFilter = {
	category?: EmoteSearchCategory;
	case_sensitive?: boolean;
	exact_match?: boolean;
	ignore_tags?: boolean;
};

export enum UserEditorPermissions {
	// Modify emotes
	DEFAULT = 17,
	// Modify emotes + add/remove editors
	EDITOR = 81,
	// Removes the user.
	NONE = 0,
}

export enum ListItemAction {
	ADD = 'ADD',
	REMOVE = 'REMOVE',
	UPDATE = 'UPDATE',
}

/**
 * Requests made from a command should have a higher priority
 */
const GetPriorityValue = (isFromUserCommand: boolean) => (isFromUserCommand ? 1 : 0);

const RATELIMIT_HEADERS = {
	limit: 'X-Ratelimit-Limit'.toLowerCase(),
	remaining: 'X-Ratelimit-Remaining'.toLowerCase(),
	reset: 'X-Ratelimit-Reset'.toLowerCase(),
} as const;

const RatelimitQueue = new PQeueue({ concurrency: 25, timeout: 10000 });

function RatelimitSleep(time: number) {
	RatelimitQueue.pause();

	setTimeout(() => {
		RatelimitQueue.start();
	}, time * 1000);
}

async function MakeGQLReqeust<ResponseBody>(
	query: string,
	variables: object = {},
): Promise<ResponseBody> {
	const response = await api.post({
		json: {
			query,
			variables,
		},
	});

	const [limit, remaining, reset] = [
		response.headers[RATELIMIT_HEADERS.limit],
		response.headers[RATELIMIT_HEADERS.remaining],
		response.headers[RATELIMIT_HEADERS.reset],
	];

	if (remaining == '0') {
		Bot.Log.Info(
			'SevenTV GQL ratelimit reached, initiating sleep next time a request is made. %O',
			{
				limit,
				remaining,
				reset,
			},
		);

		RatelimitSleep(~~(reset as string));
	}

	const data = JSON.parse(response.body) as Base<ResponseBody>;

	if (data.errors) {
		throw new ThirdPartyError(data.errors[0].message);
	}

	return data.data;
}

function Add<ResponseBody>(
	query: string,
	variables: object = {},
	priority: number = 0,
): Promise<ResponseBody> {
	return new Promise((Resolve, Reject) => {
		RatelimitQueue.add(() => MakeGQLReqeust<ResponseBody>(query, variables), {
			/* Needs this so .then is not void | ResponseBody */
			throwOnTimeout: true,
			priority,
		}).then(
			(res) => Resolve(res),
			(error) => Reject(error),
		);
	});
}

export default {
	setup: (Bearer: string) => {
		api = Got['Default'].extend({
			prefixUrl: url,
			headers: {
				Authorization: `Bearer ${Bearer}`,
				'Content-Type': 'application/json',
			},
			hooks: {
				beforeError: [
					(error) => {
						const { response } = error;
						if (response && response.body) {
							const { body } = response;
							try {
								const json = JSON.parse(body as string);
								Bot.Log.Error('7TV GQL Error %O', {
									input: error.options.body,
									errors: JSON.stringify(json.errors),
									code: response.statusCode,
								});
							} catch {
								Bot.Log.Warn(
									'7TV GQL Most likely recevied an Cloudflare issue %O',
									{
										input: error.options.body,
										code: response.statusCode,
									},
								);
							}
						}
						return error;
					},
				],
			},
		});
	},
	getUserEmoteSets: async (id: string, priority = false): Promise<GetCurrentUser> => {
		const body = await Add<GetCurrentUser>(
			`query GetCurrentUser ($id: ObjectID!) {
                user (id: $id) {
                    id
                    username
                    connections {
                        id
                        platform
                    }
                    editor_of {
                        id
                        user {
                            username
                            connections {
                                id
                                platform
                            }
                        }
                    }
                }
            }`,
			{
				id,
			},
			GetPriorityValue(priority),
		);

		return body;
	},
	getUserByEmoteSet: async function (id: string, priority = false): Promise<GetCurrentUser> {
		type data = {
			emoteSet: {
				owner: {
					id: string;
				};
			};
		};

		const data = await Add<data>(
			`query GetCurrentUser ($id: ObjectID!) {
                emoteSet (id: $id) {
                    owner {
                        id
                    }
                }
            }`,
			{
				id,
			},
			GetPriorityValue(priority),
		);

		return this.getUserEmoteSets(data.emoteSet.owner.id);
	},
	SearchEmoteByName: async (
		emote: string,
		filter: EmoteSearchFilter = {},
		priority = false,
	): Promise<EmoteSearchResult> => {
		return Add<EmoteSearchResult>(
			`query SearchEmotes($query: String! $page: Int $limit: Int $filter: EmoteSearchFilter) {
                emotes(query: $query page: $page limit: $limit filter: $filter) {
                    items {
                        id
                        name
                        owner {
                            username
                            id
                        }
                    }
                }
            }`,
			{
				query: emote,
				limit: 100,
				page: 1,
				filter,
			},
			GetPriorityValue(priority),
		);
	},
	GetEmoteByID: async (id: string, priority = false): Promise<EmoteSet> => {
		const data = await Add<{ emote: EmoteSet }>(
			`query SearchEmote($id: ObjectID!) {
                emote(id: $id) {
                    id
                    name
                }
            }`,
			{
				id,
			},
			GetPriorityValue(priority),
		);
		return data.emote;
	},
	CurrentEnabledEmotes: async (
		emote_set: string,
		filter?: (emote: EnabledEmote) => boolean,
		priority = false,
	): Promise<EnabledEmote[]> => {
		const data = await Add<{ emoteSet: { emotes: EnabledEmote[] } }>(
			`query GetEmoteSet ($id: ObjectID!) {
                emoteSet (id: $id) {
                    id
                    name
                    emotes {
                        id
                        name
                        data {
                            name
                        }
                    }
                }
            }`,
			{
				id: emote_set,
			},
			GetPriorityValue(priority),
		);

		const { emotes } = data.emoteSet;

		const addMethods = (emote: EnabledEmote) => {
			emote.IsAlias = () => emote.data.name !== emote.name;
		};

		for (const emote of emotes) {
			addMethods(emote);
		}

		return filter ? emotes.filter(filter) : emotes;
	},
	getEditors: async (id: string, priority = false): Promise<UserEditor> => {
		const data = await Add<UserEditor>(
			`query GetCurrentUser ($id: ObjectID!) {
                user (id: $id) {
                    id
                    username
                    editors {
                        id
                        user {
                            username
                            connections {
                                platform
                                id
                            }
                        }
                    }
                }
            }`,
			{
				id,
			},
			GetPriorityValue(priority),
		);

		return data;
	},
	getDefaultEmoteSet: async (id: string, priority = false): Promise<{ emote_set_id: string }> => {
		const data = await Add<Connections>(
			`query GetCurrentUser ($id: ObjectID!) {
                user (id: $id) {
                    id
                    username
                    connections {
                        platform
                        emote_set_id
                    }
                }
            }`,
			{
				id,
			},
			GetPriorityValue(priority),
		);

		return (
			data.user.connections.find((x) => x.platform === ConnectionPlatform.TWITCH) || {
				emote_set_id: '',
			}
		);
	},
	/**
	 * Modify an emote-set
	 * @returns Tuple of the new emote-set and the name of the emote that was added if the action was ADD
	 */
	ModifyEmoteSet: async (
		emote_set: string,
		action: ListItemAction,
		emote: string,
		name?: string,
		priority = false,
	): Promise<[ChangeEmoteInset, string | null]> => {
		const data = await Add<ChangeEmoteInset>(
			`mutation ChangeEmoteInSet($id: ObjectID! $action: ListItemAction! $emote_id: ObjectID! $name: String) {
                emoteSet(id: $id) {
                    id
                    emotes(id: $emote_id action: $action name: $name) {
                        id
                        name
                    }
                }
            }`,
			{
				id: emote_set,
				action,
				emote_id: emote,
				name,
			},
			GetPriorityValue(priority),
		);

		const newEmote = data.emoteSet.emotes.find((x) => x.id === emote);

		return [data, newEmote?.name || null];
	},
	GetUser: async function ({ TwitchUID }: User, priority = false): Promise<V3User> {
		const data = await Add<{ userByConnection: V3User }>(
			`query GetUserByConnection($platform: ConnectionPlatform! $id: String!) {
                userByConnection (platform: $platform id: $id) {
                    id
                    type
                    username
                    roles
                    created_at
                    connections {
                        id
                        platform
                        emote_set_id
                    }
                    emote_sets {
                        id
                        emotes {
                            id
                        }
                        capacity
                    }
                }
            }`,
			{
				platform: ConnectionPlatform.TWITCH,
				id: TwitchUID,
			},
			GetPriorityValue(priority),
		);

		return data.userByConnection;
	},
	GetRoles: async (priority = false): Promise<{ id: string; name: string }[]> => {
		const data = await Add<{ roles: { id: string; name: string }[] }>(
			`query GetRoles{
                roles {
                    name
                    id
                }
            }`,
			{},
			GetPriorityValue(priority),
		);

		return data.roles;
	},
	ModifyUserEditorPermissions: async (
		owner: string,
		editor: string,
		permissions: UserEditorPermissions = UserEditorPermissions.DEFAULT,
		priority = false,
	) => {
		return Add<UpdateUserEditors>(
			`mutation UpdateUserEditors($id: ObjectID! $editor_id: ObjectID! $d: UserEditorUpdate!) {
                user(id: $id) {
                    editors(editor_id: $editor_id data: $d) {
                        id
                    }
                }
            }`,
			{
				id: owner,
				editor_id: editor,
				d: {
					permissions,
				},
			},
			GetPriorityValue(priority),
		);
	},
	isAllowedToModify: async function (channelUser: User, invokerUser: User): Promise<ModifyData> {
		const emoteSet = (
			await GetChannelData(channelUser.TwitchUID, 'SevenTVEmoteSet')
		).ToString();

		const user = await this.GetUser(channelUser, true);

		const editors = await Bot.Redis.SetMembers(`seventv:${emoteSet}:editors`);

		if (!editors.includes(Bot.Config.BotUsername)) {
			return {
				okay: false,
				message: 'I am not an editor of this channel :/',
			};
		}

		if (
			channelUser.TwitchUID !== invokerUser.TwitchUID &&
			!editors.includes(invokerUser.Name)
		) {
			return {
				okay: false,
				message: 'You are not an editor of this channel :/',
			};
		}

		return {
			okay: true,
			message: '',
			emote_set: emoteSet,
			user_id: user.id,
		};
	},
};
