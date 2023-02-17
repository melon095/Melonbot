import React, { useEffect, useState } from 'react';

export interface FetchProps {
	endpoint: string;
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	body?: object;
	headers?: Record<string, string>;
}

type FetchResult<Body> = {
	data: Body | null;
	loading: boolean;
	error: Error | null;
	statusCode: number;
	refetch: () => void;
};

export default function <Resp>(props: FetchProps): FetchResult<Resp> {
	const [data, setData] = useState<Resp | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<Error | null>(null);
	const [statusCode, setStatusCode] = useState<number>(0);

	const fetch = () => {
		const { endpoint, method, body, headers } = props;
		const url = (import.meta.env.VITE_API_PREFIX || '') + endpoint;

		const options: RequestInit = {
			method: method || 'GET',
			headers: new Headers({
				'Content-Type': 'application/json',
				Accept: 'application/json',
				...CorsHeaders(),
				...headers,
			}),
			body: body ? JSON.stringify(body) : undefined,
			credentials: 'include',
		};

		window
			.fetch(url, options)
			.then((res) => {
				setStatusCode(res.status);
				return res.json();
			})
			.then((data) => setData(data))
			.catch((err) => setError(err))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		setLoading(true);

		fetch();
	}, [props.endpoint]);

	return { data, loading, error, statusCode, refetch: fetch };
}

function CorsHeaders() {
	return {
		'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
		'Access-Control-Allow-Headers': 'Content-Type,Authorization',
	};
}
