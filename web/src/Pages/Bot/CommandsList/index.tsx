import { useEffect, useMemo, useState } from 'react';
import Loading from '../../../Components/Loading';
import useFetch from '../../../Hooks/useFetch';
import { CommandList } from '../../../Types/commands';
import HorizontalTable from '../../../Components/Table/Horizontal';

export function AllowedToRunButton({ cell: { value } }: AllowedToRunCell<string>) {
	return (
		<a
			href={`/bot/commands-list/${value}`}
			className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-xs px-3 py-2 mr-2 mb-2"
		>
			Details
		</a>
	);
}

type AllowedToRunCell<Type> = {
	cell: {
		value: Type;
	};
};

export default function () {
	const columns = useMemo(
		() => [
			{
				Header: 'Name',
				accessor: 'Table.Name',
			},
			{
				Header: 'Description',
				accessor: 'Table.Description',
			},
			{
				Header: 'Permission',
				accessor: 'Table.Permission',
			},
			{
				Header: 'Can Run',
				accessor: 'allowedToRun',
				Cell: ({ cell: { value } }: AllowedToRunCell<boolean | null>) => {
					if (value === null) {
						return (
							<span role="img" aria-label="unknown">
								❓
							</span>
						);
					}

					return value ? (
						<span role="img" aria-label="yes">
							✅
						</span>
					) : (
						<span role="img" aria-label="no">
							⛔
						</span>
					);
				},
			},
			{
				Header: 'Details',
				accessor: 'Table.Name',
				id: 'details',
				Cell: AllowedToRunButton,
			},
		],
		[],
	);

	const [commandList, setCommandList] = useState<CommandList | null>(null);

	const { data, error, loading } = useFetch<CommandList>({ endpoint: '/api/v1/commands' });

	useEffect(() => {
		if (error) {
			console.error(error);
			setCommandList(null);
		} else if (data) {
			setCommandList(data);
		}
	}, [loading]);

	if (loading || !commandList) {
		return <Loading />;
	}

	return (
		<div>
			{/* Typescript crying because 'Details' doesn't exist on Commands object. */}
			{/* @ts-ignore */}
			<HorizontalTable columns={columns} data={commandList?.Commands} pagniation={true} />
		</div>
	);
}
