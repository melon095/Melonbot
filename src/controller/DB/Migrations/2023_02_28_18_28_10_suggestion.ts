import { Kysely, sql } from 'kysely';
import { GenerateSqlEnum } from '..';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('suggestions')
		.dropColumn('suggestion_id')
		.addColumn('id', 'uuid', (col) =>
			col
				.notNull()
				.primaryKey()
				.defaultTo(sql`uuid_generate_v4()`),
		)
		.dropColumn('request_username')
		.addColumn('user_id', 'varchar', (col) => col.notNull().references('users.user_id'))
		.addColumn('state', sql`${GenerateSqlEnum('pending', 'finished', 'denied')}`, (col) =>
			col.notNull().defaultTo('pending'),
		)
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {}
