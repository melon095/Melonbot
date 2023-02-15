import React, { useEffect, useState } from 'react';

export interface FetchProps<T> {
	endpoint: string;
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	body?: T;
	headers?: Headers;
}

export default function <Resp, Body = undefined>(
	props: FetchProps<Body>,
): { data: Resp | null; loading: boolean; error: Error | null; refetch: () => void } {
	const [data, setData] = useState<Resp | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<Error | null>(null);

	const fetch = () => {
		const { endpoint, method, body, headers } = props;
		const options: RequestInit = {
			method: method || 'GET',
			headers:
				headers ||
				new Headers({
					'Content-Type': 'application/json',
				}),
			body: body ? JSON.stringify(body) : undefined,
		};

		window
			.fetch(endpoint, options)
			.then((res) => res.json())
			.then((data) => setData(data))
			.catch((err) => setError(err))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		setLoading(true);

		fetch();
	}, [props.endpoint]);

	return { data, loading, error, refetch: fetch };
}
