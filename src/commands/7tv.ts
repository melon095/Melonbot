import { Database, TCommandContext } from '../Typings/types';
import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
import gql, { EmoteSearchFilter } from '../SevenTVGQL.js';

export default class extends CommandModel {
	Name = '7tv';
	Ping = true;
	Description = 'Search 7TV emotes';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [
		{
			name: 'index',
			type: 'string',
		},
		{
			name: 'exact',
			type: 'boolean',
		},
	];
	Flags = [];
	Code = async (ctx: TCommandContext) => {
		if (['add', 'remove'].includes(ctx.input[0])) {
			this.Resolve('Use the remove / add command instead :)');
			return;
		}

		if (ctx.input[0] === undefined) {
			this.Resolve('Please provide a search term.');
			return;
		}

		const filter: EmoteSearchFilter = {};
		if (ctx.data.Params.exact) {
			filter.exact_match = true;
		}

		const emotes = await gql
			.SearchEmoteByName(ctx.input.join(' '), filter)
			.then((res) => res.emotes)
			.catch((err) => {
				this.Resolve(`Error: ${err}`);
				return;
			});

		if (emotes === undefined) return;

		if (emotes.items.length === 0) {
			this.Resolve('No emotes found.');
			return;
		}

		if (emotes.items.length > 1) {
			const index = ctx.data.Params['index']
				? parseInt(ctx.data.Params['index'] as string)
				: 0;

			// split the emotes into chunks of 5
			const chunks = [];
			for (let i = 0; i < emotes.items.length; i += 5) {
				chunks.push(emotes.items.slice(i, i + 5));
			}

			// send based off index
			if (index < chunks.length) {
				this.Resolve(
					chunks[index]
						.map((emote) => `${emote.name} - https://7tv.app/emotes/${emote.id}`)
						.join(' '),
				);
			} else {
				this.Resolve('Index out of range.');
			}
			return;
		}

		this.Resolve(`'${emotes.items[0].name}' - https://7tv.app/emotes/${emotes.items[0].id}`);
	};
}
