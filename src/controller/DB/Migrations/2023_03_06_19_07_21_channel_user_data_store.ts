import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('channel_data_store')
		.addColumn('channel', 'varchar', (col) =>
			col.notNull().references('channels.user_id').onUpdate('cascade').onDelete('cascade'),
		)
		.addColumn('key', 'text', (col) => col.notNull())
		.addColumn('value', 'text', (col) => col.notNull())
		.addColumn('last_edited', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
		.addUniqueConstraint('channel_key_unique', ['channel', 'key'])
		.execute();

	await db.schema
		.createTable('user_data_store')
		.addColumn('user', 'integer', (col) =>
			col.notNull().references('users.id').onUpdate('cascade').onDelete('cascade'),
		)
		.addColumn('key', 'text', (col) => col.notNull().primaryKey())
		.addColumn('value', 'text', (col) => col.notNull())
		.addColumn('last_edited', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('channel_data_store').execute();
	await db.schema.dropTable('user_data_store').execute();
}
