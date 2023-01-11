import Got from './../tools/Got.js';
import type Express from 'express';
import { Ok, Result } from './../tools/result.js';

const MONTH_IN_MS = 1000 * 60 * 60 * 24 * 30;

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

type StrategyCallbackResult = { cookie?: CookieOpts } | null;

type StrategyCallback<P, T extends Result<P, Error>> = (
	accessToken: string,
	refreshToken: string,
	expires_in: number,
	profile: T | undefined,
	authUser: { id: string; name: string } | undefined,
) => Promise<Result<StrategyCallbackResult, Error | string>>;

type StrategyGetUserProfile<P, T extends Result<P, Error> = Result<P, Error>> = (
	accessToken: string,
	authUser?: { id: string; name: string },
) => Promise<T>;

export type StrategyRefreshFn = (
	refresh_token: string,
) => Promise<Omit<BasicOauthResponse, 'refresh_token'>>;

type StrategyOpts = QueryStrategyOpts | HeaderStrategyOpts;

class Strategy<P, T extends Result<P, Error> = Result<P, Error>> {
	constructor(
		private opts: StrategyOpts,
		private callback: StrategyCallback<P, T>,
		private userProfile?: StrategyGetUserProfile<P, T>,
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

		let profile: T | undefined = undefined;
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

			if (profile?.err) {
				res.render('error', {
					safeError: profile.inner,
				});
				Bot.HandleErrors(this.opts.name, profile.inner);
			}
		}

		let cbRes;
		try {
			cbRes = await this.callback(
				second.access_token,
				second.refresh_token,
				second.expires_in,
				profile,
				authUser || undefined,
			);
		} catch (error) {
			Bot.HandleErrors(this.opts.name, error);
			res.render('error', {
				safeError: 'There was an error logging you in try again later.',
			});
			return;
		}

		if (cbRes.err) {
			res.render('error', {
				safeError: cbRes.inner,
			});
			return;
		}

		const { inner } = cbRes;

		if (inner && inner.cookie) {
			const { name, value, httpOnly, maxAge, path } = inner.cookie;
			res.cookie(name, value, {
				httpOnly: httpOnly || true,
				maxAge: maxAge || MONTH_IN_MS,
				path: path || '/',
			});
		}

		next();
	}

	async RefreshToken(refresh_token: string): Promise<ReturnType<StrategyRefreshFn>> {
		const { tokenURL, authenticationMethod } = this.opts;

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
				throwHttpErrors: false,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					...this.opts.headers,
				},
			})
			.json();

		return json as ReturnType<StrategyRefreshFn>;
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
