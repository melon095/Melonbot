export type TPubRecType =
	| 'connect'
	| 'channel.moderator.add'
	| 'channel.moderator.remove'
	| 'channel.follow'
	| 'banphrase';

export interface IPubBase {
	Type: TPubRecType;
	Data: object; // IPubConnect and so on are stored inside Data property
}

export interface IPing {
	Pong: string;
}

export interface IPubConnect extends IPubBase {
	Version: string;
}

export interface IPubModAdd extends IPubBase {
	user_id: string;
	user_login: string;
	user_name: string;

	broadcaster_user_id: string;
	broadcaster_user_login: string;
	broadcaster_user_name: string;
}

export interface IPubModRemove extends IPubModAdd {}

export interface IPubFollow extends IPubModAdd {
	followed_at: string;
}

export interface IBanphrase extends IPubBase {
	channel: string;
	request: 'DELETE' | 'ADD' | 'UPDATE';
	id: number;
	type: 'pb1' | 'regex';
	pb1_url?: string;
	regex?: string;
}

export interface ISettings extends IPubBase {
	id: string;
}
