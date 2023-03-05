import assert from 'node:assert';
import { InvalidInputError, ThirdPartyError } from '../../Models/Errors.js';
import { CommandModel, CreatableCommand, EarlyEndOptions } from './../../Models/Command.js';

const LoadedCommands = new Map<string, CommandModel>();

const EarlyEndOptions: EarlyEndOptions = {
	InvalidInput: function (reason) {
		throw new InvalidInputError(reason || 'Unknown');
	},
	ThirdPartyError: function (reason) {
		throw new ThirdPartyError(reason || 'Unknown');
	},
} as const;

function InjectFunctions(command: CreatableCommand): CommandModel {
	return {
		...command,
		EarlyEnd: EarlyEndOptions,
		Execute: async function (ctx, mods) {
			return this.Code(ctx, mods);
		},
		HasFlag: function (flag) {
			return this.Flags.includes(flag);
		},
	};
}

export function registerCommand<Mods extends object = object>(command: CreatableCommand<Mods>) {
	assert(LoadedCommands.has(command.Name) === false, `Command ${command.Name} already exists`);

	// @ts-ignore // We really do not care if Mods and object something something cant go togheter..
	LoadedCommands.set(command.Name, InjectFunctions(command));
}

export async function StoreToDB() {
	// FIXME: Fix this one day please.
	try {
		const dbCommands = await Bot.SQL.selectFrom('commands').selectAll().execute();

		for (const [name, command] of LoadedCommands) {
			const realCommand = {
				name,
				description: command.Description,
				perm: command.Permission,
			};
			for (const dbcommand of dbCommands) {
				if (dbcommand.name === command.Name) {
					if (
						dbcommand.description !== command.Description ||
						dbcommand.perm !== command.Permission
					) {
						await Bot.SQL.updateTable('commands')
							.set(realCommand)
							.where('name', '=', realCommand.name)
							.execute();
					}
				}
			}
		}
		const dbcommandNames = dbCommands.map((x) => x.name);

		const commandDiff = Array.from(LoadedCommands.values()).filter(
			(x) => !dbcommandNames.includes(x.Name),
		);
		const dbcommandDiff = dbCommands.filter((x) => !LoadedCommands.has(x.name));
		for (const command of commandDiff) {
			const realCommand = {
				name: command.Name,
				description: command.Description,
				perm: command.Permission,
			};
			await Bot.SQL.insertInto('commands')
				.values(realCommand)
				.onConflict((opts) => opts.column('id').doNothing())
				.execute();
		}

		await Promise.all(
			dbcommandDiff.map((dbCommand) =>
				Bot.SQL.deleteFrom('commands').where('name', '=', dbCommand.name).execute(),
			),
		);
	} catch (e) {
		Bot.Log.Error(e as Error, 'CommandsHandler/initialize');
	}
}

export function GetCommandBy(identifier: string): CommandModel | undefined {
	const command = LoadedCommands.get(identifier);

	if (command) {
		return command;
	}

	const aliased = Array.from(LoadedCommands.values()).find((x) => x.Aliases.includes(identifier));

	if (aliased) {
		return aliased;
	}

	return undefined;
}

// 	get Commands() {
// 		return this.commandNameList;
// 	}
// 	get Names() {
// 		const names = [];
// 		for (const command of this.commandNameList) {
// 			names.push(command.Name);
// 		}
// 		return names;
// 	}
