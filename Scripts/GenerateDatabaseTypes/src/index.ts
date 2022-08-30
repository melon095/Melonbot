import type Config from 'kanel/build/Config';
import type { SchemaConfig } from 'kanel';

const schemas: SchemaConfig[] = [
	{
		name: 'bot',
		modelFolder: './models/bot',
	},
	{
		name: 'logs',
		modelFolder: './models/logs',
	},
	/// Doesn't have anything yet.
	// {
	// 	name: 'web',
	// 	modelFolder: './models/web',
	// },
];

void (async () => {
	const dotenv = await import('dotenv');
	dotenv.config();

	const connectionString = process.env.DATABASE_URL;

	const kanel = await (await import('kanel')).default;
	const config: Config = {
		connection: {
			connectionString,
		},
		preDeleteModelFolder: true,
		customTypeMap: {
			tsvector: 'string',
			bpchar: 'string',
		},
		schemas,
	};

	await kanel
		.processDatabase(config)
		.then(() => console.log({ success: true }))
		.catch((error) => console.error({ success: false, error }));

	process.exit(0);
})();
