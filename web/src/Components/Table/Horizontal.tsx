import React from 'react';
import { Column, useTable } from 'react-table';

type Props<D extends object> = {
	columns: ReadonlyArray<Column<D>>;
	data: readonly D[];
	pagination?: boolean;
};

export default function <D extends object>(props: Props<D>) {
	const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
		columns: props.columns,
		data: props.data,
	});

	const Pagination = () => {
		// TODO: Implement pagination - Might need version 8
		return <></>;
		// return <div>
		//     <div>

		//     </div>
		// </div>
	};

	return (
		<div className="px-10 pb-4 relative overflow-x-auto sm:rounded-lg">
			<table
				{...getTableProps()}
				className="shadow-xl w-full text-sm text-left text-gray-500 "
			>
				<thead className="text-xs divide-gray-200 uppercase bg-gray-50">
					{headerGroups.map((headerGroup) => (
						<tr {...headerGroup.getHeaderGroupProps()}>
							{headerGroup.headers.map((column) => (
								<th {...column.getHeaderProps()} className="px-6 py-3">
									{column.render('Header')}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
					{rows.map((row, i) => {
						prepareRow(row);
						return (
							<tr
								{...row.getRowProps()}
								className="bg-white border-b hover:bg-gray-200"
							>
								{row.cells.map((cell) => {
									return (
										<td {...cell.getCellProps()} className="px-6 py-4">
											{cell.render('Cell')}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
			{props.pagination && <Pagination />}
		</div>
	);
}
