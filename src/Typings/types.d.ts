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

export declare namespace NChannel {
	export type Mode = 'Read' | 'Write' | 'VIP' | 'Moderator' | 'Bot';
	export interface Functions {
		ModeToCooldown(mode: NChannel.Mode): number | null;
		CooldownToMode(val: number): NChannel.Mode;
		DatabaseToMode(val: number): NChannel.Mode;
	}
}

export declare namespace NCommand {
	export type Mode = 'Viewer' | 'VIP' | 'Moderator' | 'Broadcaster' | 'Admin';
	export interface Functions {
		DatabaseToMode(val: number): NCommand.Mode;
		ModeToDatabase(mode: NCommand.Mode): number;
	}
}

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
