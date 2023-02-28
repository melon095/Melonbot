/*
    Converts the older migration files into Kysely migrations
*/
import { Kysely, sql } from 'kysely';
import { GenerateSqlEnum } from '../index.js';

export async function up(db: Kysely<any>): Promise<void> {
	await sql`
        CREATE FUNCITON bot.on_update_current_timestamp_error_logs() RETURNS trigger
            LANGUAGE plpgsql
                AS $$
            BEGIN
                NEW.timestamp = now();
                RETURN NEW;
            END;
            $$;
    `.execute(db);

	await db.schema
		.createTable('channels')
		.addColumn('name', 'text', (col) => col.notNull().primaryKey().unique())
		.addColumn('user_id', 'varchar', (col) => col.notNull().unique())
		.addColumn('live', 'boolean', (col) => col.notNull().defaultTo(false))
		.addColumn('bot_permission', 'bigint', (col) => col.notNull().defaultTo(1))
		.execute();

	await db.schema
		.createTable('commands')
		.addColumn('id', 'bigint', (col) => col.notNull().primaryKey().autoIncrement())
		.addColumn('name', 'text', (col) => col.notNull().unique())
		.addColumn('description', 'text', (col) => col.notNull())
		.addColumn('perm', 'integer', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('error_logs')
		.addColumn('error_id', 'bigint', (col) => col.notNull().primaryKey().autoIncrement())
		.addColumn('error_message', 'text', (col) => col.notNull())
		.addColumn('timestamp', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`));

	await db.schema
		.createTable('stats')
		.addColumn('name', 'text', (col) => col.notNull().references('channels.name'))
		.addColumn('commands_handled', 'bigint', (col) => col.notNull().defaultTo(0))
		.execute();

	await db.schema
		.createTable('users')
		.addColumn('id', 'integer', (col) => col.notNull().primaryKey().autoIncrement())
		.addColumn('name', 'text', (col) => col.notNull())
		.addColumn('twitch_uid', 'varchar', (col) => col.notNull().unique())
		.addColumn('first_seen', 'timestamp', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
		)
		.addColumn('role', GenerateSqlEnum('user', 'moderator', 'admin'), (col) =>
			col.notNull().defaultTo('user'),
		)
		.execute();

	await db.schema
		.createTable('suggestions')
		.addColumn('id', 'uuid', (col) =>
			col
				.notNull()
				.primaryKey()
				.defaultTo(sql`uuid_generate_v4()`),
		)
		.addColumn('suggestion', 'text', (col) => col.notNull())
		.addColumn('user_id', 'varchar', (col) => col.notNull().references('users.user_id'))
		.execute();

	await db.schema
		.createTable('timers')
		.addColumn('uuid', 'uuid', (col) =>
			col
				.notNull()
				.primaryKey()
				.defaultTo(sql`uuid_generate_v4()`),
		)
		.addColumn('owner', 'varchar', (col) =>
			col.notNull().references('channels.user_id').onDelete('cascade').onUpdate('cascade'),
		)
		.addColumn('name', 'text', (col) => col.notNull())
		.addColumn('interval', 'int2', (col) => col.notNull())
		.addColumn('message', 'text', (col) => col.notNull())
		.addColumn('enabled', 'boolean', (col) => col.notNull().defaultTo(true))
		.addColumn('titles', sql`text[]`, (col) => col.notNull().defaultTo('{}'))
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {}
