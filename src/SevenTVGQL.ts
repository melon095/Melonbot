import got from 'got';
import Got from './tools/Got.js';
import { TCommandContext } from './Models/Command.js';
import User from './controller/User/index.js';
import { GetSettings } from './controller/Channel/index.js';
import { Logger } from 'logger.js';

const url = 'https://7tv.io/v3/gql';

let api = got.extend();

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

interface EmoteSearchResult {
	emotes: {
		count: number;
		items: {
			id: string;
			name: string;
		}[];
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

export default {
	setup: (Bearer: string) => {
		api = Got('json').extend({
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
		const data: Base<GetCurrentUser> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetCurrentUser ($id: ObjectID!) {
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
					variables: {
						id: id,
					},
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}

		return data.data;
	},
	getUserByEmoteSet: async function (id: string): Promise<GetCurrentUser> {
		type data = {
			emoteSet: {
				owner: {
					id: string;
				};
			};
		};

		const data: Base<data> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetCurrentUser ($id: ObjectID!) {
                        emoteSet (id: $id) {
                            owner {
                                id
                            }
                        }
                    }`,
					variables: {
						id,
					},
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}

		return this.getUserEmoteSets(data.data.emoteSet.owner.id);
	},
	SearchEmoteByName: async (
		emote: string,
		filter: EmoteSearchFilter = {},
	): Promise<EmoteSearchResult> => {
		const data: Base<EmoteSearchResult> = await api
			.post('', {
				body: JSON.stringify({
					query: `query SearchEmotes($query: String! $page: Int $limit: Int $filter: EmoteSearchFilter) {
                    emotes(query: $query page: $page limit: $limit filter: $filter) {
                      items {
                        id
                        name
                      }
                    }
                  }`,
					variables: {
						query: emote,
						limit: 100,
						page: 1,
						filter: filter,
					},
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}
		return data.data;
	},
	GetEmoteByID: async (id: string): Promise<EmoteSet> => {
		const data: Base<{ emote: EmoteSet }> = await api
			.post('', {
				body: JSON.stringify({
					query: `query SearchEmote($id: ObjectID!) {
                        emote(id: $id) {
                            id
                            name
                        }
                    }`,
					variables: {
						id,
					},
				}),
			})
			.json();

		if (data.errors) throw data.errors[0].message;
		else return data.data.emote;
	},
	CurrentEnabledEmotes: async (
		emote_set: string,
		filter?: (emote: EnabledEmote) => boolean,
	): Promise<EnabledEmote[]> => {
		const { data, errors }: Base<{ emoteSet: { emotes: EnabledEmote[] } }> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetEmoteSet ($id: ObjectID!) {
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
					variables: {
						id: emote_set,
					},
				}),
			})
			.json();

		if (errors) {
			throw errors[0].message;
		}

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
		const data: Base<UserEditor> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetCurrentUser ($id: ObjectID!) {
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
					variables: {
						id,
					},
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}

		return data.data;
	},
	getDefaultEmoteSet: async (id: string): Promise<{ emote_set_id: string }> => {
		const data: Base<Connections> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetCurrentUser ($id: ObjectID!) {
                        user (id: $id) {
                            id
                            username
                            connections {
                                platform
                                emote_set_id
                            }
                        }
                    }`,
					variables: {
						id,
					},
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}

		return (
			data.data.user.connections.find((x) => x.platform === ConnectionPlatform.TWITCH) || {
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
		const data: Base<ChangeEmoteInset> = await api
			.post('', {
				body: JSON.stringify({
					query: `mutation ChangeEmoteInSet($id: ObjectID! $action: ListItemAction! $emote_id: ObjectID! $name: String) {
                        emoteSet(id: $id) {
                            id
                            emotes(id: $emote_id action: $action name: $name) {
                                id
                                name
                            }
                        }
                    }`,
					variables: {
						id: emote_set,
						action,
						emote_id: emote,
						name,
					},
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}

		const newEmote = data.data.emoteSet.emotes.find((x) => x.id === emote);

		return [data.data, newEmote?.name || null];
	},
	GetUser: async function ({ TwitchUID }: User): Promise<V3User> {
		const data: Base<{ userByConnection: V3User }> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetUserByConnection($platform: ConnectionPlatform! $id: String!) {
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
					variables: {
						platform: ConnectionPlatform.TWITCH,
						id: TwitchUID,
					},
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}

		return data.data.userByConnection;
	},
	GetRoles: async (): Promise<{ id: string; name: string }[]> => {
		const data: Base<{ roles: { id: string; name: string }[] }> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetRoles{
                        roles {
                            name
                            id
                        }
                    }`,
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}

		return data.data.roles;
	},
	ModifyUserEditorPermissions: async (
		owner: string,
		editor: string,
		permissions: UserEditorPermissions = UserEditorPermissions.DEFAULT,
	) => {
		const data: Base<UpdateUserEditors> = await api
			.post('', {
				body: JSON.stringify({
					query: `mutation UpdateUserEditors($id: ObjectID! $editor_id: ObjectID! $d: UserEditorUpdate!) {
                        user(id: $id) {
                            editors(editor_id: $editor_id data: $d) {
                                id
                            }
                        }
                    }`,
					variables: {
						id: owner,
						editor_id: editor,
						d: {
							permissions,
						},
					},
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}
		return data.data;
	},
	isAllowedToModify: async function (
		channelUser: User,
		invokerUser: User /*ctx: TCommandContext*/,
	): Promise<ModifyData> {
		const emoteSet = (await GetSettings(channelUser).then((x) => x.SevenTVEmoteSet)).ToString();

		if (!emoteSet) {
			return {
				okay: false,
				message: 'I am not an editor of this channel :/',
			};
		}

		const user = await this.GetUser(channelUser).catch(() => null);

		if (!user) {
			return {
				okay: false,
				message: "You don't seem to have a 7TV profile.",
			};
		}

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
