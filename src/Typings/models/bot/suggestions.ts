// @generated
// Automatically generated. Don't change this file manually.

export type suggestionsId = number & { ' __flavor'?: 'suggestions' };

export default interface suggestions {
	/** Primary key. Index: idx_1745936_primary */
	suggestion_id: suggestionsId;

	suggestion: string;

	request_username: string;
}
