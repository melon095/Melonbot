export type ChannelTalkOptions = {
	SkipBanphrase?: boolean = false;
	NoEmoteAtStart?: boolean = false; // Don't add the 👤 at the start of the message.
};

export type ParamsReturnType = {
	input: string[];
	params: TParamsContext;
};

export type TCommands = {
	Name: string;
	Ping: boolean;
	Description: string;
	Permission: PermissionLevel;
	OnlyOffline: boolean;
	StaticData: StaticDataType<T>;
	Code: TExecuteFunction;
	Aliases: string[];
	Cooldown: number;
	Params: TArgs[];
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

export interface Token {
	/**
	 * @description Verify and get the broadcasters token, requires them logging in to the website beforehand!
	 */
	User(id: number): Promise<TTokenFunction>;
	/**
	 * @description Verify and then get the bots app token
	 */
	Bot(): Promise<TTokenFunction>;
}

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
}
