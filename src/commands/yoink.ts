import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import gql, { ChangeEmoteInset, EmoteSet, ListItemAction } from '../SevenTVGQL.js';
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
	Params = [[ArgType.Boolean, 'case']];
	Flags = [];
	PreHandlers = [SevenTVAllowed];
	Code = async (ctx: TCommandContext, mods: PreHandlers): Promise<CommandResult> => {
		const input = ctx.input;
		const caseSensitive = ctx.data.Params.case as boolean;

		if (!input.length) {
			return {
				Success: false,
				Result: `Provide a channel and emote name, e.g @${ctx.user.Name} FloppaL`,
			};
		}

		const { EmoteSet } = mods.SevenTV;

		const srcChannel = extractChannel(input);
		if (!srcChannel) {
			return {
				Success: false,
				Result: 'Provide a channel and emote name',
			};
		}
		const emotes = extractEmotes(input, caseSensitive);

		let srcUser;
		try {
			srcUser = await getSevenTVAccount(srcChannel);
		} catch (error) {
			return {
				Success: false,
				Result: 'Could not find that channel',
			};
		}

		let toAdd: Set<EmoteSet> = new Set();
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

		toAdd.forEach((emote) => promises.push(addEmote(emote, EmoteSet())));

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
		'Requires that you have editor status in the current channel.',
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
	];
}

const channelBeginRegex = /^[#@]/;

const extractChannel = (input: string[]) => {
	const channel = input.find((i) => channelBeginRegex.test(i));

	if (!channel) {
		return null;
	}

	return channel.replace(channelBeginRegex, '');
};

const extractEmotes = (input: string[], caseSensitive: boolean) => {
	const e = input.filter((i) => channelBeginRegex.test(i) === false);
	if (caseSensitive) {
		return e;
	}

	return e.map((i) => i.toLowerCase());
};

const getSevenTVAccount = async (channel: string) => {
	const user = await Bot.User.ResolveUsername(channel);

	return gql.GetUser(user);
};

const addEmote = async (emote: EmoteSet, emoteset: string): Promise<[string, ChangeEmoteInset]> => {
	try {
		const res = await gql.ModifyEmoteSet(emoteset, ListItemAction.ADD, emote.id);
		return [emote.name, res];
	} catch (error) {
		throw [emote.name, error]; // Otherwise we lose the emote name
	}
};
