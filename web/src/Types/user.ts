export type UserProfile = {
	name: string;
	twitch_uid: string;
	profile_picture: string;
};

export type UserMe = {
	profile: UserProfile;
	/**
	 * Indicates third party services a client has connected to.
	 */
	third_party: string[];
	has_channel: boolean;
	prefix: string;
};

export type IUserContext = {
	user: UserMe | null;
	setUser: (user: UserMe | null) => void;
};
