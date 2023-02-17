import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
	async function GetTotalUsers() {
		const count = await Bot.SQL.Query`
            SELECT COUNT(*) AS count FROM users
        `;

		return count[0].count;
	}

	async function GetJoinedChannelCount() {
		const count = await Bot.SQL.Query`
            SELECT COUNT(*) AS count FROM channels
        `;

		return count[0].count;
	}

	// TODO: Not implemented yet.
	async function GetCustomCommandsCount() {
		return 0;
	}

	async function GetTotalHandledCommands() {
		const sum = await Bot.SQL.Query`SELECT SUM(commands_handled) FROM stats`;

		return sum[0].sum;
	}

	fastify.route({
		method: 'GET',
		url: '/',
		handler: async () => {
			try {
				return [
					{
						name: 'Total Users',
						value: await GetTotalUsers(),
					},
					{
						name: 'Joined Channels',
						value: await GetJoinedChannelCount(),
					},
					{
						name: 'Custom Commands',
						value: await GetCustomCommandsCount(),
					},
					{
						name: 'Total Handled Commands',
						value: await GetTotalHandledCommands(),
					},
				];
			} catch (err) {
				Bot.Log.Error(err as Error);

				return [];
			}
		},
	});
}
