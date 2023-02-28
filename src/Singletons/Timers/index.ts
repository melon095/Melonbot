import TimerTable, { InsertableTable, SelectableTable } from 'controller/DB/Tables/TimerTable.js';
import { BinaryOperationNode, Generated } from 'kysely';
import { Logger } from './../../logger.js';
import { Result, Err, Ok } from './../../tools/result.js';

const TimerToDatabase = async (timer: InsertableTable): Promise<SelectableTable> => {
	const table = await Bot.SQL.insertInto('timers')
		.values(timer)
		.returning('uuid')
		.executeTakeFirst();

	if (!table?.uuid) throw new Error('Failed to insert timer');

	return {
		uuid: table.uuid,
		owner: timer.owner,
		name: timer.name,
		interval: timer.interval,
		message: timer.message,
		enabled: timer.enabled,
		titles: timer.titles,
	};
};

export default class TimerSingleton {
	private static instance: TimerSingleton;
	private readonly logger: Logger;
	public static I(): TimerSingleton {
		if (!TimerSingleton.instance) {
			TimerSingleton.instance = new TimerSingleton();
		}

		return TimerSingleton.instance;
	}

	private constructor() {
		this.logger = Bot.Log;
	}

	/**
	 * Timers where the key is the streamer userid and the value is the timer
	 */
	private _timers: Map<string, Set<SingleTimer>> = new Map();

	/**
	 *
	 * @param userid Channel userid
	 * @param name Name of the timer
	 * @returns
	 */
	private getTimer(userid: string, name: string): Result<SingleTimer, string> {
		const timers = this._timers.get(userid);

		if (!timers) {
			return new Err('No timers found');
		}

		let timer;
		for (const t of timers) {
			if (t.Name === name) {
				timer = t;
				break;
			}
		}

		if (!timer) {
			return new Err('No timer found');
		}

		return new Ok(timer);
	}

	public async Initialize(): Promise<this> {
		const timerStream = Bot.SQL.selectFrom('timers').selectAll().stream();
		let count = 0;

		for await (const opts of timerStream) {
			const currentTitle = await Bot.Redis.SGet(`channel:${opts.owner}:title`);
			const timers = this._timers.get(opts.owner);

			const timer = new SingleTimer(opts);
			if (opts.enabled && timer.TitleMatches(currentTitle)) {
				(await timer.Start()).unwrap();
			}

			if (!timers) {
				this._timers.set(opts.owner, new Set([timer]));
			} else {
				timers.add(timer);
			}

			count++;
		}

		this.logger.Info(`[TimerSingleton] Initialized with %d timers`, count);

		return this;
	}

	public async CreateNewTimer(opts: InsertableTable): Promise<Result<SingleTimer, string>> {
		const alreadyExists = await Bot.SQL.selectFrom('timers')
			.selectAll()
			.where('name', '=', opts.name)
			.where('owner', '=', opts.owner)
			.execute();

		if (alreadyExists.length > 0) {
			return new Err('There is already a timer with that name');
		}

		const timer = new SingleTimer(await TimerToDatabase(opts));

		const timers = this._timers.get(opts.owner);
		if (!timers) {
			this._timers.set(opts.owner, new Set([timer]));
		} else {
			timers.add(timer);
		}

		(await timer.Start()).unwrap();

		return new Ok(timer);
	}

	public async DeleteTimer(userid: string, name: string): Promise<Result<void, string>> {
		const timers = this._timers.get(userid);
		if (!timers) {
			return new Err('No timers found');
		}

		const timer = this.getTimer(userid, name).unwrap();

		timer.Stop();

		timers.delete(timer);

		Bot.Log.Debug('Deleting timer %s', name);

		await Bot.SQL.deleteFrom('timers')
			.where('name', '=', name)
			.where('owner', '=', userid)
			.execute();

		return new Ok(undefined);
	}

	public async GetTimers(userid: string): Promise<Set<SingleTimer>> {
		const timers = this._timers.get(userid);
		if (!timers) {
			const newSet: Set<SingleTimer> = new Set();
			this._timers.set(userid, newSet);
			return newSet;
		}

		return timers;
	}

	public async EnableTimer(userid: string, name: string): Promise<Result<null, string>> {
		const timers = this._timers.get(userid);

		if (!timers) {
			return new Err('No timers found');
		}

		const timer = this.getTimer(userid, name).unwrap();

		return timer.Start();
	}

	public async DisableTimer(userid: string, name: string): Promise<Result<null, string>> {
		const timers = this._timers.get(userid);
		if (!timers) {
			return new Err('No timers found');
		}

		const timer = this.getTimer(userid, name).unwrap();

		return timer.Stop();
	}
}

export class SingleTimer {
	private static _Log(message: string, timer: SingleTimer) {
		Bot.Log.Info(`[SingleTimer] %s for %s on %s`, message, timer.Name, timer.Owner);
	}

	private _intervalCounter: NodeJS.Timeout | null = null;

	public constructor(private opts: SelectableTable) {}

	public async OnTitleChange(title: string) {
		if (this.Titles.length === 0) {
			return;
		}

		if (this.Titles.includes(title)) {
			SingleTimer._Log('Title change detected, enabling timer', this);
			try {
				await this.Start();
			} catch (e) {
				SingleTimer._Log(`Error starting timer: ${e}`, this);
			}
		} else {
			SingleTimer._Log('Title change detected, disabling timer', this);
			await this.Stop();
		}
	}

	public get UUID(): string {
		return this.opts.uuid;
	}

	public get Owner(): string {
		return this.opts.owner;
	}

	public get Name(): string {
		return this.opts.name;
	}

	public get Interval(): number {
		return this.opts.interval;
	}

	public get Message(): string {
		return this.opts.message;
	}

	public get Titles(): string[] {
		return this.opts.titles;
	}

	public ToDatabaseDefinition(): SelectableTable {
		return this.opts;
	}

	public TitleMatches(title: string): boolean {
		if (this.Titles.length === 0) {
			return true;
		}

		return this.Titles.includes(title);
	}

	public async Start(): Promise<Result<null, string>> {
		if (this._intervalCounter) {
			return new Err('Timer is already running');
		}

		this._intervalCounter = setInterval(() => {
			const channel = Bot.Twitch.Controller.TwitchChannelSpecific({ ID: this.Owner });

			if (!channel) {
				Bot.Log.Error('Timer: Channel not found %s', this.opts.uuid);
				return;
			}

			channel.say(this.Message);
		}, fixInterval(this.Interval));

		Bot.Log.Debug('Timer: Started %s', this.opts.uuid);

		await Bot.SQL.updateTable('timers')
			.set({ enabled: true })
			.where('uuid', '=', this.UUID)
			.execute();

		return new Ok(null);
	}

	public async Stop(): Promise<Result<null, string>> {
		if (!this._intervalCounter) {
			return new Err('Timer is not running');
		}

		clearInterval(this._intervalCounter);
		this._intervalCounter = null;

		await Bot.SQL.updateTable('timers')
			.set({ enabled: false })
			.where('uuid', '=', this.UUID)
			.execute();

		return new Ok(null);
	}
}

const fixInterval = (interval: number): number => interval * 1000;
