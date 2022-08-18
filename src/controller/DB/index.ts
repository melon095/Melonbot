import mysql from 'mysql2/promise';
import { exit } from 'node:process';
import { Sleep } from './../../tools/tools.js';

interface ISQLResult<T> {
	Data: object[];
	SingleOrNull: () => null | T;
	ArrayOrNull: () => null | T[];
}

class SQLResult<T> implements ISQLResult<T> {
	Data: object[];

	constructor(d: object[]) {
		this.Data = d;
	}

	public SingleOrNull(): null | T {
		switch (this.Data.length) {
			case 0:
				return null;
			case 1:
				return this.Data[0] as unknown as T;
			default:
				// TODO: Should not do this?
				throw new Error(
					`SQL Data length is more than 1... Found length of: ${this.Data.length}`,
				);
		}
	}

	public ArrayOrNull(): null | T[] {
		if (this.Data.length === 0) return null;
		return this.Data as unknown as T[];
	}
}

export class SQLController {
	private static instance: SQLController;

	private Conn!: mysql.Connection;
	private Open!: boolean;

	private constructor() {
		this.CreateConnection(true).then(() => (this.Open = true));
	}

	public static async getInstanceAsync(): Promise<SQLController> {
		if (!SQLController.instance) {
			SQLController.instance = new SQLController();
		}
		while (!SQLController.instance.Open) {
			await Sleep(1);
		}
		return SQLController.instance;
	}

	setDatabase(): void {
		this.Conn.changeUser({
			database: 'twitch',
		});
	}

	private isAlive(): boolean {
		try {
			this.Conn.ping();
		} catch (e) {
			return false;
		}
		return true;
	}

	private async CreateConnection(initial = false): Promise<void> {
		if (!initial) {
			if (this.isAlive()) return;
		}

		this.Conn = await mysql
			.createConnection({
				host: Bot.Config.SQL.Host,
				user: Bot.Config.SQL.User,
				password: Bot.Config.SQL.Password,
			})
			.catch((error) => {
				console.error('MARIADB | Error connecting: ', error);
				process.exit(1);
			});
		this.Conn.on('close', async () => {
			console.log(
				'MYSQL2 Closed the connecting, catched and reconnecting!',
			);
			this.Open = false;
			this.Open = await this.connect();
		});
		this.Conn.on('error', async (e: mysql.QueryError) => {
			Bot.HandleErrors('SQL', e);
			this.Open = false;
			this.Open = await this.connect();
		});
		Promise.resolve();
	}

	private asyncRun(query: string): Promise<object[]> {
		return new Promise((Resolve, Reject) => {
			this.Conn.query(query)
				.then((result) => {
					const [rows, _] = result;
					Resolve(rows as object[]);
				})
				.catch((reason) => {
					return Reject(reason);
				});
		});
	}

	/**
	 * @description Use this for queries which requests data.
	 */
	async promisifyQuery<T>(
		query: string,
		data: unknown[] = [],
	): Promise<SQLResult<T>> {
		return new Promise((Resolve, Reject) => {
			this.connect().then(() => {
				this.asyncRun(mysql.format(query, data))
					.then((result) => {
						return Resolve(new SQLResult<T>(result));
					})
					.catch((reason) => {
						Bot.HandleErrors('SQL', new Error(reason));
						return Reject();
					});
			});
		});
	}

	/**
	 * @description Use this for queries which update, remove or add data and doesnt request anything back.
	 */
	query(query: string, data: unknown[] = []): void {
		this.connect().then(async () => {
			try {
				await this.asyncRun(mysql.format(query, data));
			} catch (e) {
				Bot.HandleErrors('SQL', new Error(e as never));
				throw null;
			}
		});
	}

	private connect(): Promise<boolean> {
		return new Promise((Resolve) => {
			if (this.Open) {
				Resolve(true);
			} else {
				this.Conn.connect()
					.then(() => {
						Resolve(true);
					})
					.catch((reason) => {
						Bot.HandleErrors('SQL', new Error(reason));
						process.exitCode = -1;
						exit();
					});
			}
		});
	}
}
