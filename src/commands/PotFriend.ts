import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { EPermissionLevel } from './../Typings/enums.js';

import got from './../tools/Got.js';

const ADVICE_API = 'https://api.adviceslip.com/advice';

interface IAdviceSlipObject {
	slip: {
		slip_id: number;
		advice: string;
	};
}

export default class extends CommandModel {
	Name = 'PotFriend';
	Ping = true;
	Description = 'PotFriend tells you an advice';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [];
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const MESSAGE = (advice: string) => `PotFriend advice: ${advice} PotFriend`;

		const result = await got
			.get(ADVICE_API, {
				headers: {
					accept: 'application/json',
				},
			})
			.then((ok) => {
				const json: IAdviceSlipObject = JSON.parse(ok.body);
				const { slip } = json;

				return slip.advice;
			})
			.catch((bad) => {
				Bot.HandleErrors('command/PotFriend', new Error(bad as string));
				return 'No more advice for today!';
			});

		const message = MESSAGE(decodeURIComponent(result));
		return {
			Success: true,
			Result: message,
		};
	};
}
