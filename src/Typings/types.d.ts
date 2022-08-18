import { ChatUserstate } from 'tmi.js';
import { Channel } from './../controller/Channel/index.js';

export type PhraseType = {
	type: 'REGEX' | 'PB1';
	url: string;
	regex: string;
};

export type ChannelTalkOptions = {
	SkipBanphrase?: boolean = false;
	NoEmoteAtStart?: boolean = false; // Don't add the 👤 at the start of the message.
};

export type ParamsReturnType = {
	input: string[];
	params: TParamsContext;
};

export type TExecuteFunction = (ctx: TCommandContext) => Promise<void>;

export type TCommandContext = {
	channel: Channel;
	user: ChatUserstate;
	input: string[];
	data: TContextData;
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

export type TArgs = {
	name: string;
	type: string; // [TODO]: Can't use string literal here.
};

export type TParamsContext = {
	[key: string]: string | boolean;
};

export type TContextData = {
	Params: TParamsContext;
};

export type TTokenFunction = {
	status: 'OK' | 'ERROR' | 'MESSAGE';
	token: string;
	error: string;
};

export type TAccessToken = {
	access_token: string;
};

export type TStatsFile = {
	channel: string;
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
		Host: string;
		User: string;
		Password: string;
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
		Enabled: boolean;
		UseEventSub: boolean;
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

export declare namespace Database {
	export type banphrases = {
		channel: string;
		Phrase: PhraseType[];
	};

	export type channels = {
		name: string;
		user_id: string;
		live: boolean;
		bot_permission: number;
		viewers: string[];
		disabled_commands: string[];
		seventv_emote_set?: string;
	};

	export type commands = {
		id: string;
		name: string;
		description: string;
		perm: number;
	};

	export type error_logs = {
		error_id: number;
		error_message: string;
		timestamp: Date;
	};

	export type stats = {
		name: string;
		commands_handled: number;
	};

	export type suggestions = {
		suggestion_id: number;
		suggestion: string;
		request_username: string;
	};

	export type tokens = {
		id: number;
		access_token: string;
		name: string;
		refresh_token: string;
		scope: string;
	};

	type TFilter = {
		exclude: string[];
		include: string[];
	};

	type TLeaderboard = {
		username: string;
		score: number;
	};

	export type trivia = {
		channel: string;
		user_id: string;
		cooldown: number;
		filter: TFilter;
		leaderboard: TLeaderboard[];
	};

	export type migration = {
		version: number;
	};
}
