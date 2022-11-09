import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import gql, { ConnectionPlatform, EmoteSearchFilter } from '../SevenTVGQL.js';

export default class extends CommandModel {
	Name = '7tv';
	Ping = true;
	Description = 'Search 7TV emotes';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [
		[ArgType.String, 'index'],
		[ArgType.Boolean, 'exact'],
		[ArgType.String, 'author'],
	];
	Flags = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		if (['add', 'remove'].includes(ctx.input[0])) {
			return {
				Success: true,
				Result: 'Use the remove / add comamnd instead :)',
			};
		}

		if (ctx.input[0] === undefined) {
			return {
				Success: false,
				Result: 'Please provide a search term',
			};
		}

		const filter: EmoteSearchFilter = {};
		if (ctx.data.Params.exact) {
			filter.exact_match = true;
		}

		let emotes;
		try {
			emotes = await gql
				.SearchEmoteByName(ctx.input.join(' '), filter)
				.then((res) => res.emotes)
				.then(async (emotes) => {
					if (ctx.data.Params.author) {
						const user = await Bot.User.ResolveUsername(
							(ctx.data.Params.author as string).toLowerCase(),
						);
						if (!user) return emotes.items;

						return emotes.items.filter((e) => {
							const twitchUID = e.owner?.connections?.find(
								(o) => o.platform === ConnectionPlatform.TWITCH,
							)?.id;

							if (!twitchUID) return user.Name === e.owner?.username;

							return twitchUID === user.TwitchUID;
						});
					}

					return emotes.items;
				});
		} catch (error) {
			return {
				Success: false,
				Result: `7TV Error: ${error}`,
			};
		}

		if (emotes.length === 0) {
			return {
				Success: false,
				Result: 'No emotes found :(',
			};
		}

		if (emotes.length > 1) {
			const index = ctx.data.Params['index']
				? parseInt(ctx.data.Params['index'] as string)
				: 0;

			// split the emotes into chunks of 5
			const chunks = [];
			for (let i = 0; i < emotes.length; i += 5) {
				chunks.push(emotes.slice(i, i + 5));
			}

			let message;
			// send based off index
			if (index < chunks.length) {
				message = chunks[index]
					.map((emote) => `${emote.name} - https://7tv.app/emotes/${emote.id}`)
					.join(' ');
			} else {
				message = `Index out of range (0-${chunks.length - 1})`;
			}

			return {
				Success: true,
				Result: message,
			};
		}
		return {
			Success: true,
			Result: `'${emotes[0].name}' - https://7tv.app/emotes/${emotes[0].id}`,
		};
	};
	LongDescription = async (prefix: string) => [
		`Searches up to 100 7TV emotes.`,
		`**Usage**: ${prefix}7tv <search term>`,
		`**Example**: ${prefix}7tv Apu`,
		'-e, --exact',
		'   Search for an exact match',
		'',
		'-i, --index <number>',
		'   Return the emotes at the specified index',
		'',
		'-a, --author <username>',
		'   Return only emotes from the specified twitch username',
		'',
		'By default the command will return the first 5 emotes',
	];
}
