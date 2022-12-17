import { Result, Err, Ok } from './../../tools/result.js';

type TimerOptions = Omit<Database.timers, 'uuid'>;

type TimerIdentifiers = Pick<Database.timers, 'uuid' | 'name'>;

const TimerToDatabase = async (timer: TimerOptions): Promise<Database.timers> => {
	const [{ uuid, name }] = await Bot.SQL.Query<TimerIdentifiers[]>`
        INSERT INTO timers ${Bot.SQL.Get(timer)}
        RETURNING uuid, name
    `;

	return Object.assign(timer, { uuid, name });
};

export default class TimerSingleton {
	private static instance: TimerSingleton;
	public static I(): TimerSingleton {
		if (!TimerSingleton.instance) {
			TimerSingleton.instance = new TimerSingleton();
		}

		return TimerSingleton.instance;
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
		const timers = await Bot.SQL.Query<Database.timers[]>`
            SELECT * FROM timers
        `;

		for (const opts of timers) {
			const currentTitle = await Bot.Redis.SGet(`channel:${opts.owner}:title`);
			const timers = this._timers.get(opts.owner);

			const timer = new SingleTimer(opts);
			if (opts.enabled && timer.TitleMatches(currentTitle)) {
				timer.Start().unwrap();
			}

			if (!timers) {
				this._timers.set(opts.owner, new Set([timer]));
			} else {
				timers.add(timer);
			}
		}

		console.log(`[TimerSingleton] Initialized with ${timers.length} timers`);

		return this;
	}

	public async CreateNewTimer(opts: TimerOptions): Promise<Result<SingleTimer, string>> {
		const alreadyExists = await Bot.SQL.Query<Database.timers[]>`
            SELECT * FROM timers WHERE name = ${opts.name} AND owner = ${opts.owner}
        `;

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

		timer.Start().unwrap();

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

		await Bot.SQL.Query`
            DELETE FROM timers WHERE name = ${name} AND owner = ${userid}
        `;

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
		console.log(`[SingleTimer] ${message} for ${timer.Name} on ${timer.Owner}`);
	}

	private _intervalCounter: NodeJS.Timeout | null = null;

	public constructor(private opts: Database.timers) {}

	public OnTitleChange(title: string) {
		if (this.Titles.length === 0) {
			return;
		}

		if (this.Titles.includes(title)) {
			SingleTimer._Log('Title change detected, enabling timer', this);
			try {
				this.Start();
			} catch (e) {
				SingleTimer._Log(`Error starting timer: ${e}`, this);
			}
		} else {
			SingleTimer._Log('Title change detected, disabling timer', this);
			this.Stop();
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

	public ToDatabaseDefinition(): Database.timers {
		return this.opts;
	}

	public TitleMatches(title: string): boolean {
		if (this.Titles.length === 0) {
			return true;
		}

		return this.Titles.includes(title);
	}

	public Start(): Result<null, string> {
		if (this._intervalCounter) {
			return new Err('Timer is already running');
		}

		this._intervalCounter = setInterval(() => {
			const channel = Bot.Twitch.Controller.TwitchChannelSpecific({ ID: this.Owner });

			if (!channel) {
				Bot.HandleErrors('Timer', 'Channel not found: ' + this.opts.uuid);
				return;
			}

			channel.say(this.Message);
		}, fixInterval(this.Interval));

		Bot.SQL.Query`
            UPDATE timers SET enabled = true WHERE uuid = ${this.UUID}
        `.execute();

		return new Ok(null);
	}

	public Stop(): Result<null, string> {
		if (!this._intervalCounter) {
			return new Err('Timer is not running');
		}

		clearInterval(this._intervalCounter);
		this._intervalCounter = null;

		Bot.SQL.Query`
            UPDATE timers SET enabled = false WHERE uuid = ${this.UUID}
        `.execute();

		return new Ok(null);
	}
}

const fixInterval = (interval: number): number => interval * 1000;
