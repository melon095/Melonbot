// @generated
// Automatically generated. Don't change this file manually.

export type banphrase_type = 'pb1' | 'regex';

export type banphrasesId = string & { ' __flavor'?: 'banphrases' };

export default interface banphrases {
	channel: string;
	type: banphrase_type;
	pb1_url?: string;
	regex?: string;
}
