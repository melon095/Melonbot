import { Result, Err, Ok } from './../../tools/result.js';

type TimerOptions = Pick<Database.timers, 'name' | 'owner' | 'interval' | 'message'>;

type TimerIdentifiers = Pick<Database.timers, 'uuid' | 'name'>;

const TimerToDatabase = async (timer: TimerOptions): Promise<Database.timers> => {
	const [{ uuid, name }] = await Bot.SQL.Query<TimerIdentifiers[]>`
        INSERT INTO timers ${Bot.SQL.Get(timer)}
        RETURNING uuid, name
    `;

	return { uuid, name, interval: timer.interval, message: timer.message, owner: timer.owner };
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
	 * Timers where the key is the streamer and the value is the timer
	 */
	private _timers: Map<string, Set<SingleTimer>> = new Map();

	private getTimer(channel: string, name: string): Result<SingleTimer, string> {
		const timers = this._timers.get(channel);

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
			const timers = this._timers.get(opts.owner);

			const timer = new SingleTimer(opts);
			timer.Start().unwrap();

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

	public async DeleteTimer(channel: string, name: string): Promise<Result<void, string>> {
		const timers = this._timers.get(channel);
		if (!timers) {
			return new Err('No timers found');
		}

		const timer = this.getTimer(channel, name).unwrap();

		timer.Stop();

		timers.delete(timer);

		await Bot.SQL.Query`
            DELETE FROM timers WHERE name = ${name} AND owner = ${channel}
        `;

		return new Ok(undefined);
	}

	public async GetTimers(channel: string): Promise<Result<Set<SingleTimer>, string>> {
		const timers = this._timers.get(channel);
		if (!timers) {
			return new Err('No timers found');
		}

		return new Ok(timers);
	}

	public async EnableTimer(channel: string, name: string): Promise<Result<null, string>> {
		const timers = this._timers.get(channel);

		if (!timers) {
			return new Err('No timers found');
		}

		const timer = this.getTimer(channel, name).unwrap();

		return timer.Start();
	}

	public async DisableTimer(channel: string, name: string): Promise<Result<null, string>> {
		const timers = this._timers.get(channel);
		if (!timers) {
			return new Err('No timers found');
		}

		const timer = this.getTimer(channel, name).unwrap();

		return timer.Stop();
	}
}

export class SingleTimer {
	private _intervalCounter: NodeJS.Timeout | null = null;

	public constructor(private opts: Database.timers) {}

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

	public ToDatabaseDefinition(): Database.timers {
		return this.opts;
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

const fixInterval = (minute: number): number => minute * 60 * 1000;
