// @generated
// Automatically generated. Don't change this file manually.

export type commandsId = string & { ' __flavor'?: 'commands' };

/**
 * Essentially all commands
 */
export default interface commands {
	/** Primary key. Index: idx_1745905_primary */
	id: commandsId;

	/** Index: command_name_unique */
	name: string;

	description: string;

	perm: number;
}
