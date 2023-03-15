// FIXME: Change name
export class GetSafeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GetSafeError';
	}
}

/**
 * Error thrown when there is an issue with the arguments passed to a command.
 */
export class ParseArgumentsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ParseArgumentsError';
	}
}

/**
 * Thrown to short circuit the pre-handler chain.
 */
export class PreHandlerError extends Error {
	constructor(prefix: string, message: string) {
		super(`${prefix} Error: ${message}`);
		this.name = 'PreHandlerError';
	}
}

/**
 * Error thrown when the given input is invalid.
 */
export class InvalidInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidInputError';
	}
}

/**
 * Error thrown when any third party interactions fails.
 */
export class ThirdPartyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ThirdPartyError';
	}
}
