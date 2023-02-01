import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import gql, { ChangeEmoteInset, ConnectionPlatform, EnabledEmote, ListItemAction } from '../SevenTVGQL.js';
import SevenTVAllowed, { Get7TVUserMod } from './../PreHandlers/7tv.can.modify.js';
import { ExtractAllSettledPromises } from './../tools/tools.js';

type PreHandlers = {
	SevenTV: Get7TVUserMod;
};

export default class extends CommandModel<PreHandlers> {
	Name = 'yoink';
	Ping = false;
	Description = 'Steal several 7TV emotes from another channel TriHard ';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = ['steal'];
	Cooldown = 10;
	Params = [
		[ArgType.Boolean, 'case'],
		[ArgType.Boolean, 'alias'],
	];
	Flags = [];
	PreHandlers = [SevenTVAllowed];
	Code = async (ctx: TCommandContext, mods: PreHandlers): Promise<CommandResult> => {
		const errNoInputMsg = () =>
			`Provide a channel and emote name, e.g @${ctx.user.Name} FloppaL`;

		const input = ctx.input;
		const caseSensitive = ctx.data.Params.case as boolean;
		const keepAlias = ctx.data.Params.alias as boolean;

		if (!input.length) {
			return {
				Success: false,
				Result: errNoInputMsg(),
			};
		}

		const inputChannels: any[] = []
		let prefixes: (string | number)[] = [`@`, `#`]

		for (const chan of input.entries()) {
			if (prefixes.includes(chan[1][0]))
				inputChannels.push(chan)
		}
		prefixes = inputChannels.map(i => i[0])

		const emotes = input.reduce((emotes: (never | string)[], emote: string, idx: number) => {
			if (prefixes.includes(idx))
				return emotes

			if (!caseSensitive)
				emote = emote.toLowerCase()

			emotes.push(emote)
			return emotes
		}, [])

		let srcUser: any;
		let srcChannel: string | undefined = inputChannels?.[0][1].slice(1)
		if (!srcChannel) {
			srcUser = ctx.user.Name
			srcChannel = ctx.channel.Name
		}
		else
			srcUser = srcChannel

		try {
			srcUser = await getSevenTVAccount(srcUser);
		} catch (error) {
			return {
				Success: false,
				Result: 'Could not find that channel',
			};
		}

		let toAdd: Set<EnabledEmote> = new Set();
		try {
			const channelEmotes = await gql
				.getDefaultEmoteSet(srcUser.id)
				.then((res) => gql.CurrentEnabledEmotes(res.emote_set_id));

			for (const emote of channelEmotes) {
				(caseSensitive
					? emotes.includes(emote.name)
					: emotes.includes(emote.name.toLowerCase())) && toAdd.add(emote);
			}
		} catch (error) {
			return {
				Success: false,
				Result: 'That channel does not have any emotes',
			};
		}

		if (!toAdd.size) {
			return {
				Success: false,
				Result: 'Could not find any emotes to add',
			};
		}

		const promises: Promise<[string, ChangeEmoteInset]>[] = [];

		srcUser = (await gql.GetUser(srcUser.id)).connections.find(i => i.platform === ConnectionPlatform.TWITCH)?.emote_set_id

		if (!srcUser)
			return {
				Success: false,
				Result: 'User does not have a Twitch emote-set',
			}

		toAdd.forEach((emote) => promises.push(addEmote(emote, srcUser, keepAlias)));

		const [success, failed] = await Promise.allSettled(promises).then((i) =>
			ExtractAllSettledPromises<[string, ChangeEmoteInset], [string, string]>(i),
		);

		for (const f of failed) {
			ctx.channel.say(`👎 Failed to add ${f[0]} -> ${f[1]}`);
		}

		for (const s of success) {
			ctx.channel.say(`👍 Added ${s[0]}`);
		}

		return {
			Success: true,
			Result: '',
		};
	};
	LongDescription = async (prefix: string) => [
		'Steal several 7TV emotes from a channel.',
		'If the current channel is not specified, target will be set to the current channel, and the bot will add to the user\'s channel',
		'',
		`**Usage**: ${prefix} yoink #channel emote`,
		`**Example**: ${prefix} yoink #pajlada WideDankCrouching`,
		`**Example**: ${prefix} yoink @melon095 FloppaDank FloppaL`,
		`**Example**: ${prefix} yoink FloppaDank FloppaL #melon095`,
		'',
		'**Note**: Emotes are added case insensitive by default. Use the `-c` flag to make it case sensitive',
		'',
		`**Flags**`,
		'-c, --case',
		'   Case sensitive emote names',
		'',
		'-a, --alias',
		'   Add the emote while retaining the alias',
		'',
	];
}

const getSevenTVAccount = async (channel: string) => {
	const user = await Bot.User.ResolveUsername(channel);

	return gql.GetUser(user);
};

const addEmote = async (
	emote: EnabledEmote,
	emoteset: string,
	keepAlias: boolean,
): Promise<[string, ChangeEmoteInset]> => {
	try {
		const opts: [string, ListItemAction, string, string | undefined] = [
			emoteset,
			ListItemAction.ADD,
			emote.id,
			undefined,
		];

		if (keepAlias) {
			opts[3] = emote.name;
		}

		const [newEmoteSet, name] = await gql.ModifyEmoteSet(...opts);
		return [name ?? emote.name, newEmoteSet];
	} catch (error) {
		let msg = emote.data.name;
		if (emote.IsAlias()) {
			msg += ` (alias of ${emote.data.name})`;
		}

		throw [msg, error];
	}
};
