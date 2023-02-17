export type Command = {
	Name: string;
	Aliases: string | 'None';
	Description: string;
	Cooldown: string;
	Permission: string;
	LongDescription: string;
};

export type CommandList = {
	Commands: {
		Table: Pick<Command, 'Name' | 'Description' | 'Permission'>;
		allowedToRun: boolean | null;
	}[];
};

export type CommandInfo = {
	error?: string;
	Command: Command;
	allowedToRun: boolean | null;
};
