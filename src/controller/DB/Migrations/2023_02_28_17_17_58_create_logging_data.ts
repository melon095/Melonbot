import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.withSchema('logs')
		.createTable('commands_execution')
		.addColumn('id', 'serial', (col) => col.notNull().primaryKey())
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
		.addColumn('id', 'serial', (col) => col.notNull().primaryKey())
		.addColumn('method', 'varchar', (col) => col.notNull())
		.addColumn('endpoint', 'text', (col) => col.notNull())
		.addColumn('request_ip', 'varchar', (col) => col.notNull())
		.addColumn('headers', 'text')
		.addColumn('query', 'text')
		.addColumn('body', 'text')
		.addColumn('timestamp', 'timestamp', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
		)
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {}
