import got from 'got';
import Got from './tools/Got.js';
import { TCommandContext } from './Models/Command.js';
import User from './controller/User/index.js';

const url = 'https://7tv.io/v3/gql';

let api = got.extend();

export enum ConnectionPlatform {
	TWITCH = 'TWITCH',
	YOUTUBE = 'YOUTUBE',
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
		editor_of: {
			id: string;
			user: {
				username: string;
				connections: {
					id: string;
					platform: ConnectionPlatform;
				}[];
			};
		}[];
		emotes_sets: {
			id: string;
		}[];
	};
}

interface EmoteSet {
	id: string;
	name: string;
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
		editors: {
			id: string;
			user: {
				username: string;
				connections: {
					id: string;
					platform: ConnectionPlatform;
				}[];
			};
		}[];
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

interface ChangeEmoteInset {
	emoteSet: {
		id: string;
		emotes: {
			id: string;
			name: string;
		}[];
	};
}

interface V3User {
	id: string;
	user_type: string;
	username: string;
	created_at: string;
	avatar_url: string;
	roles: string[];
	connections: {
		id: string;
		platform: ConnectionPlatform;
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
	setup: () => {
		api = Got('json').extend({
			prefixUrl: url,
			headers: {
				Authorization: `Bearer ${Bot.Config.SevenTV.Bearer}`,
			},
			hooks: {
				beforeError: [
					(error) => {
						const { response } = error;
						if (response && response.body) {
							const { body } = response;
							try {
								const json = JSON.parse(body as string);
								Bot.HandleErrors('Error on 7TV GQL:', {
									input: error.options.body,
									errors: JSON.stringify(json.errors),
									code: response.statusCode,
								});
							} catch (_) {
								console.warn('7TV GQL Most likely recevied an Cloudflare issue', {
									input: error.options.body,
									code: response.statusCode,
								});
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
                            id,
                            username,
                            connections {
                                id
                                platform
                            }
                            editor_of {
                                id,
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
	SearchEmoteByName: async (
		emote: string,
		filter: EmoteSearchFilter = {},
	): Promise<EmoteSearchResult> => {
		const data: Base<EmoteSearchResult> = await api
			.post('', {
				body: JSON.stringify({
					query: `query SearchEmotes($query: String!, $page: Int, $limit: Int, $filter: EmoteSearchFilter) {
                    emotes(query: $query, page: $page, limit: $limit, filter: $filter) {
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
                            id,
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
	CurrentEnabledEmotes: async (emote_set: string): Promise<EmoteSet[]> => {
		const data: Base<{ emoteSet: { emotes: EmoteSet[] } }> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetEmoteSet ($id: ObjectID!) {
                            emoteSet (id: $id) {
                                id,
                                name,
                                emotes {
                                    id,
                                    name
                                }
                            }
                        }`,
					variables: {
						id: emote_set,
					},
				}),
			})
			.json();

		if (data.errors) {
			throw data.errors[0].message;
		}
		return data.data.emoteSet.emotes;
	},
	getEditors: async (id: string): Promise<UserEditor> => {
		const data: Base<UserEditor> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetCurrentUser ($id: ObjectID!) {
                        user (id: $id) {
                            id,
                            username,
                            editors {
                                id,
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
                            id,
                            username,
                            connections {
                                platform,
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
	ModifyEmoteSet: async (
		emote_set: string,
		action: ListItemAction,
		emote: string,
		name?: string,
	): Promise<ChangeEmoteInset> => {
		const data: Base<ChangeEmoteInset> = await api
			.post('', {
				body: JSON.stringify({
					query: `mutation ChangeEmoteInSet($id: ObjectID!, $action: ListItemAction!, $emote_id: ObjectID!, $name: String) {
                        emoteSet(id: $id) {
                            id
                            emotes(id: $emote_id, action: $action, name: $name) {
                                id,
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
		return data.data;
	},
	GetUserByUsername: async function ({ TwitchUID }: User): Promise<V3User> {
		const data: Base<{ userByConnection: V3User }> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetUserByConnection($platform: ConnectionPlatform!, $id: String!) {
                        userByConnection (platform: $platform, id: $id) {
                            id,
                            user_type,
                            username,
                            roles,
                            created_at,
                            connections {
                                id,
                                platform
                            }
                            emote_sets {
                                id,
                                emotes {
                                    id
                                },
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
                            name,
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
					query: `mutation UpdateUserEditors($id: ObjectID!, $editor_id: ObjectID!, $d: UserEditorUpdate!) {
                        user(id: $id) {
                            editors(editor_id: $editor_id, data: $d) {
                                id,
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
	isAllowedToModify: async function (ctx: TCommandContext): Promise<ModifyData> {
		const [emote_set_id] = await Bot.SQL.Query<Database.channels[]>`
                SELECT seventv_emote_set 
                    FROM channels 
                    WHERE name = ${ctx.channel.Name}`;
		if (
			emote_set_id?.seventv_emote_set === null ||
			emote_set_id?.seventv_emote_set === undefined
		) {
			return {
				okay: false,
				message: 'I am not an editor of this channel :/',
			};
		}

		const user = await this.GetUserByUsername(await ctx.channel.User()).catch(() => null);

		if (!user) {
			return {
				okay: false,
				message: "You don' seem to have a 7TV profile.",
			};
		}

		if (ctx.channel.Id !== ctx.user.TwitchUID) {
			const cant_use = await Bot.Redis.SetMembers(
				`seventv:${emote_set_id.seventv_emote_set}:editors`,
			).then((res) => {
				if (!res.includes(ctx.user.Name)) {
					return 'USER';
				} else if (!res.includes(Bot.Config.BotUsername)) {
					return 'BOT';
				}
				return '';
			});

			if (cant_use === 'USER') {
				return {
					okay: false,
					message: 'You are not an editor of this channel :/',
				};
			} else if (cant_use === 'BOT') {
				return {
					okay: false,
					message: 'I am not an editor of this channel :/',
				};
			}
		}

		return {
			okay: true,
			message: '',
			emote_set: emote_set_id.seventv_emote_set,
			user_id: user.id,
		};
	},
};
