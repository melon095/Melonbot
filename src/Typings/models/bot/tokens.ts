// @generated
// Automatically generated. Don't change this file manually.

import { channelsId } from './channels';

export type tokensId = string & { ' __flavor'?: 'tokens' };

export default interface tokens {
	user_id: tokensId;
	access_token: string;
	refresh_token: string;
	expires_at: Date;

	/**
	 * JWT Token for the user
	 */
	session: string;
}
