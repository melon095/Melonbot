export enum ECommandFlags {
	NO_BANPHRASE = 'no-banphrase',
	NO_EMOTE_PREPEND = 'no-emote-prepend',
	DISPLAY_DELAY = 'display-delay', // Only meant for ping command :^)
}

export enum EPermissionLevel {
	VIEWER = 0,
	VIP = 1,
	MOD = 2,
	BROADCAST = 3,
	ADMIN = 4,
}
