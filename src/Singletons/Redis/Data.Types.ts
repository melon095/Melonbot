export type TPubRecType =
	| 'connect'
	| 'channel.follow'
	| 'stream.online'
	| 'stream.offline'
	| 'channel.update'
	| 'banphrase';

/**
 * Type is the eventsub type that was emitted
 * However if it is undefined the type is the channel name it was sent from
 */
export interface IPubBase<T = object> {
	Type?: TPubRecType;
	Data: T;
}

export interface IPing {
	Pong: string;
}

export interface IPubConnect {
	Version: string;
}

export interface IPubUserData {
	user_id: string;
	user_login: string;
	user_name: string;
}

export interface IPubBroadcasterData {
	broadcaster_user_id: string;
	broadcaster_user_login: string;
	broadcaster_user_name: string;
}

export interface IPubUserToBroadcaster extends IPubUserData, IPubBroadcasterData {}

export interface IPubFollow extends IPubUserToBroadcaster {
	followed_at: string;
}

export const EStreamType = {
	Live: 'live',
	Playlist: 'playlist',
	WatchParty: 'watch_party',
	Premiere: 'premiere',
	Rerun: 'rerun',
} as const;

export type IPubStreamOnline = IPubBroadcasterData & {
	ID: string;
	// TODO: Move into helper module
	type: typeof EStreamType[keyof typeof EStreamType];
	started_at: string;
};

export type IPubStreamOffline = IPubBroadcasterData;

export type IPubChannelUpdate = IPubBroadcasterData & {
	title: string;
	language: string;
	category_id: string;
	category_name: string;
	is_mature: boolean;
};

export interface IBanphrase {
	channel: string;
	request: 'DELETE' | 'ADD' | 'UPDATE';
	id: number;
	type: 'pb1' | 'regex';
	pb1_url?: string;
	regex?: string;
}

export interface ISettings {
	id: string;
	inner: {
		[key: string]: unknown;
	};
}
