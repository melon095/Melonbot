import { createClient, RedisClientType } from 'redis';
import { IPing, IPubBase, IPubConnect, IPubModAdd, TPubRecType } from './Data.Types.js';
import { EventEmitter } from 'node:events';
import { RedisEvents } from './Redis.Events';

const INTERNAL_LOAD_ID = 'Melonbot:';

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
		Promise.resolve();
	}

	private OnError(err: Error) {
		Bot.HandleErrors('Redis', err);
	}

	private _emit<T>(type: TPubRecType, data: T) {
		this.emit(type, data as T);
	}

	private _onSubMessage(Data: { Message: string; Channel: string }) {
		try {
			const parsed = JSON.parse(Data.Message) as IPubBase;
			if (typeof parsed.Data === 'string') {
				parsed.Data = JSON.parse(parsed.Data);
			}

			if (!('Type' in parsed)) {
				throw new Error(`Unknown type from channel: ${Data.Channel}`);
			}

			this._emit(parsed.Type, parsed.Data);
		} catch (err) {
			this.OnError(err as Error);
		}
	}

	/* Give it a suggested channel name. */
	/* Will return <channel>:<id> */
	public async Subscribe(channel: string): Promise<string | undefined> {
		return new Promise((Resolve) => {
			this._pubsub
				.PSUBSCRIBE(`${INTERNAL_LOAD_ID}${channel}`, (Message, Channel) =>
					this._onSubMessage({ Message, Channel }),
				)
				.then(() => {
					Resolve(`${INTERNAL_LOAD_ID}${channel}`);
				})
				.catch(() => undefined);
		});
	}

	public async Publish(
		channel: string,
		type: keyof RedisEvents,
		data: string | object,
	): Promise<void> {
		const toSend = {
			Type: type,
			Data: '',
		};
		if (typeof data === 'string') {
			toSend.Data = data;
		} else if (typeof data === 'object') {
			toSend.Data = JSON.stringify(data);
		} else {
			throw new Error('Unknown data type');
		}

		await this._client.PUBLISH(`${INTERNAL_LOAD_ID}${channel}`, JSON.stringify(toSend));
	}

	public async Exist(key: string): Promise<boolean> {
		return await this._client
			.EXISTS(key)
			.then((is) => Boolean(is))
			.catch(() => false);
	}

	public async SGet(key: string): Promise<string> {
		return await this._client
			.GET(`${INTERNAL_LOAD_ID}${key}`)
			.then((value) => value || '')
			.catch(() => '');
	}

	public async SSet(key: string, value: string): Promise<(arg0: number) => Promise<void>> {
		await this._client.SET(`${INTERNAL_LOAD_ID}${key}`, value);
		// Quick access to .Expire
		return async (time: number) => {
			await this.Expire(key, time);
		};
	}

	public async SDel(key: string): Promise<void> {
		await this._client.DEL(`${INTERNAL_LOAD_ID}${key}`);
	}

	public async Expire(key: string, time: number): Promise<void> {
		await this._client.EXPIRE(`${INTERNAL_LOAD_ID}${key}`, time);
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
			.SADD(`${INTERNAL_LOAD_ID}${key}`, value)
			.then((ok: number | null) => Boolean(ok))
			.catch(() => false);
	}

	public async SetMembers(key: string): Promise<string[]> {
		return await this._client
			.SMEMBERS(`${INTERNAL_LOAD_ID}${key}`)
			.then((members: string[]) => members)
			.catch(() => []);
	}

	public async SetRemove(key: string, value: string[]): Promise<boolean> {
		return await this._client
			.SREM(`${INTERNAL_LOAD_ID}${key}`, value)
			.then((ok: number | null) => Boolean(ok))
			.catch(() => false);
	}
}
