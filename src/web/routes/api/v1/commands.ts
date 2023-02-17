import User from './../../../../controller/User/index.js';
import { FastifyInstance } from 'fastify';
import { CommandModel } from './../../../../Models/Command.js';
import { EPermissionLevel } from './../../../../Typings/enums.js';
import AuthenticationValidator from './../../..//Hooks/AuthenticationValidator.js';
import { NCommandFunctions } from './../../../../tools/tools.js';
import { NCommand } from 'Typings/types.js';

export default async function (fastify: FastifyInstance) {
	fastify.route({
		method: 'GET',
		url: '/',
		preParsing: AuthenticationValidator('REDIRECT', true),
		handler: async (req, reply) => {
			function MeetsPermissionLevel(user: User, permission: NCommand.Mode): boolean {
				if (permission === 'Admin') {
					if (user.Role === 'admin') {
						return true;
					}
					return false;
				}
				return true;
			}

			let user;

			if (req.authenticatedUser) {
				const { identifier, username } = req.authenticatedUser!;
				user = await Bot.User.Get(identifier, username);
			}

			const commands = await Bot.SQL.Query<Database.commands[]>`SELECT * FROM commands`;

			const table = [];

			if (!commands.length) {
				return { commands: [] };
			}
			for (const command of commands) {
				const Permission = NCommandFunctions.DatabaseToMode(command.perm);

				table.push({
					Table: {
						Name: command.name,
						Description: command.description,
						Permission,
					},
					allowedToRun: user ? MeetsPermissionLevel(user, Permission) : null,
				});
			}

			return { Commands: table };
		},
	});

	fastify.route<{ Params: { name: string } }>({
		method: 'GET',
		url: '/:name',
		preParsing: AuthenticationValidator('REDIRECT', true),
		handler: async (req, reply) => {
			function AllowedToRunCommand(command: CommandModel<object>, user: User): boolean {
				if (command.Permission === EPermissionLevel.ADMIN) {
					if (user.Role === 'admin') {
						return true;
					}

					return false;
				}

				return true;
			}

			let user;

			if (req.authenticatedUser) {
				const { identifier, username } = req.authenticatedUser!;
				user = await Bot.User.Get(identifier, username);
			}

			const Name = req.params.name;

			const command = await Bot.Commands.get(Name);

			if (!command) {
				reply.status(404);
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
				LongDescription,
			};

			let allowedToRun: null | boolean = null;

			if (user) {
				allowedToRun = AllowedToRunCommand(command, user);
			}

			return { Command: Table, allowedToRun };
		},
	});
}
