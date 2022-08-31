// @generated
// Automatically generated. Don't change this file manually.

import type { PhraseType } from '../../types';

export type banphrasesId = string & { ' __flavor'?: 'banphrases' };

export default interface banphrases {
	/**
	 * Index: idx_1745889_fk_banphrases_channels_idx
	 * Primary key. Index: idx_1745889_primary
	 */
	channel: banphrasesId;

	phrase: PhraseType[];
}
