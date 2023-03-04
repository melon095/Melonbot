import { EPermissionLevel } from '../../Typings/enums.js';
import { ArgType, TCommandContext } from '../../Models/Command.js';
import { Result, Ok, Err } from './../../tools/result.js';
import got from './../../tools/Got.js';
import Timers from './../../Singletons/Timers/index.js';
import { registerCommand } from '../../controller/Commands/Handler.js';

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

type ACTION_TYPE = 'create' | 'add' | 'delete' | 'remove' | 'list' | 'enable' | 'disable';

type actionHandler = (
	ctx: Omit<TCommandContext, 'input'>,
	args: string[],
) => Promise<Result<string, string>>;

const actionHandlers: Record<ACTION_TYPE, actionHandler> = {
	create: async (ctx, args) => {
		const _int = ctx.data.Params.interval as string;
		const titles = (ctx.data.Params.titles as string).split(',').filter(Boolean);
		let interval = 60;

		if (_int !== '') {
			interval = parseInt(_int);
		}

		if (isNaN(interval) || interval < 1) {
			return new Err('Invalid interval');
		}

		if (interval < 10) {
			interval = 10;
		}

		const [name, ...message] = args;

		if (!name) {
			return new Err('No name provided');
		}

		if (!message.length) {
			return new Err('No message provided');
		}

		const timer = (
			await Timers.I().CreateNewTimer({
				interval,
				name,
				message: message.join(' '),
				owner: ctx.channel.Id,
				enabled: true,
				titles,
			})
		).unwrap();

		let msg = `Created timer ${name}, Sent every ${interval}s`;

		if (titles.length !== 0) {
			msg += `, Titles: ${titles.join(', ')}`;
			const currentTitle = await Bot.Redis.SGet(`channel:${ctx.channel.Id}:title`);

			if (!titles.includes(currentTitle)) {
				timer.Stop();
				msg += `, Stopped because title is not in list`;
			}
		}

		return new Ok(msg);
	},
	add: async (ctx, args) => {
		return actionHandlers.create(ctx, args);
	},
	delete: async (ctx, args) => {
		const [name] = args;

		if (!name) {
			return new Err('No name provided');
		}

		const res = await Timers.I().DeleteTimer(ctx.channel.Id, name);

		if (res.err) {
			return res;
		}

		return new Ok(`Deleted timer :)`);
	},
	remove: async (ctx, args) => {
		return actionHandlers.delete(ctx, args);
	},
	list: async (ctx) => {
		const list = await Timers.I().GetTimers(ctx.channel.Id);

		if (list.size === 0) {
			return new Ok('No timers found');
		}

		const msg = [];

		for (const t of list) {
			msg.push(`${t.Name} - ${t.Interval}s`);
		}

		if (list.size > 5) {
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

		const res = await Timers.I().EnableTimer(ctx.channel.Id, name);

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

		const res = await Timers.I().DisableTimer(ctx.channel.Id, name);

		if (res.err) {
			return res;
		}

		return new Ok(`Disabled timer :)`);
	},
};

registerCommand({
	Name: 'timer',
	Ping: true,
	Description: 'Enabled or disable chat timers',
	Permission: EPermissionLevel.MOD,
	OnlyOffline: false,
	Aliases: ['timers'],
	Cooldown: 5,
	Params: [
		[ArgType.String, 'interval'],
		[ArgType.String, 'titles'],
	],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
		const { input } = ctx;

		if (input.length === 0) {
			return {
				Success: false,
				Result: `Specify something to do with timers... (${Bot.Config.Prefix}help timer)`,
			};
		}

		const [action, ...args] = input as [ACTION_TYPE, ...string[]];

		const fn = actionHandlers[action];

		if (!fn) {
			return {
				Success: false,
				Result: `Unknown action ${action}`,
			};
		}

		const result = await fn(ctx, args);

		return {
			Success: result.err ? false : true,
			Result: result.inner,
		};
	},
	LongDescription: async (prefix) => [
		`This command can be used to disable or enable chat timers.`,
		`A Timer is a message that is sent every X seconds to a channel.`,
		`${prefix}timer create|add <name> <message>`,
		`${prefix}timer delete|remove <name>`,
		`${prefix}timer list`,
		`${prefix}timer enable <name>`,
		`${prefix}timer disable <name>`,
		'',
		`**Example**: ${prefix}timer create test This is a test message`,
		'',
		`-i, --interval <interval>`,
		`The interval in seconds between each message. Default is 60 seconds.`,
		'',
		'-t, --titles <title>',
		'Will only keep the timer alive if the title of the stream is one of the provided titles.',
		'Commane separated list of titles.',
		`**Example**: ${prefix}timer create test Test message --titles forsen`,
		`**Example**: ${prefix}timer create test Test message --titles forsen,forsen2,forsen3`,
		`**Example**: ${prefix}timer create test Test message --titles "this is a big title,forsen"`,
	],
});
