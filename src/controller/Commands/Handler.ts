import { CommandModel } from './../../Models/Command.js';
import fs from 'node:fs';
import { exit } from 'node:process';
import { resolve } from 'node:path';
import { EPermissionLevel } from './../../Typings/enums.js';
import { Import } from './../../tools/tools.js';

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

	constructor() {
		this.commandNameList = [];
	}

	async initialize(): Promise<void> {
		try {
			// Read all commands into this.commandData
			const _cmds_ = await this.FindCommands().catch((e) => {
				console.error('Unable to read the directory of commands', e);
				process.exitCode = -1;
				exit();
			});
			for (const command of _cmds_) {
				const c = new command();
				this.commandNameList.push({
					Name: c.Name,
					Aliases: c.Aliases,
					Description: c.Description,
					Permission: c.Permission,
				});
			}
			return Promise.resolve();
		} catch (e) {
			Bot.HandleErrors('CommandsHandler/initialize', new Error(e as never));
			return Promise.reject();
		}
	}

	async get(identifier: string): Promise<CommandModel | undefined> {
		return new Promise((Resolve) => {
			const command = this.commandNameList.find(
				(command) => command.Name === identifier || command.Aliases?.includes(identifier),
			);

			if (command === undefined) return Resolve(undefined);

			Import(resolve(process.cwd(), 'build/commands'), `${command.Name}.js`)
				.then((c) => Resolve(new c()))
				.catch((e) => {
					Bot.HandleErrors('CommandsHandler/getCommands', new Error(e as string));
					Resolve(undefined);
				});
		});
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
		// eslint-disable-next-line no-async-promise-executor
		return new Promise(async (Resolve, Reject) => {
			try {
				const commands: NodeRequire[] = [];
				const dirname = `${process.cwd()}/build/commands`;

				const dir = fs.readdirSync(dirname, { withFileTypes: true });

				for (const command of dir) {
					if (command.name.split('.')[2] !== 'map') {
						const file = await Import(
							resolve(process.cwd(), 'build/commands'),
							command.name,
						);
						commands.push(file);
					}
				}
				return Resolve(commands as unknown as Class[]);
			} catch (e) {
				return Reject(e);
			}
		});
	}
}
