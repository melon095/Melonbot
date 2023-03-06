import Got from './../../tools/Got.js';
import * as regex from '../../tools/regex.js';
import { Channel } from './../Channel/index.js';

interface Pajbot1Response {
	banned: boolean;
	banphrase_data: {
		case_sensitive: false;
		id: number;
		length: number;
		name: string;
		operator: string;
		permanent: boolean;
		phrase: string;
		remove_accents: boolean;
		sub_immunity: boolean;
	};
	input_message: string;
}

const GLOBAL_REGEX_BANS: RegExp[] = [
	regex.racism1,
	regex.racism2,
	regex.racism3,
	regex.racism4,
	regex.underage,
	// regex.url,
];

export async function CheckMessageBanphrase(
	channel: Channel,
	message: string,
): Promise<{ banned: boolean; reason?: string }> {
	for (const regex of GLOBAL_REGEX_BANS) {
		if (regex.test(message)) {
			return { banned: true, reason: 'Global Banphrase' };
		}
	}

	const pajbot1 = (await channel.GetChannelData('Pajbot1')).ToString();

	if (pajbot1) {
		// (Not allowing http)
		const url = `https://${pajbot1}/api/v1/banphrases/test`;
		const json = {
			message,
		};

		const { statusCode, body } = await Got('json').post(url, {
			json,
			throwHttpErrors: false,
			timeout: {
				request: 5000,
				connect: 5000,
				lookup: 5000,
			},
		});

		if (statusCode >= 400) {
			Bot.Log.Error('Error while checking banphrase: %O', { url, json, body });
			return { banned: true, reason: 'Error while checking banphrase' };
		}

		const jsonBody = JSON.parse(body) as Pajbot1Response;

		if (jsonBody.banned) {
			return { banned: true, reason: 'Channel Banphrase' };
		}
	}

	return { banned: false };
}
