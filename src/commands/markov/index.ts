import { EPermissionLevel } from '../../Typings/enums.js';
import { ArgType } from '../../Models/Command.js';
import Got from './../../tools/Got.js';
import { Unping } from './../../tools/tools.js';
import { registerCommand } from '../../controller/Commands/Handler.js';

interface ApiResponse {
	success: boolean;
	request_id: string;
	timestamp: string;
	data: {
		markov: string;
	} | null;
	error?: string;
}

const makeReq = async (channel: string, seed?: string): Promise<ApiResponse> => {
	return Got['Magnolia']
		.get('markov', {
			searchParams: {
				channel,
				seed,
			},
			throwHttpErrors: false,
		})
		.json();
};

registerCommand({
	Name: 'markov',
	Ping: false,
	Description: 'Generate markov chains based of chat',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [[ArgType.String, 'channel']],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
		const channel = (ctx.data.Params.channel as string) || ctx.channel.Name;
		const seed = ctx.input.join(' ');

		const res = await makeReq(channel, seed);

		if (!res.success) {
			ctx.Log('error', 'Failed to query markov', res);

			return {
				Success: false,
				Result: res.error || 'Failed to query markov',
			};
		}

		if (!res.data) {
			return {
				Success: false,
				Result: 'No data returned',
			};
		}

		const users = await ctx.channel.GetViewers();
		const msg = await Unping(users, res.data.markov);

		return {
			Success: true,
			Result: `🔮 ${msg}`,
		};
	},
	LongDescription: async (prefix) => [
		`Generate markov chains based of chat`,
		``,
		`**Usage**: ${prefix}markov [seed]`,
		``,
		`**Example**: ${prefix}markov`,
		`**Example**: ${prefix}markov forsen`,
		'',
		'-c, --channel [channel]',
		'   Channel to generate markov from',
	],
});
