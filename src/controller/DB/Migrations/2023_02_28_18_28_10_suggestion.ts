import { Kysely, sql } from 'kysely';
import { GenerateSqlEnum } from '../index.js';

function suggestionHasIdColumn(db: Kysely<any>) {
	return db
		.selectFrom('information_schema.columns')
		.where('table_name', '=', 'suggestions')
		.where('column_name', '=', 'suggestion_id')
		.execute();
}

export async function up(db: Kysely<any>): Promise<void> {
	if ((await suggestionHasIdColumn(db)).length) {
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
}

export async function down(db: Kysely<any>): Promise<void> {}
