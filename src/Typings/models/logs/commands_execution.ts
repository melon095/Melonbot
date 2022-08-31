// @generated
// Automatically generated. Don't change this file manually.

export type commands_executionId = number & { ' __flavor'?: 'commands_execution' };

export default interface commands_execution {
	/** Primary key. Index: commands_id_PRIMARY */
	id: commands_executionId;

	user_id: string;

	username: string;

	channel: string;

	success: boolean;

	command: string;

	args: string[];

	result: string;
}
