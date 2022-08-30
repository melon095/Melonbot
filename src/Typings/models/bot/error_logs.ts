// @generated
// Automatically generated. Don't change this file manually.

export type error_logsId = string & { ' __flavor'?: 'error_logs' };

export default interface error_logs {
	/** Primary key. Index: idx_1745920_primary */
	error_id: error_logsId;

	error_message: string;

	timestamp: Date | null;
}
