// @generated
// Automatically generated. Don't change this file manually.

export type web_requestId = number & { ' __flavor'?: 'web_request' };

export default interface web_request {
	/** Primary key. Index: web_request_id_PRIMARY */
	id: web_requestId;

	method: string;

	endpoint: string;

	request_ip: string;

	headers: string | null;

	query: string | null;

	body: string | null;

	timestamp: Date;
}
