export enum ECommandFlags {
	NO_BANPHRASE = 'no-banphrase',
	NO_EMOTE_PREPEND = 'no-emote-prepend',
	DISPLAY_DELAY = 'display-delay', // Only meant for ping command :^)
	ALLOW_INVALID_ARGS = 'allow-invalid-args', // Allow invalid args to be passed to the command - time command
}

export enum EPermissionLevel {
	VIEWER = 0,
	VIP = 1,
	MOD = 2,
	BROADCAST = 3,
	ADMIN = 4,
}
