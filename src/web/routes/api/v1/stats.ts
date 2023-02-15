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
				];
			} catch (err) {
				Bot.Log.Error(err as Error);

				return [];
			}
		},
	});
}
