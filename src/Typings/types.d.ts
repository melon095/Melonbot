export type ChannelTalkOptions = {
	SkipBanphrase?: boolean = false;
};

export type TTokenFunction = {
	status: 'OK' | 'ERROR' | 'MESSAGE';
	token: string;
	error: string;
};

export type TAccessToken = {
	access_token: string;
};

export type TUserCooldown = {
	Command: string;
	TimeExecute: number;
	Cooldown: number;
};

export type TConfigFile = {
	Twitch: {
		OAuth: string;
		ClientID: string;
		ClientSecret: string;
	};
	SQL: {
		Address: string;
	};
	EventSub: {
		PublicUrl: string;
		Secret: string;
	};
	Redis: {
		Address: string;
	};
	Development: boolean;
	Verified: boolean;
	Prefix: string;
	BotUsername: string;
	OwnerUserID: string;
	Website: {
		JWTSecret: string;
		WebUrl: string;
		Port: number;
	};
	SevenTV: {
		Bearer: string;
		user_id: string;
	};
	Spotify: {
		ClientID: string;
		ClientSecret: string;
	};
};

export type TStaticDataConfig = {
	messageEvasionCharacter: string;
};

export namespace Helix {
	export interface Users {
		data: {
			id: string;
			login: string;
			display_name: string;
			type: 'staff' | 'admin' | 'global_mod' | '';
			broadcaster_type: 'partner' | 'affiliate' | '';
			description: string;
			profile_image_url: string;
			offline_image_url: string;
			view_count: number;
			email?: string; // Requires user:read:email scope
			created_at: string;
		}[];
	}

	export type User = Users['data'][0];

	export interface Stream {
		data: {
			id: string;
			user_id: string;
			user_login: string;
			user_name: string;
			game_id: string;
			game_name: string;
			type: 'live' | '';
			title: string;
			viewer_count: string;
			started_at: Date;
			language: string;
			thumbnail_url: string;
			tag_ids: string[];
			is_mature: boolean;
		}[];
	}

	export interface ViewerList {
		data: {
			user_id: string;
			user_login: string;
			user_name: string;
		}[];
		pagination: {
			cursor: string;
		};
		total: number;
	}
}

export namespace Ivr {
	export interface ModVip {
		mods: {
			id: string;
			login: string;
			displayName: string;
			grantedAt: string;
		}[];
		vips: {
			id: string;
			login: string;
			displayName: string;
			grantedAt: string;
		}[];
		ttl?: number;
	}

	export interface User {
		banned: boolean;
		displayName: string;
		login: string;
		id: string;
		bio: string;
		follows: number;
		followers: number;
		profileViewCount: number;
		chatColor: string;
		logo?: string;
		banner?: string;
		verifiedBot: boolean;
		createdAt: string;
		updatedAt: string;
		emotePrefix: string;
		roles: {
			isAffiliate: boolean;
			isPartner: boolean;
			isStaff: boolean;
		};
		badges: {
			setID: string;
			title: string;
			description: string;
			version: string;
		}[];
		chatSettings: {
			chatDelayMs: number;
			followersOnlyDurationMinutes: number | null;
			slowModeDurationSeconds?: number | null;
			blockLinks?: boolean;
			isSubscribersOnlyModeEnabled?: boolean;
			isEmoteOnlyModeEnabled?: boolean;
			isFastSubsModeEnabled?: boolean;
			isUniqueChatModeEnabled?: boolean;
			requireVerifiedAccount?: boolean;
			rules: string[];
		};
		stream: {
			title: string;
			id: string;
			createadAt: string;
			type: 'live' | string;
			viewersCount: number;
			game: {
				displayName: string;
			};
		} | null;
		lastBroadcast: {
			startedAt: string;
			title: string;
		};
		panels: {
			id: string;
		}[];
	}
}

export namespace SpotifyTypes {
	export interface Me {
		country: string;
		display_name: string;
		email: string;
		explicit_content: {
			filter_enabled: boolean;
			filter_locked: boolean;
		};
		external_urls: {
			spotify: string;
		};
		followers: {
			href: null;
			total: number;
		};
		href: string;
		id: string;
		images: {
			height: number;
			url: string;
			width: number;
		}[];
		product: 'premium' | 'free' | 'open';
		type: 'user';
		uri: string;
	}

	export interface Queue {
		currently_playing: {
			album: {
				album_type: 'album' | 'single' | 'compilation';
				artists: {
					external_urls: {
						spotify: string;
					};
					href: string;
					id: string;
					name: string;
					type: 'artist';
					uri: string;
				}[];
				available_markets: string[];
				external_urls: {
					spotify: string;
				};
				href: string;
				id: string;
				images: {
					height: number;
					url: string;
					width: number;
				}[];
				name: string;
				type: 'album';
				uri: string;
			};
			artists: {
				name: string;
			}[];
			disc_number: number;
			duration_ms: number;
			explicit: boolean;
			external_ids: {
				isrc: string;
			};
			external_urls: {
				spotify: string;
			};
			href: string;
			id: string;
			is_local: boolean;
			name: string;
			popularity: number;
			preview_url: string;
			track_number: number;
			type: 'track';
			uri: string;
		};
		queue: unknown[];
	}
	export interface Player {
		device: Device;
		shuffle_state: boolean;
		repeat_state: string;
		timestamp: number;
		context: Context;
		progress_ms: number;
		item: SongItem;
		currently_playing_type: string;
		actions: Actions;
		is_playing: boolean;
	}

	interface Device {
		id: string;
		is_active: boolean;
		is_private_session: boolean;
		is_restricted: boolean;
		name: string;
		type: string;
		volume_percent: number;
	}

	interface ExternalUrls {
		spotify: string;
	}

	interface Context {
		external_urls: ExternalUrls;
		href: string;
		type: string;
		uri: string;
	}

	interface Artist {
		external_urls: ExternalUrls;
		href: string;
		id: string;
		name: string;
		type: string;
		uri: string;
	}

	interface Image {
		height: number;
		url: string;
		width: number;
	}

	interface Album {
		album_type: string;
		artists: Artist[];
		available_markets: string[];
		external_urls: ExternalUrls;
		href: string;
		id: string;
		images: Image[];
		name: string;
		release_date: string;
		release_date_precision: string;
		total_tracks: number;
		type: string;
		uri: string;
	}

	interface ExternalIds {
		isrc: string;
	}

	interface SongItem {
		album: Album;
		artists: Artist[];
		available_markets: string[];
		disc_number: number;
		duration_ms: number;
		explicit: boolean;
		external_ids: ExternalIds;
		external_urls: ExternalUrls;
		href: string;
		id: string;
		is_local: boolean;
		name: string;
		popularity: number;
		preview_url: string;
		track_number: number;
		type: string;
		uri: string;
	}

	interface Disallows {
		pausing: boolean;
		skipping_prev: boolean;
	}

	interface Actions {
		disallows: Disallows;
	}
}

export interface OAuthToken {
	access_token: string;
	refresh_token: string;
	expires_in: number;
}
