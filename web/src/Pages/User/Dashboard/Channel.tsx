import { useEffect, useState } from 'react';
import Loading from '../../../Components/Loading';
import useFetch from '../../../Hooks/useFetch';
import { UserMe } from '../../../Types/user';

type Setting = {
	identifier: string;
	value: string;
};

type SettingProp = {
	setting: Setting;
};

function Pajbot({ setting }: SettingProp) {
	return (
		<div>
			<form
				className="flex flex-row"
				method="POST"
				action="/api/user/update-setting"
				encType="application/x-www-form-urlencoded"
			>
				<input type="hidden" name="identifier" value="pajbot" />
				<div>
					<label
						htmlFor="pajbot"
						className="block mb-2 text-sm font-medium text-gray-900"
					>
						Pajbot URL
					</label>
					<input
						id="pajbot"
						name="url"
						type="text"
						defaultValue={setting.value}
						className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 mr-2"
					/>
				</div>
				<div className="relative">
					<button
						type="submit"
						className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center absolute bottom-0"
					>
						Save
					</button>
				</div>
			</form>
			<a href="https://github.com/pajbot/pajbot" className="text-blue-600 hover:underline">
				What is this?
			</a>
		</div>
	);
}

export default function ({ user }: { user: UserMe }) {
	const [settings, setSettings] = useState<Setting[]>([]);

	const { loading, data } = useFetch<Setting[]>({ endpoint: '/api/user/get-settings' });

	useEffect(() => {
		data && setSettings(data);
	}, [data, loading]);

	if (loading) return <Loading />;

	return (
		<div>
			<section>
				<h2>Update channel settings</h2>
				{settings.map((setting) => {
					switch (setting.identifier) {
						case 'pajbot':
							return <Pajbot setting={setting} />;
						default:
							return <p>{setting.identifier}</p>;
					}
				})}
			</section>
		</div>
	);
}
