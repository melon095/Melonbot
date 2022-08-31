// @generated
// Automatically generated. Don't change this file manually.

import { channelsId } from './channels';

export type tokensId = string & { ' __flavor'?: 'tokens' };

export default interface tokens {
	/**
	 * Index: idx_1745943_id
	 * Primary key. Index: idx_1745943_primary
	 */
	id: tokensId;

	access_token: string | null;

	/** Index: idx_1745943_fk_tokens_channels1_idx */
	name: channelsId | null;

	refresh_token: string | null;

	scope: string | null;

	expires_in: string;
}
