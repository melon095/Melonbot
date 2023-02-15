import { FastifyInstance } from 'fastify';
import { NCommandFunctions } from './../../../../tools/tools.js';

export default async function (fastify: FastifyInstance) {
	fastify.route({
		method: 'GET',
		url: '/',
		handler: async () => {
			const commands = await Bot.SQL.Query<Database.commands[]>`SELECT * FROM commands`;

			const table = [];

			if (!commands.length) {
				return { commands: [] };
			}
			for (const command of commands) {
				table.push({
					Name: command.name,
					Description: command.description,
					Permission: NCommandFunctions.DatabaseToMode(command.perm),
				});
			}

			return { commands: table };
		},
	});

	interface IParams {
		name: string;
	}

	fastify.route<{ Params: IParams }>({
		method: 'GET',
		url: '/:name',
		handler: async (req, res) => {
			const Name = req.params.name;

			const command = await Bot.Commands.get(Name);

			if (!command) {
				return { error: 'That command does not exist', Command: null };
			}

			const prefix = Bot.Config.Prefix;

			const LongDescription =
				(await command.LongDescription?.(prefix))?.join('\n') || 'No description';

			const Alias = command.Aliases.length ? command.Aliases.join(', ') : 'None';

			const Table = {
				Name: command.Name,
				Aliases: Alias,
				Description: command.Description,
				Cooldown: `${command.Cooldown} Seconds`,
				Permission: NCommandFunctions.DatabaseToMode(command.Permission),
				'Long Description': LongDescription,
			};

			return { Command: Table };
		},
	});
}
