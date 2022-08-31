export type usersId = number & { ' __flavor'?: 'users' };

export type UserRole = 'user' | 'moderator' | 'admin';

export default interface users {
	id: usersId;
	name: string;
	twitch_uid: string;
	first_seen: Date;
	role: UserRole;
}
