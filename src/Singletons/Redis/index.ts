import { createClient, RedisClientType } from 'redis';
import type { IPubBase, IPing } from './Data.Types.js';
import { EventEmitter } from 'node:events';
import HandleEventsub from './EventSub/index.js';

const PREFIX = 'Melonbot:';
const CHANNELS = ['EventSub', 'banphrase', 'user-update'];

export class RedisSingleton extends EventEmitter {
	private static instance: RedisSingleton;

	public static Factory(address: string): RedisSingleton {
		if (!RedisSingleton.instance) {
			RedisSingleton.instance = new RedisSingleton(address);
		}

		return RedisSingleton.instance;
	}

	private _client: RedisClientType;
	private _pubsub!: RedisClientType;

	private constructor(private address: string) {
		super();

		this._client = createClient({
			url: address,
		});

		this._client.on('error', (err) => this.OnError(new Error(err)));
	}

	public async Connect(): Promise<void> {
		await this._client.connect();

		this._pubsub = this._client.duplicate();
		await this._pubsub.connect();

		if (process.env.TYPE === 'BOT') {
			CHANNELS.map((arg0) => this.Subscribe(arg0));
		}
	}

	private OnError(err: Error) {
		Bot.HandleErrors('Redis', err);
	}

	private _onSubMessage(Data: { Message: string; Channel: string }) {
		try {
			const parsed = JSON.parse(Data.Message) as IPubBase;
			if (typeof parsed.Data === 'string') {
				parsed.Data = JSON.parse(parsed.Data);
			}

			if (Data.Channel === 'EventSub') {
				if (!parsed.Type) {
					console.warn('No type provided for EventSub', parsed);
					return;
				}

				HandleEventsub(parsed.Type, parsed.Data);
				return;
			}

			if (typeof parsed.Type === 'undefined') {
				this.emit(Data.Channel, parsed.Data);
			} else {
				this.emit(parsed.Type, parsed.Data);
			}
		} catch (err) {
			this.OnError(err as Error);
		}
	}

	/* Give it a suggested channel name. */
	/* Will return <channel>:<id> */
	public async Subscribe(channel: string): Promise<string | undefined> {
		return new Promise((Resolve) => {
			this._pubsub
				.PSUBSCRIBE(`${PREFIX}${channel}`, (Message, Channel) =>
					this._onSubMessage({ Message, Channel: Channel.replace(PREFIX, '') }),
				)
				.then(() => {
					Resolve(`${PREFIX}${channel}`);
				})
				.catch(() => undefined);
		});
	}

	public async Publish(
		channel: string,
		opts: { Type?: string; Data: string | object },
	): Promise<void> {
		interface Send {
			Type?: string;
			Data: string;
		}

		const { Type, Data } = opts;

		const toSend: Send = {
			Data: typeof Data === 'string' ? Data : JSON.stringify(Data),
		};

		if (Type) {
			toSend['Type'] = Type;
		}

		await this._client.PUBLISH(`${PREFIX}${channel}`, JSON.stringify(toSend));
	}

	public async Exist(key: string): Promise<boolean> {
		return await this._client
			.EXISTS(key)
			.then((is) => Boolean(is))
			.catch(() => false);
	}

	public async SGet(key: string): Promise<string> {
		return await this._client
			.GET(`${PREFIX}${key}`)
			.then((value) => value || '')
			.catch(() => '');
	}

	public async SSet(key: string, value: string): Promise<(arg0: number) => Promise<void>> {
		await this._client.SET(`${PREFIX}${key}`, value);
		// Quick access to .Expire
		return async (time: number) => {
			await this.Expire(key, time);
		};
	}

	public async SDel(key: string): Promise<void> {
		await this._client.DEL(`${PREFIX}${key}`);
	}

	public async Expire(key: string, time: number): Promise<void> {
		await this._client.EXPIRE(`${PREFIX}${key}`, time);
	}

	public async PING(): Promise<IPing | undefined> {
		return await this._client
			.PING()
			.then((Pong: string) => {
				return {
					Pong,
				};
			})
			.catch(() => undefined);
	}

	/**
	 * True if added
	 * False if value already exists
	 */
	public async SetAdd(key: string, value: string[]): Promise<boolean> {
		return await this._client
			.SADD(`${PREFIX}${key}`, value)
			.then((ok: number | null) => Boolean(ok))
			.catch(() => false);
	}

	public async SetMembers(key: string): Promise<string[]> {
		return await this._client
			.SMEMBERS(`${PREFIX}${key}`)
			.then((members: string[]) => members)
			.catch(() => []);
	}

	public async SetRemove(key: string, value: string[]): Promise<boolean> {
		return await this._client
			.SREM(`${PREFIX}${key}`, value)
			.then((ok: number | null) => Boolean(ok))
			.catch(() => false);
	}

	public async HGetAll(key: string): Promise<{ [key: string]: string }> {
		return await this._client
			.HGETALL(`${PREFIX}${key}`)
			.then((members: { [key: string]: string }) => members)
			.catch(() => ({}));
	}

	public async HSet(key: string, field: string, value: string): Promise<boolean> {
		return await this._client
			.HSET(`${PREFIX}${key}`, field, value)
			.then((ok: number | null) => Boolean(ok))
			.catch(() => false);
	}

	public async HDel(key: string, field: string): Promise<boolean> {
		return await this._client
			.HDEL(`${PREFIX}${key}`, field)
			.then((ok: number | null) => Boolean(ok))
			.catch(() => false);
	}

	public async Keys(pattern: string): Promise<string[]> {
		return await this._client
			.KEYS(pattern)
			.then((keys: string[]) => keys)
			.catch(() => []);
	}
}
