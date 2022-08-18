export type TPubRecType =
	| 'connect'
	| 'channel.moderator.add'
	| 'channel.moderator.remove'
	| 'channel.follow';

export interface IPubBase {
	Type: TPubRecType;
	Data: any; // IPubConnect and so on are stored inside Data property
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
