import { FastifyInstance } from 'fastify';
import AuthenticationValidator from './../../../Hooks/AuthenticationValidator.js';
import AssureHasChannel from './../../../Hooks/AssureHasChannel.js';
import {
	ChannelSettingsValue,
	GetSettings,
	UpdateSetting,
} from './../../../../controller/Channel/index.js';
import assert from 'assert';

interface BaseUpdateSetting {
	identifier: string;
}

interface UpdateSetting extends BaseUpdateSetting {
	identifier: 'pajbot';
	url: string;
}

export default async function (fastify: FastifyInstance) {
	// /**
	//  * @route GET /user/dashboard
	//  * @requires token - The user's JWT
	//  */
	// Router.get('/dashboard', async function (req, res) {
	// 	const { id, name } = res.locals.authUser;
	// 	const user = await Bot.User.Get(id, name);
	// 	const banphrases = await Bot.SQL.Query<Database.banphrases[]>`
	//         SELECT * FROM banphrases
	//         WHERE channel = ${user.TwitchUID}
	//     `;
	// 	const profilePicture = await user.GetProfilePicture();
	// 	const settings = await user.GetChannelSettings();
	// 	res.render('user/dashboard', {
	// 		user: {
	// 			...user,
	// 			profilePicture,
	// 			Options: settings,
	// 		},
	// 		banphrases,
	// 	});
	// });
	// Router.get('/logout', async (_, res) => {
	// 	const { id, name } = res.locals.authUser;
	// 	await Bot.Redis.SDel(`session:${id}:${name}`);
	// 	await Bot.Redis.SDel(`token:${id}:${name}`);
	// 	res.clearCookie('token', { path: '/' }).redirect('/');
	// });

	fastify.register(import('@fastify/formbody'), { bodyLimit: 1000000 });

	fastify.route<{ Body: BaseUpdateSetting }>({
		method: 'POST',
		url: '/update-setting',
		preParsing: AuthenticationValidator('REDIRECT'),
		preHandler: AssureHasChannel,
		preValidation: function (req, reply, done) {
			if ('identifier' in req.body) {
				done();

				return;
			}

			reply.redirect('/user/dashboard');
		},
		handler: async (req, reply) => {
			const { identifier, username } = req.authenticatedUser!;
			const user = await Bot.User.Get(identifier, username);

			const body = req.body;

			switch (body.identifier) {
				case 'pajbot': {
					function CleanURL(url: string): string {
						url = url.replace('/api/v1/banphrases', '');

						if (url.endsWith('/')) {
							url = url.slice(0, -1);
						}

						url = url.replace('https://', '').replace('http://', '');

						return url;
					}

					const { url } = body as UpdateSetting;
					assert(typeof url === 'string', 'url is not a string');
					await UpdateSetting(user, 'Pajbot1', new ChannelSettingsValue(CleanURL(url)));

					break;
				}
			}

			reply.redirect('/user/dashboard');
		},
	});

	fastify.route({
		method: 'GET',
		url: '/get-settings',
		preParsing: AuthenticationValidator('JSON'),
		preHandler: AssureHasChannel,
		handler: async (req, reply) => {
			const { identifier, username } = req.authenticatedUser!;
			const user = await Bot.User.Get(identifier, username);
			const settings = await GetSettings(user);

			reply.send([
				{
					identifier: 'pajbot',
					value: settings.Pajbot1.ToString(),
				},
			]);
		},
	});
}
