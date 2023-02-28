import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
	async function GetTotalUsers() {
		return Bot.SQL.selectFrom('users')
			.select((eq) => eq.fn.count('id').as('count'))
			.execute();
	}

	async function GetJoinedChannelCount() {
		return Bot.SQL.selectFrom('channels')
			.select((eq) => eq.fn.count('user_id').as('count'))
			.execute();
	}

	// TODO: Not implemented yet.
	async function GetCustomCommandsCount() {
		return 0;
	}

	async function GetTotalHandledCommands() {
		return Bot.SQL.selectFrom('stats')
			.select((eq) => eq.fn.sum('commands_handled').as('sum'))
			.execute();
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
