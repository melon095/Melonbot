import { ECommandFlags, EPermissionLevel } from './../../Typings/enums.js';

import got from './../../tools/Got.js';
import { registerCommand } from '../../controller/Commands/Handler.js';

const ADVICE_API = 'https://api.adviceslip.com/advice';

interface IAdviceSlipObject {
	slip: {
		slip_id: number;
		advice: string;
	};
}

registerCommand({
	Name: 'PotFriend',
	Description: 'PotFriend tells you an advice',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [],
	Flags: [ECommandFlags.ResponseIsReply],
	PreHandlers: [],
	Code: async function (ctx) {
		const MESSAGE = (advice: string) => `PotFriend advice: ${advice} PotFriend`;

		const result = await got['Default']
			.get(ADVICE_API)
			.then((ok) => {
				const json: IAdviceSlipObject = JSON.parse(ok.body);
				const { slip } = json;

				return slip.advice;
			})
			.catch((error) => {
				ctx.Log('error', 'Failed to query PotFriend', { error });
				return 'No more advice for today!';
			});

		const message = MESSAGE(decodeURIComponent(result));
		return {
			Success: true,
			Result: message,
		};
	},
});
