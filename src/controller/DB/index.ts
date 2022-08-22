/* eslint-disable @typescript-eslint/ban-types */
import postgres from 'postgres';
import { exit } from 'node:process';
import { Database } from 'Typings/types.js';
import fs from 'node:fs';
import { resolve } from 'node:path';

interface ISQLResult<T> {
	Data: object[];
	SingleOrNull: () => null | T;
	ArrayOrNull: () => null | T[];
}

interface MigrationResult {
	OldVersion: number;
	NewVersion: number;
}

const createDefaultMigrationTable = async (db: SQLController) =>
	db.query(`
        CREATE TABLE IF NOT EXISTS Migration (
            version INTEGER NOT NULL,
            PRIMARY KEY (version)
        )
    `);

const getCurrentVersion = async (db: SQLController) =>
	await db
		.promisifyQuery<Database.migration>(
			`
            SELECT version FROM Migration
            ORDER BY version DESC
            LIMIT 1
        `,
		)
		.then(async (rows) => {
			const res = rows.SingleOrNull();
			if (res === null) {
				await createDefaultMigrationTable(db);
				db.query(`
                    INSERT INTO Migration (version) VALUES (0)
                `);
				return 0;
			}
			return res.version;
		})
		.catch((err) => {
			throw new Error(err);
		});

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

	private Conn!: postgres.Sql<{}>;
	private Open!: boolean;

	public async New(): Promise<SQLController> {
		if (!SQLController.instance) {
			const c = new SQLController();
			await c.IsOpen();
			SQLController.instance = c;
		}
		return SQLController.instance;
	}

	private getAddress(): string {
		return Bot.Config.SQL.Address;
	}

	private constructor() {
		this.createConnection(this.getAddress()).then(() => (this.Open = true));
	}

	async SetDatabase(): Promise<void> {
		await this.Conn`USE melonbot`;
	}

	public async IsOpen(): Promise<boolean> {
		return await this.Conn`SELECT 1`.then(() => true).catch(() => false);
	}

	private async createConnection(
		address: string,
		opts: postgres.Options<{}> = {},
	): Promise<void> {
		this.Conn = postgres(address, opts);
		this.Conn.notify;
	}

	async promisifyQuery<T>(
		query: string,
		data: unknown[] = [],
	): Promise<SQLResult<T>> {
        await this.connect();
        return await 
        
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

	async Transaction(query: string): Promise<void> {
		return await this.Conn.beginTransaction()
			.then(() => {
				return this.Conn.query(query);
			})
			.then(() => {
				return this.Conn.commit();
			})
			.catch((err) => {
				this.Conn.rollback();
				throw err;
			});
	}

	async RunMigration(): Promise<MigrationResult> {
		await createDefaultMigrationTable(this);
		const currentVersion = await getCurrentVersion(this);
		let newVersion = currentVersion;

		const migrationsToRun: [number, string][] = fs
			.readdirSync(resolve(process.cwd(), 'Migrations'), {
				withFileTypes: true,
			})
			.map((file) => {
				if (file.isFile()) return file.name;
				return;
			})
			.filter(Boolean)
			.map((file) => {
				// Don't think this can happen..
				if (!file) return [0, ''] as [number, string];
				// 2_fix_join.sql --> [2, 'fix_join.sql']
				const [version, name] = file.split(/_(.*)/s).filter(Boolean);
				return [Number(version), name] as [number, string];
			})
			.filter(([fileVersion]) => fileVersion > currentVersion);

		for (const [version, name] of migrationsToRun) {
			const migrationPath = resolve(
				process.cwd(),
				'Migrations',
				`${version}_${name}`,
			);

			const data = fs
				.readFileSync(migrationPath, 'utf8')
				.split(';')
				.map((query) => query.trim())
				.filter(Boolean);

			console.debug(`Running migration ${version}_${name}`);

			for (const query of data) {
				await this.Transaction(query).catch((err) => {
					console.error(
						`Error running migration ${version}_${name}: ${err}`,
					);
					process.exit(1);
				});
			}

			await this.query('UPDATE Migration SET version = ?', [version]);

			newVersion = version;
		}

		return {
			NewVersion: newVersion,
			OldVersion: currentVersion,
		};
	}
}
