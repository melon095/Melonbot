/** Migrates the live annotation to channel KV store */

import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('channels').dropColumn('live').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('channels')
		.addColumn('live', 'boolean', (col) => col.notNull().defaultTo(false))
		.execute();
}
