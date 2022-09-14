export type TPubRecType = 'connect' | 'channel.follow' | 'banphrase';

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

export interface IPubUserToBroadcaster {
	user_id: string;
	user_login: string;
	user_name: string;

	broadcaster_user_id: string;
	broadcaster_user_login: string;
	broadcaster_user_name: string;
}

export interface IPubFollow extends IPubUserToBroadcaster {
	followed_at: string;
}

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
}
