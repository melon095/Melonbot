import { CommandModel } from './../../Models/Command.js';
import fs from 'node:fs';
import { exit } from 'node:process';
import { resolve } from 'node:path';
import { EPermissionLevel } from './../../Typings/enums.js';
import { Import } from './../../tools/tools.js';
import { Logger } from './../../logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type Class = new (...args: any[]) => CommandModel;

/**
 * Controls the commands and loads commands from here.
 */
export class CommandsHandler {
	private commandNameList: {
		Name: string;
		Aliases: string[];
		Description: string;
		Permission: EPermissionLevel;
	}[];

	constructor(private readonly logger: Logger) {
		this.commandNameList = [];
	}

	async initialize(): Promise<void> {
		try {
			// Read all commands into this.commandData
			const _cmds_ = await this.FindCommands().catch((e) => {
				this.logger.Error('Unable to read the directory of commands %O', e);
				process.exitCode = -1;
				exit();
			});
			const instantiatedCommands: CommandModel[] = [];

			const dbCommands = await Bot.SQL.Query<Database.commands[]>`SELECT * FROM commands`;

			for (const command of _cmds_) {
				const c = new command();
				this.commandNameList.push({
					Name: c.Name,
					Aliases: c.Aliases,
					Description: c.Description,
					Permission: c.Permission,
				});
				instantiatedCommands.push(c);
			}

			for (const command of instantiatedCommands) {
				const realCommand = {
					name: command.Name,
					description: command.Description,
					perm: command.Permission,
				};

				for (const dbcommand of dbCommands) {
					if (dbcommand.name === command.Name) {
						if (
							dbcommand.description !== command.Description ||
							dbcommand.perm !== command.Permission
						) {
							await Bot.SQL.Query`
                            UPDATE commands 
                            SET ${Bot.SQL.Get(realCommand, 'description', 'perm')} 
                            WHERE name=${realCommand.name}`;
						}
					}
				}
			}

			const commandNames = instantiatedCommands.map((x) => x.Name);
			const dbcommandNames = dbCommands.map((x) => x.name);
			const commandDiff = instantiatedCommands.filter(
				(x) => !dbcommandNames.includes(x.Name),
			);
			const dbcommandDiff = dbCommands.filter((x) => !commandNames.includes(x.name));
			for (const command of commandDiff) {
				const realCommand = {
					name: command.Name,
					description: command.Description,
					perm: command.Permission,
				};

				await Bot.SQL.Query`INSERT INTO commands ${Bot.SQL.Get(
					realCommand,
					'name',
					'description',
					'perm',
				)}  ON CONFLICT(id) DO NOTHING`;
			}

			for (const dbCommand of dbcommandDiff) {
				await Bot.SQL.Query`DELETE FROM commands WHERE name=${dbCommand.name}`;
			}

			return;
		} catch (e) {
			this.logger.Error(e as Error, 'CommandsHandler/initialize');
			return;
		}
	}

	async get(identifier: string): Promise<CommandModel | undefined> {
		const command = this.commandNameList.find(
			(command) => command.Name === identifier || command.Aliases?.includes(identifier),
		);

		if (command === undefined) return undefined;

		const c = Import(resolve(process.cwd(), 'build/commands'), `${command.Name}.js`)
			.then((c) => new c())
			.catch((e) => {
				this.logger.Error(e as Error, 'CommandsHandler/getCommands');
				return undefined;
			});

		return c;
	}

	get Commands() {
		return this.commandNameList;
	}
	get Names() {
		const names = [];
		for (const command of this.commandNameList) {
			names.push(command.Name);
		}
		return names;
	}

	private async FindCommands(): Promise<Class[]> {
		const commands: NodeRequire[] = [];
		const dirname = `${process.cwd()}/build/commands`;

		const dir = fs.readdirSync(dirname, { withFileTypes: true });

		for (const command of dir) {
			if (command.name.split('.')[2] !== 'map') {
				const file = await Import(resolve(process.cwd(), 'build/commands'), command.name);
				commands.push(file);
			}
		}
		return commands as unknown as Class[];
	}
}
