import React, { Suspense, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ErrorMessage from '../../../Components/ErrorMessage';
import Loading from '../../../Components/Loading';
import useFetch from '../../../Hooks/useFetch';
import { CommandInfo } from '../../../Types/commands';
import ReactMarkdown from 'react-markdown';
import { UserContext } from '../../../App';

type Props = {
	command: string;
};

export default function () {
	const user = useContext(UserContext);
	const { command } = useParams<Props>();

	const [commandInfo, setCommandInfo] = useState<CommandInfo | null>(null);
	const [invalidCommand, setInvalidCommand] = useState<boolean>(false);

	const { data, error, loading } = useFetch<CommandInfo>({
		endpoint: `/api/v1/commands/${command}`,
	});

	useEffect(() => {
		if (error) {
			console.error(error);
		} else if (data) {
			setCommandInfo(data);
			if (data.error) {
				setInvalidCommand(true);
			}
		}
	}, [loading]);

	if (invalidCommand) {
		return (
			<div className="flex flex-col items-center justify-center">
				<ErrorMessage message={`${command} Does not exist`} />
			</div>
		);
	}

	if (loading) {
		return <Loading />;
	}

	if (commandInfo === null) {
		return null;
	}

	const name = commandInfo.Command.Name;

	const CommandName = () => {
		const prefix = user?.user?.prefix || import.meta.env.VITE_PREFIX;

		return <h3 className="text-2xl font-bold">{`${prefix} ${name}`}</h3>;
	};

	const Markdown = (props: { value: string }) => (
		<pre>
			<code>
				<ReactMarkdown>{props.value}</ReactMarkdown>
			</code>
		</pre>
	);

	return (
		<div className="flex flex-col px-10 pb-4 relative overflow-x-auto sm:rounded-lg">
			<div>
				<Suspense fallback={<>...</>}>
					<CommandName />
				</Suspense>
			</div>

			<table className="w-full text-sm text-left shadow-xl">
				<tbody className="bg-white divide-y divide-gray-200">
					{Object.entries(commandInfo.Command).map(([key, value], i) => {
						return (
							<tr key={i} className="bg-white border-b align-text-top">
								<td
									key={`${key}-${i}`}
									className="px-6 py-4 bg-gray-200 border-r-black border w-32"
								>
									{key}
								</td>
								<td key={`${value}-${i}`} className="px-6 py-4">
									{key === 'LongDescription' ? <Markdown value={value} /> : value}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
