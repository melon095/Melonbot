import { useEffect, useState } from 'react';
import useFetch from '../../Hooks/useFetch';

type StatProps = {
	title: string;
	value: string;
};

const Stat = ({ title, value }: StatProps) => {
	return (
		<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow transform transition-all mb-4 w-full sm:w-1/3 sm:my-8">
			<div className="bg-white p-5">
				<div className="sm:flex sm:items-start">
					<div className="text-center sm:mt-0 sm:ml-2 sm:text-left">
						<div className="text-center sm:mt-0 sm:ml-2 sm:text-left">
							<h3 className="text-4xl font-bold text-black">{value}</h3>
							<p className="text-sm leading-normal whitespace-nowrap">{title}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

const defaultStats = () => {
	return [
		{
			name: 'Total Users',
			value: 0,
		},
		{
			name: 'Joined Channels',
			value: 0,
		},
		{
			name: 'Custom Commands',
			value: 0,
		},
	];
};

interface StatsResponse {
	name: string;
	value: number;
}

const FETCH_STATS_INTERVAL = 15000; // 15 seconds

function Stats() {
	const [stats, setStats] = useState<StatsResponse[]>(defaultStats);

	const { data, error, refetch } = useFetch<StatsResponse[]>({
		endpoint: '/api/stats',
	});

	useEffect(() => {
		const interval = setInterval(refetch, FETCH_STATS_INTERVAL);

		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (error) {
			console.error(error);
			setStats(defaultStats());
		} else if (data) {
			setStats(data);
		}
	}, [data, error]);

	return (
		<>
			{stats?.map(({ name, value }) => (
				<Stat key={name} title={name} value={value.toString()} />
			))}
		</>
	);
}

export default function () {
	return (
		<section className="max-w-full mx-4 py-6 sm:mx-auto sm:px-6 lg:px-8">
			<div className="container">
				<div className="sm:flex sm:space-x-4">
					<Stats />
				</div>
			</div>
		</section>
	);
}
