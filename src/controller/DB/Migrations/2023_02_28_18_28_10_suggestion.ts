import { Kysely, sql } from 'kysely';

function suggestionHasIdColumn(db: Kysely<any>) {
	return db
		.selectFrom('information_schema.columns')
		.where('table_name', '=', 'suggestions')
		.where('column_name', '=', 'suggestion_id')
		.execute();
}

export async function up(db: Kysely<any>): Promise<void> {
	try {
		if ((await suggestionHasIdColumn(db)).length) {
			await db.schema.dropTable('suggestions').execute();
		}
	} catch {
		/* ... */
	}

	await sql`
        CREATE TYPE suggestion_state AS ENUM ('pending', 'finished', 'denied');
    `.execute(db);

	await db.schema
		.createTable('suggestions')
		.addColumn('id', 'uuid', (col) =>
			col
				.notNull()
				.primaryKey()
				.defaultTo(sql`uuid_generate_v4()`),
		)
		.addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
		.addColumn('state', sql`suggestion_state`, (col) => col.notNull().defaultTo('pending'))
		.addColumn('suggestion', 'text', (col) => col.notNull())
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {}
