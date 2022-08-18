import got from 'got';
import { Database, TCommandContext } from './Typings/types.js';

const url = 'https://7tv.io/v3/gql';

let api = got.extend();

enum ConnectionPlatform {
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
		editor_of: {
			id: string;
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

interface V2User {
	id: string;
	twitch_id: string;
	login: string;
	display_name: string;
	role: {
		id: string;
		name: string;
		position: number;
		color: number;
		allowed: number;
		denied: number;
	};
	profile_picture_id: string;
}

interface V3User {
	id: string;
	user_type: string;
	username: string;
	created_at: string;
	avatar_url: string;
	roles: string[];
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
		api = got.extend({
			prefixUrl: url,
			headers: {
				Authorization: `Bearer ${Bot.Config.SevenTV.Bearer}`,
				'Content-Type': 'application/json',
			},
			hooks: {
				beforeError: [
					(error) => {
						const { response } = error;
						if (response && response.body) {
							const { body } = response;
							console.error('Error on 7TV GQL:', body);
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
                            editor_of {
                                id,
                                user {
                                    username
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

		return data.data;
	},
	SearchEmoteByName: async (emote: string): Promise<EmoteSearchResult> => {
		const data: Base<EmoteSearchResult> = await api
			.post('', {
				body: JSON.stringify({
					query: `query SearchEmotes($query: String!, $page: Int, $limit: Int) {
                    emotes(query: $query, page: $page, limit: $limit) {
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
					},
				}),
			})
			.json();

		if (data.errors) {
			return Promise.reject(data.errors[0].message);
		} else return data.data;
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

		if (data.errors) return Promise.reject(data.errors);
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
			return Promise.reject(data.errors);
		} else return data.data.emoteSet.emotes;
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

		return data.data;
	},
	getDefaultEmoteSet: async (
		id: string,
	): Promise<{ emote_set_id: string }> => {
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

		return (
			data.data.user.connections.find(
				(x) => x.platform === ConnectionPlatform.TWITCH,
			) || { emote_set_id: '' }
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
			return Promise.reject(data.errors[0].message);
		}
		return data.data;
	},
	V2GetUser: async (username: string): Promise<V2User> => {
		return await got.get(`https://api.7tv.app/v2/users/${username}`).json();
	},
	GetUserByUsername: async function (username: string): Promise<V3User> {
		const id = await Bot.Redis.SGet(`seventv:id:${username}`).then(
			async (id) => {
				if (id) return id;
				const v2_id = await this.V2GetUser(username).then(
					({ id }) => id,
				);
				await Bot.Redis.SSet(`seventv:id:${username}`, v2_id);
				return v2_id;
			},
		);

		const data: Base<{ user: V3User }> = await api
			.post('', {
				body: JSON.stringify({
					query: `query GetUser($id: ObjectID!) {
                        user (id: $id) {
                            id,
                            user_type,
                            username,
                            roles,
                            created_at,
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
						id,
					},
				}),
			})
			.json();

		return data.data.user;
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
			return Promise.reject(data.errors[0].message);
		}
		return data.data;
	},
	isAllowedToModify: async function (
		ctx: TCommandContext,
	): Promise<ModifyData> {
		const emote_set_id = (
			await Bot.SQL.promisifyQuery<Database.channels>(
				'SELECT seventv_emote_set FROM channels WHERE name = ?',
				[ctx.channel.Name],
			)
		).SingleOrNull();
		if (
			emote_set_id?.seventv_emote_set === null ||
			emote_set_id?.seventv_emote_set === undefined
		) {
			return {
				okay: false,
				message: 'I am not an editor of this channel :/',
			};
		}

		const user = await this.GetUserByUsername(ctx.channel.Name).catch(
			() => null,
		);

		if (!user) {
			return {
				okay: false,
				message: "You don' seem to have a 7TV profile.",
			};
		}

		if (ctx.channel.Id !== ctx.user['user-id']) {
			const cant_use = await Bot.Redis.SetMembers(
				`seventv:${emote_set_id.seventv_emote_set}:editors`,
			).then((res) => {
				if (!res.includes(ctx.user.username!)) {
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
