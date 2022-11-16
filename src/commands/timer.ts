import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import { Result, Ok, Err } from './../tools/result.js';
import got from './../tools/Got.js';

/** https://github.com/zer0bin-dev/zer0bin */
type ZeroBinResponse = {
	success: boolean;
	data: {
		content: string;
		id: string;
		single_view: boolean;
	};
};

const Upload = async (content: string): Promise<string> => {
	const resp = (await got('json')({
		url: 'https://zer0b.in/api/p/n',
		method: 'POST',
		json: {
			content,
			single_view: false,
		},
	}).json()) as ZeroBinResponse;

	if (!resp.success) {
		throw new Error('Failed to upload to zer0bin');
	}

	return `https://zer0b.in/${resp.data.id}`;
};

type ACTION_TYPE = 'create' | 'delete' | 'list' | 'enable' | 'disable';

type actionHandler = (
	ctx: Omit<TCommandContext, 'input'>,
	args: string[],
) => Promise<Result<string, string>>;

const actionHandlers: Record<ACTION_TYPE, actionHandler> = {
	create: async (ctx, args) => {
		const _int = ctx.data.Params.interval as string;
		let interval = 60;

		if (_int !== '') {
			interval = parseInt(_int);
		}

		if (isNaN(interval) || interval < 1) {
			return new Err('Invalid interval');
		}

		if (interval < 60) {
			interval = 60;
		}

		const [name, ...message] = args;

		if (!name) {
			return new Err('No name provided');
		}

		if (!message.length) {
			return new Err('No message provided');
		}

		const timer = await Bot.Timers.CreateNewTimer({
			interval,
			name,
			message: message.join(' '),
			owner: ctx.channel.Id,
		});

		if (timer.err) {
			// Create new, so we don't copy SingleTimer
			return new Err(timer.inner);
		}

		return new Ok(`Created timer :)`);
	},
	delete: async (ctx, args) => {
		const [name] = args;

		if (!name) {
			return new Err('No name provided');
		}

		const res = await Bot.Timers.DeleteTimer(ctx.channel.Id, name);

		if (res.err) {
			return res;
		}

		return new Ok(`Deleted timer :)`);
	},
	list: async (ctx) => {
		const list = await Bot.Timers.GetTimers(ctx.channel.Id);

		if (list.err) {
			return list;
		}

		if (list.unwrap().size === 0) {
			return new Ok('No timers found');
		}

		const msg = [];

		for (const t of list.unwrap()) {
			msg.push(`${t.Name} - ${t.Interval}m`);
		}

		if (list.unwrap().size > 5) {
			const paste = await Upload(msg.join('\n'));

			return new Ok(`Too many timers to list, uploaded to ${paste}`);
		}

		return new Ok(`Timers: ${msg.join(', ')}`);
	},
	enable: async (ctx, args) => {
		const [name] = args;

		if (!name) {
			return new Err('No name provided');
		}

		const res = await Bot.Timers.EnableTimer(ctx.channel.Id, name);

		if (res.err) {
			return res;
		}

		return new Ok(`Enabled timer :)`);
	},
	disable: async (ctx, args) => {
		const [name] = args;

		if (!name) {
			return new Err('No name provided');
		}

		const res = await Bot.Timers.DisableTimer(ctx.channel.Id, name);

		if (res.err) {
			return res;
		}

		return new Ok(`Disabled timer :)`);
	},
};

export default class extends CommandModel {
	Name = 'timer';
	Ping = true;
	Description = 'Enabled or disable chat timers';
	Permission = EPermissionLevel.MOD;
	OnlyOffline = false;
	Aliases = ['timers'];
	Cooldown = 5;
	Params = [[ArgType.String, 'interval']];
	Flags = [];
	PreHandlers = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const { input } = ctx;

		if (input.length === 0) {
			return {
				Success: false,
				Result: `Specify something to do with timers... (${Bot.Config.Prefix}help timer)`,
			};
		}

		const [action, ...args] = input as [ACTION_TYPE, ...string[]];

		if (!actionHandlers[action]) {
			return {
				Success: false,
				Result: `Unknown action ${action}`,
			};
		}

		const result = await actionHandlers[action](ctx, args);

		return {
			Success: result.err ? false : true,
			Result: result.inner,
		};
	};
	LongDescription = async (prefix: string) => [
		`This command can be used to disable or enable chat timers.`,
		`A Timer is a message that is sent every X seconds to a channel.`,
		`${prefix}timer create <name> <message>`,
		`${prefix}timer delete <name>`,
		`${prefix}timer list`,
		`${prefix}timer enable <name>`,
		`${prefix}timer disable <name>`,
		'',
		`**Example**: ${prefix}timer create test This is a test message`,
		'',
		`-i, --interval <interval>`,
		`The interval in seconds between each message. Default is 60 seconds.`,
	];
}
