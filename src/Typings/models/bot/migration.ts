// @generated
// Automatically generated. Don't change this file manually.

export type migrationId = number & { ' __flavor'?: 'migration' };

export default interface migration {
	/**
	 * Primary key. Index: migration_pkey
	 * Primary key. Index: migration_pkey
	 */
	version: migrationId;
}
