export type UserProfile = {
	name: string;
	twitch_uid: string;
	profile_picture: string;
};

export type UserThirdPartyServices = {
	name: string;
	icon: string;
	authLink: string;
};

export type UserMe = {
	profile: UserProfile;
	third_party: UserThirdPartyServices[];
	has_channel: boolean;
	prefix: string;
};

export type IUserContext = {
	user: UserMe | null;
	setUser: (user: UserMe | null) => void;
};
