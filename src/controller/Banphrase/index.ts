import axios, { AxiosRequestConfig } from 'axios';
import { Database, PhraseType } from './../../Typings/types';
import * as regex from '../../tools/regex.js';

// export const BanParams = [
//     {
//         name: "type",
//         description: "The type of banphrase, either REGEX or API"
//     },
//     {
//         name: "url",
//         description: "The url of the api if an api. If the api takes the message as url param. Change it to ${0}. Example: https://foo.bar?message=${0}. If the message goes in the body, set the --body argument, Expected method is POST."
//     },
//     {
//         name: "regex",
//         description: "The regex to match against if set to regex. Example: /[1-9]/"
//     },
//     {
//         name: "body",
//         description: "If the api takes the message in the body. Example: --body=message. Where 'message' would be the key in body."
//     },
//     {
//         name: "method",
//         description: "The method of the API. GET, POST is currently supported"
//     },
//     {
//         name: "return",
//         description: "How the API returns information. Expects an boolean. For example --return=banned. Would look at banned entry of json it returns"
//     }
// ]

export class Banphrase {
	private Name: string;
	private Bans: PhraseType[] = [];
	private GlobalBans: RegExp[] = [
		regex.racism1,
		regex.racism2,
		regex.racism3,
		regex.racism4,
		regex.underage,
		// regex.url,
	];

	constructor(Name: string) {
		this.Name = Name;
		Bot.SQL.Query<Database.banphrases[]>`
            SELECT Phrase 
            FROM banphrases 
            WHERE channel = ${this.Name}`.then((phrases) => {
			if (!phrases.length) return;
			for (const phrase of phrases[0].phrase) {
				this.Bans.push(phrase);
			}
		});
	}

	async Update() {
		Bot.SQL.Query<PhraseType[]>`SELECT Phrase FROM banphrases WHERE channel = ${this.Name}`
			.then((phrases) => {
				if (!phrases.length) return;
				for (const phrase of phrases) {
					if (!this.Bans.includes(phrase)) this.Bans.push(phrase);
				}
			})
			.catch((err) => {
				console.log(err);
			});
	}

	async Check(message: string): Promise<{ okay: boolean; reason?: string }> {
		// eslint-disable-next-line no-async-promise-executor
		return new Promise(async (Resolve) => {
			const _chvl: boolean[] = [];

			for (let i = 0; i < this.GlobalBans.length; i++)
				_chvl.push(this.GlobalBans[i].test(message));
			if (_chvl.includes(true)) return Resolve({ okay: false, reason: 'Global Ban' });

			// const _chbnphrs: Database.banphrases[] = this.ChannelBans.filter((i) => i.channel === _channel);
			for (let i = 0; i < this.Bans.length; i++) {
				const parsedPhrase: PhraseType = this.Bans[i];
				// for (let j = 0; j < parsedPhrase.length; j++) {
				switch (parsedPhrase.type) {
					case 'REGEX': {
						const a = parsedPhrase.regex.split('/');
						const modifiers = a.pop();
						a.shift();
						const pattern = a.join('/');
						_chvl.push(new RegExp(pattern, modifiers).test(message));

						break;
					}

					case 'PB1': {
						const requestOptions: AxiosRequestConfig = {};
						requestOptions.method = 'POST';
						requestOptions.headers = {
							...requestOptions.headers,
							'Content-Type': 'Application/json',
						};
						requestOptions.url = parsedPhrase.url + '/api/v1/banphrases/test';
						requestOptions.data = {
							...requestOptions.data,
							message: message,
						};
						_chvl.push(
							await axios(requestOptions)
								.then((res) => res.data)
								.then((res) => {
									return res.banned;
								})
								.catch((e) => {
									console.log(e);
									// Can't be asked doing anything here. Don't really care enough.
									return true;
								}),
						);

						break;
					}

					default:
						break;
				}
				// }
			}
			return Resolve({ okay: _chvl.includes(true), reason: 'Banphrase' });
		});
	}
}
