import got from 'got';
import Got from './tools/Got.js';
import User from './controller/User/index.js';
import { GetChannelData } from './IndividualData.js';
import { ThirdPartyError } from './Models/Errors.js';

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

async function gql<ResponseBody>(query: string, variables: object = {}) {
	const data: Base<ResponseBody> = await api
		.post('', {
			body: JSON.stringify({
				query,
				variables,
			}),
		})
		.json();

	if (data.errors) {
		throw new ThirdPartyError(data.errors[0].message);
	}

	return data.data;
}

export default {
	setup: (Bearer: string) => {
		api = Got['Default'].extend({
			prefixUrl: url,
			headers: {
				Authorization: `Bearer ${Bearer}`,
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
	getUserEmoteSets: async (id: string): Promise<GetCurrentUser> => {
		const body = await gql<GetCurrentUser>(
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
		);

		return body;
	},
	getUserByEmoteSet: async function (id: string): Promise<GetCurrentUser> {
		type data = {
			emoteSet: {
				owner: {
					id: string;
				};
			};
		};

		const data = await gql<data>(
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
		);

		return this.getUserEmoteSets(data.emoteSet.owner.id);
	},
	SearchEmoteByName: async (
		emote: string,
		filter: EmoteSearchFilter = {},
	): Promise<EmoteSearchResult> => {
		return gql<EmoteSearchResult>(
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
		);
	},
	GetEmoteByID: async (id: string): Promise<EmoteSet> => {
		const data = await gql<{ emote: EmoteSet }>(
			`query SearchEmote($id: ObjectID!) {
                emote(id: $id) {
                    id
                    name
                }
            }`,
			{
				id,
			},
		);
		return data.emote;
	},
	CurrentEnabledEmotes: async (
		emote_set: string,
		filter?: (emote: EnabledEmote) => boolean,
	): Promise<EnabledEmote[]> => {
		const data = await gql<{ emoteSet: { emotes: EnabledEmote[] } }>(
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
	getEditors: async (id: string): Promise<UserEditor> => {
		const data = await gql<UserEditor>(
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
		);

		return data;
	},
	getDefaultEmoteSet: async (id: string): Promise<{ emote_set_id: string }> => {
		const data = await gql<Connections>(
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
	): Promise<[ChangeEmoteInset, string | null]> => {
		const data = await gql<ChangeEmoteInset>(
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
		);

		const newEmote = data.emoteSet.emotes.find((x) => x.id === emote);

		return [data, newEmote?.name || null];
	},
	GetUser: async function ({ TwitchUID }: User): Promise<V3User> {
		const data = await gql<{ userByConnection: V3User }>(
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
		);

		return data.userByConnection;
	},
	GetRoles: async (): Promise<{ id: string; name: string }[]> => {
		const data = await gql<{ roles: { id: string; name: string }[] }>(`
                    query GetRoles{
                        roles {
                            name
                            id
                        }
                    }`);

		return data.roles;
	},
	ModifyUserEditorPermissions: async (
		owner: string,
		editor: string,
		permissions: UserEditorPermissions = UserEditorPermissions.DEFAULT,
	) => {
		return gql<UpdateUserEditors>(
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
		);
	},
	isAllowedToModify: async function (
		channelUser: User,
		invokerUser: User /*ctx: TCommandContext*/,
	): Promise<ModifyData> {
		const emoteSet = (
			await GetChannelData(channelUser.TwitchUID, 'SevenTVEmoteSet')
		).ToString();

		const user = await this.GetUser(channelUser);

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
