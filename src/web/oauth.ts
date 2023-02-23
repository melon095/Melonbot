import Got from './../tools/Got.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CookieSerializeOptions } from '@fastify/cookie';
import User, { ResolveInternalID } from './../controller/User/index.js';
import { FastifyAuthenticatedUser } from './index.js';

// const MONTH_IN_MS = 1000 * 60 * 60 * 24 * 30;

const MONTH = new Date();
MONTH.setMonth(MONTH.getMonth() + 1);

export enum AuthenticationMethod {
	'Query' = 'query',
	'Header' = 'header',
}

export type CookieOpts = {
	name: string;
	value: string;
} & CookieSerializeOptions;

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

export interface OAuthQueryParams {
	code?: string;
	state?: string;
	error?: string;
	error_description?: string;
}

export class UnauthorizedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnauthorizedError';
	}
}

type StrategyCallbackResult = { cookie?: CookieOpts } | null;

type StrategyCallback<Profile> = (
	oauth: {
		accessToken: string;
		refreshToken: string;
		expiresIn: number;
	},
	profile: Profile | undefined,
	authUser: User | null,
) => Promise<StrategyCallbackResult | void>;

type StrategyGetUserProfile<Profile> = (
	accessToken: string,
	authUser: User | null,
) => Promise<Profile>;

export type StrategyRefreshFn = (
	refresh_token: string,
) => Promise<Omit<BasicOauthResponse, 'refresh_token'>>;

type StrategyOpts = QueryStrategyOpts | HeaderStrategyOpts;

class Strategy<ProfileKind> {
	constructor(
		private opts: StrategyOpts,
		private callback: StrategyCallback<ProfileKind>,
		private userProfile?: StrategyGetUserProfile<ProfileKind>,
	) {}

	async authenticate(
		req: FastifyRequest<{ Querystring: OAuthQueryParams }>,
		reply: FastifyReply,
	) {
		const { code, error, error_description } = req.query;

		if (error || !code) {
			Bot.Log.Error(`%s %O`, this.opts.name, { error, error_description });

			// TODO Create
			reply.redirect('/error/failed-to-authenticate');
			return reply;
		}

		const opts = Object.assign(this.opts, { code });
		const second = await HandleSecondStep({
			...opts,
		});

		let profile: ProfileKind | undefined = undefined;
		const authUser = await this.ResolveFastifyUser(req.authenticatedUser);
		if (this.userProfile) {
			try {
				profile = await this.userProfile(second.access_token, authUser);
			} catch (error) {
				if (error instanceof UnauthorizedError) {
					const reason =
						'User is not authorized to use this service: ' +
						(error.message ? `: ${error.message}` : '');

					reply.redirect(`/error/failed-to-authenticate?m=${encodeURIComponent(reason)}`);
					return reply;
				}

				Bot.Log.Error(error as Error, '[%s]: Failed to fetch profile', this.opts.name);

				reply.redirect('/error/failed-to-authenticate');

				return reply;
			}
		}

		let cbRes;
		try {
			cbRes = await this.callback(
				{
					accessToken: second.access_token,
					refreshToken: second.refresh_token,
					expiresIn: second.expires_in,
				},
				profile,
				authUser,
			);
		} catch (error) {
			Bot.Log.Error(error as Error, `[%s]: Failed to handle callback`, this.opts.name);

			reply.redirect('/error/failed-to-authenticate');
			return reply;
		}

		if (cbRes && cbRes.cookie) {
			const { name, value, httpOnly, expires, path } = cbRes.cookie;

			reply.setCookie(name, value, {
				httpOnly: httpOnly || true,
				expires: expires || MONTH,
				path: path || '/',
			});
		}
	}

	public static async RefreshToken(
		refresh_token: string,
		opts: {
			tokenURL: string;
			authenticationMethod: AuthenticationMethod;
			headers?: Record<string, string>;
		},
	): Promise<ReturnType<StrategyRefreshFn>> {
		const { tokenURL, authenticationMethod } = opts;

		if (authenticationMethod === AuthenticationMethod.Query) {
			// TODO add query refresh token
			throw new Error('Not implemented for this authentication method');
		}

		const searchParams = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token,
		});

		const json = await Got('default')
			.post(tokenURL, {
				searchParams,
				throwHttpErrors: true,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					...opts.headers,
				},
			})
			.json();

		return json as ReturnType<StrategyRefreshFn>;
	}

	private async ResolveFastifyUser(
		user: FastifyAuthenticatedUser | undefined,
	): Promise<User | null> {
		if (!user) return null;

		const { id } = user;

		return ResolveInternalID(id);
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
