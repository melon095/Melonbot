import { promises as fs } from 'node:fs';
import { Pool } from 'pg';
import * as path from 'node:path';
import {
	Kysely,
	PostgresDialect,
	Generated,
	ColumnType,
	Selectable,
	Insertable,
	Updateable,
	Migrator,
	FileMigrationProvider,
	sql,
} from 'kysely';
import { getDirname } from './../../tools/tools.js';

interface Database {}

export default function (): Kysely<Database> {
	const db = new Kysely<Database>({
		dialect: new PostgresDialect({
			pool: new Pool({
				connectionString: Bot.Config.SQL.Address,
			}),
		}),
	});

	return db;
}

export async function DoMigration(db: Kysely<Database>): Promise<void> {
	const migrator = new Migrator({
		db,
		provider: new FileMigrationProvider({
			fs,
			path,
			migrationFolder: getDirname(import.meta.url) + '/Migrations',
		}),
	});

	const { error, results } = await migrator.migrateToLatest();

	if (error) {
		Bot.Log.Error('Failed to run migration: %o', error);

		process.exit(1);
	}

	if (results === undefined || results?.length === 0) {
		Bot.Log.Info('No migrations to run');

		return;
	}

	for (const result of results) {
		switch (result.status) {
			case 'Success': {
				Bot.Log.Info('Migration %s was successful', result.migrationName);
				break;
			}
			case 'Error': {
				// Documentation specify result.error will contain the error message, if the result.status is of Error. So unsure...
				const { error } = result as unknown as { error: string };

				Bot.Log.Error(
					'Migration %s failed with error: %o',
					result.migrationName,
					error ?? 'Unknown error',
				);
				break;
			}
			case 'NotExecuted': {
				Bot.Log.Warn('Migration %s was not executed', result.migrationName);
				break;
			}
		}
	}

	Bot.Log.Info('Migration complete');
}

// https://github.com/koskimas/kysely/issues/112#issuecomment-1177546703
export function GenerateSqlEnum(...args: string[]) {
	return sql`enum(${sql.join(args.map(sql.literal))})`;
}

// import postgres from 'postgres';
// import fs from 'node:fs';
// import { resolve } from 'node:path';

// interface MigrationResult {
// 	OldVersion: number;
// 	NewVersion: number;
// }

// const createDefaultMigrationTable = async (db: SQLController) => {
// 	await db.Query`CREATE SCHEMA IF NOT EXISTS bot`;
// 	await db.Query`ALTER DATABASE melonbot RESET search_path`;
// 	await db.Query`ALTER DATABASE melonbot SET search_path TO 'bot'`;
// 	await db.Query`
//         CREATE TABLE IF NOT EXISTS migration (
//             version INTEGER NOT NULL,
//             PRIMARY KEY (version)
//         )
//     `;
// };

// const getCurrentVersion = async (db: SQLController) =>
// 	await db.Query<Database.migration[]>`
//             SELECT version FROM migration
//             ORDER BY version DESC
//             LIMIT 1
//         `.then(async ([row]) => {
// 		if (row === undefined) {
// 			await createDefaultMigrationTable(db);
// 			await db.Query`INSERT INTO migration (version) VALUES (0)`;
// 			return 0;
// 		}
// 		return row.version;
// 	});

// const defaultOpts: postgres.Options<{}> = {
// 	// Shush
// 	// eslint-disable-next-line @typescript-eslint/no-empty-function
// 	onnotice: () => {},
// };

// export class SQLController {
// 	private static instance: SQLController;

// 	private Conn!: postgres.Sql<{}>;

// 	public static New(): SQLController {
// 		if (!SQLController.instance) {
// 			SQLController.instance = new SQLController();
// 		}
// 		return SQLController.instance;
// 	}

// 	private getAddress(): string {
// 		return Bot.Config.SQL.Address;
// 	}

// 	private constructor(opts: postgres.Options<{}> = defaultOpts) {
// 		this.Conn = postgres(this.getAddress(), opts);
// 	}

// 	public get Get(): postgres.Sql<{}> {
// 		return this.Conn;
// 	}

// 	get Query() {
// 		return this.Conn;
// 	}

// 	get Transaction() {
// 		return this.Conn.begin;
// 	}

// 	async RunMigration(): Promise<MigrationResult> {
// 		await createDefaultMigrationTable(this);
// 		const currentVersion = await getCurrentVersion(this);
// 		let newVersion = currentVersion;

// 		const migrationsToRun: [number, string][] = fs
// 			.readdirSync(resolve(process.cwd(), 'Migrations'), {
// 				withFileTypes: true,
// 			})
// 			.map((file) => {
// 				if (file.isFile()) return file.name;
// 				return;
// 			})
// 			.filter(Boolean)
// 			.map((file) => {
// 				// Don't think this can happen..
// 				if (!file) return [0, ''] as [number, string];
// 				// 2_fix_join.sql --> [2, 'fix_join.sql']
// 				const [version, name] = file.split(/_(.*)/s).filter(Boolean);
// 				return [Number(version), name] as [number, string];
// 			})
// 			.filter(([fileVersion]) => fileVersion > currentVersion);

// 		for (const [version, name] of migrationsToRun) {
// 			Bot.Log.Info('Running migration %d_%s', version, name);

// 			await this.Conn.begin(async (sql) => {
// 				await sql.file(resolve(process.cwd(), 'Migrations', `${version}_${name}`));
// 			}).catch((error) => {
// 				Bot.Log.Error(`Error running migration %d_%s %O`, version, name, { error });
// 				process.exit(1);
// 			});

// 			await this.Query`UPDATE migration SET version = ${version}`;

// 			newVersion = version;
// 		}

// 		return {
// 			NewVersion: newVersion,
// 			OldVersion: currentVersion,
// 		};
// 	}
// }
