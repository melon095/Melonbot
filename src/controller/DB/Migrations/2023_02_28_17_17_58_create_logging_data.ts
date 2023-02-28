import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.withSchema('logs')
		.createTable('commands_execution')
		.addColumn('id', 'integer', (col) => col.notNull().primaryKey().autoIncrement())
		.addColumn('user_id', 'varchar', (col) => col.notNull())
		.addColumn('username', 'varchar', (col) => col.notNull())
		.addColumn('success', 'boolean', (col) => col.notNull())
		.addColumn('command', 'text', (col) => col.notNull())
		.addColumn('args', sql`text[]`, (col) => col.notNull())
		.addColumn('result', 'text', (col) => col.notNull())
		.addColumn('channel', 'varchar', (col) => col.notNull())
		.execute();

	await db.schema
		.withSchema('logs')
		.createTable('web_request')
		.addColumn('id', 'integer', (col) => col.notNull().primaryKey().autoIncrement())
		.addColumn('method', 'varchar', (col) => col.notNull())
		.addColumn('endpoint', 'text', (col) => col.notNull())
		.addColumn('request_ip', 'varchar', (col) => col.notNull())
		.addColumn('headers', 'text', (col) => col.notNull())
		.addColumn('query', 'text', (col) => col.notNull())
		.addColumn('body', 'text', (col) => col.notNull())
		.addColumn('timestamp', 'timestamp', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
		)
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {}
