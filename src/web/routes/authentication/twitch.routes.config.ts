import { CommonRoutesConfig } from '../common.routes.config.js';
import express from 'express';
import { Database } from '../../../Typings/types';
import axios from 'axios';

const TWITCH_USER_TOKEN = (code: string) =>
	`https://id.twitch.tv/oauth2/token` +
	`?client_id=${Bot.Config.Twitch.ClientID}` +
	`&client_secret=${Bot.Config.Twitch.ClientSecret}` +
	`&code=${code}` +
	`&grant_type=authorization_code` +
	`&redirect_uri=${Bot.Config.Website.WebUrl + '/login/twitch/code'}`;

export class TwitchRoutes extends CommonRoutesConfig {
	constructor(app: express.Application) {
		super(app, 'TwitchRoutes');
	}

	configureRoutes() {
		// After user logs in to bot they get redirected here.
		this.app
			.route('/login/twitch/code')
			.get(async function (req: express.Request, res: express.Response) {
				let logger = '';
				const code = req.query.code as string;
				// Ask twitch to authenticate our code and get the actual token we can use, with refresh token
				try {
					if (typeof req.query.error !== 'undefined') {
						logger += ` ${req.path} - ${req.query.error}`;
						return res.status(500).json({ error: '500' });
					}

					// [TODO]: Create types
					const authorize: any = await axios
						.post(TWITCH_USER_TOKEN(code), {
							method: 'POST',
							headers: {
								Accept: 'application/json',
							},
						})
						.then((res) => res.data)
						.then((data) => JSON.parse(data));

					// Get some more info about the user, like user id and login name.
					const user: any = await axios
						.get('https://api.twitch.tv/helix/users', {
							method: 'GET',
							headers: {
								Authorization: `Bearer ${authorize.access_token}`,
								'Client-Id': Bot.Config.Twitch.ClientID,
							},
						})
						.then((res) => res.data)
						.then((data) => JSON.parse(data));

					const userInfo = {
						id: user.data[0].id,
						access_token: authorize.access_token,
						login_name: user.data[0].login,
						refresh_token: authorize.refresh_token,
						scope: authorize.scope.join(' '),
					};

					const token = (
						await Bot.SQL.promisifyQuery<Database.tokens>(
							'SELECT * FROM tokens WHERE id = ?',
							[userInfo.id],
						)
					).SingleOrNull();

					if (token !== null) {
						// Delete old token if the user decides to login again.
						Bot.SQL.query('DELETE FROM tokens WHERE id = ?;', [
							userInfo.id,
						]);
					}

					Bot.SQL.query(
						`INSERT INTO tokens 
                                            (id, access_token, 
                                            name, refresh_token, scope)
                                            VALUES (?,?,?,?,?
                                            );`,
						[
							userInfo.id,
							userInfo.access_token,
							userInfo.login_name,
							userInfo.refresh_token,
							userInfo.scope,
						],
					);

					(logger += `User_id: ${userInfo.id} - ${userInfo.login_name} added to database`),
						res.redirect(`bot/login?loggedIn=true`);
					res.end();
					return;
				} catch (error) {
					Bot.HandleErrors(
						'Web/Twitch/Login',
						new Error(JSON.stringify(error)),
					);
					res.status(500).json({ error: '500' });
					res.end();
					return;
				}
			});
		return this.app;
	}
}
