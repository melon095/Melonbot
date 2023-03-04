import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
	function GetTotalUsers() {
		return Bot.SQL.selectFrom('users')
			.select((eq) => eq.fn.count('id').as('count'))
			.executeTakeFirst()
			.then((c) => c?.count || 0);
	}

	function GetJoinedChannelCount() {
		return Bot.SQL.selectFrom('channels')
			.select((eq) => eq.fn.count('user_id').as('count'))
			.executeTakeFirst()
			.then((c) => c?.count || 0);
	}

	// TODO: Not implemented yet.
	async function GetCustomCommandsCount() {
		return 0;
	}

	function GetTotalHandledCommands() {
		return Bot.SQL.selectFrom('stats')
			.select((eq) => eq.fn.sum('commands_handled').as('sum'))
			.executeTakeFirst()
			.then((c) => c?.sum || 0);
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
