import Got from './../tools/Got.js';
import type Express from 'express';

export enum AuthenticationMethod {
	'Query' = 'query',
	'Header' = 'header',
}

export type CookieOpts = {
	name: string;
	value: string;
} & Express.CookieOptions;

export type BasicOauthResponse = {
	access_token: string;
	token_type: string;
	scope: string;
	expires_in: number;
};

export type BaseStrategyOpts = {
	name: string;
	redirectURL: string;
	tokenURL: string;
	scopes?: string[];
	cookie?: CookieOpts;
	authenticationMethod: AuthenticationMethod;
};

export interface QueryStrategyOpts extends BaseStrategyOpts {
	authenticationMethod: AuthenticationMethod.Query;
	clientID: string;
	clientSecret: string;
}

export interface HeaderStrategyOpts extends BaseStrategyOpts {
	authenticationMethod: AuthenticationMethod.Header;
	headers: Record<string, string>;
}

type StrategyCallback = (
	accessToken: string,
	refreshToken: string,
	expires_in: number,
	profile: any | undefined,
	authUser: { id: string; name: string } | undefined,
	done: (arg0: Error | string | null, opts?: { cookie?: CookieOpts }) => void,
) => void;

type StrategyGetUserProfile = (
	accessToken: string,
	authUser?: { id: string; name: string },
) => Promise<any>;

type StrategyOpts = QueryStrategyOpts | HeaderStrategyOpts;

class Strategy {
	constructor(
		private opts: StrategyOpts,
		private callback: StrategyCallback,
		private userProfile?: StrategyGetUserProfile,
	) {}

	async authenticate(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
		const { code, error, error_description } = req.query;

		if (error || !code) {
			Bot.HandleErrors(this.opts.name, { error, error_description });
			res.render('error', {
				safeError: 'There was an error logging you in try again later.',
			});
			return;
		}

		const opts = Object.assign(this.opts, { code: code as string });
		const second = await HandleSecondStep({
			...opts,
		});

		let profile = undefined;
		const authUser = res.locals?.authUser;
		if (this.userProfile) {
			try {
				profile = await this.userProfile(second.access_token, authUser || undefined);
			} catch (error) {
				res.render('error', {
					safeError: error,
				});
				return;
			}
		}

		this.callback(
			second.access_token,
			second.refresh_token,
			second.expires_in,
			profile,
			authUser || undefined,
			(err, opts) => {
				if (err) {
					res.render('error', {
						safeError: err,
					});
					return;
				}

				if (opts?.cookie) {
					const { name, value, httpOnly, maxAge, path } = opts.cookie;
					res.cookie(name, value, {
						httpOnly: httpOnly || true,
						maxAge: maxAge || 1000 * 60 * 60 * 24 * 30,
						path: path || '/',
					});
				}

				next();
			},
		);
	}

	async RefreshToken(refresh_token: string): Promise<Omit<BasicOauthResponse, 'refresh_token'>> {
		const { tokenURL } = this.opts;

		const searchParams = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token,
		});

		const json = await Got('json')
			.post(tokenURL, {
				searchParams,
				throwHttpErrors: true,
			})
			.json();

		return json as Omit<BasicOauthResponse, 'refresh_token'>;
	}
}

type AuthorizationResponse = {
	access_token: string;
	expires_in: number;
	refresh_token: string;
	scope: string[];
	token_type: string;
};

type SecondStepOpts = StrategyOpts & {
	code: string;
};

const HandleSecondStep = async (opts: SecondStepOpts) => {
	const params = new URLSearchParams();
	const headers = {};
	const { authenticationMethod, tokenURL } = opts;

	if (authenticationMethod === AuthenticationMethod.Query) {
		params.append('client_id', opts.clientID);
		params.append('client_secret', opts.clientSecret);
	} else if (authenticationMethod === AuthenticationMethod.Header) {
		Object.assign(headers, opts.headers);
	} else {
		throw new Error('Invalid authentication method.');
	}

	params.append('code', opts.code);
	params.append('redirect_uri', opts.redirectURL);
	params.append('grant_type', 'authorization_code');

	const json = (await Got('json')({
		method: 'POST',
		url: tokenURL,
		searchParams: params,
		headers,
	}).json()) as AuthorizationResponse;

	const { access_token, refresh_token, expires_in } = json;

	return {
		access_token,
		refresh_token,
		expires_in,
	};
};

export default Strategy;
