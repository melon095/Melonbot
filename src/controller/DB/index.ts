/* eslint-disable @typescript-eslint/ban-types */
import postgres from 'postgres';
import { Database } from 'Typings/types.js';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { Import } from './../../tools/tools.js';

interface MigrationResult {
	OldVersion: number;
	NewVersion: number;
}

const createDefaultMigrationTable = async (db: SQLController) => {
	await db.Query`CREATE SCHEMA IF NOT EXISTS bot`;
	await db.Query`ALTER DATABASE melonbot RESET search_path`;
	await db.Query`ALTER DATABASE melonbot SET search_path TO 'bot'`;
	await db.Query`
        CREATE TABLE IF NOT EXISTS migration (
            version INTEGER NOT NULL,
            PRIMARY KEY (version)
        )
    `;
};

const getCurrentVersion = async (db: SQLController) =>
	await db.Query<Database.migration[]>`
            SELECT version FROM migration
            ORDER BY version DESC
            LIMIT 1
        `.then(async ([row]) => {
		if (row === undefined) {
			await createDefaultMigrationTable(db);
			await db.Query`INSERT INTO migration (version) VALUES (0)`;
			return 0;
		}
		return row.version;
	});

const defaultOpts: postgres.Options<{}> = {
	// Shush
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	onnotice: () => {},
};

export class SQLController {
	private static instance: SQLController;

	private Conn!: postgres.Sql<{}>;

	public static New(): SQLController {
		if (!SQLController.instance) {
			SQLController.instance = new SQLController();
		}
		return SQLController.instance;
	}

	private getAddress(): string {
		return Bot.Config.SQL.Address;
	}

	private constructor(opts: postgres.Options<{}> = defaultOpts) {
		this.Conn = postgres(this.getAddress(), opts);
	}

	public get Get(): postgres.Sql<{}> {
		return this.Conn;
	}

	get Query() {
		return this.Conn;
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
			console.debug(`Running migration ${version}_${name}`);

			await this.Conn.begin(async (sql) => {
				await sql.file(resolve(process.cwd(), 'Migrations', `${version}_${name}`));
			}).catch((error) => {
				console.error(`Error running migration ${version}_${name}: ${error}`);
				process.exit(1);
			});

			await this.Query`UPDATE migration SET version = ${version}`;

			newVersion = version;
		}

		return {
			NewVersion: newVersion,
			OldVersion: currentVersion,
		};
	}
}
