import { useEffect, useMemo, useState } from 'react';
import { WebWorkerMonacoContext } from '../../../App';
import MonacoEditor from '../../../Components/MonacoEditor';
import { UserMe } from '../../../Types/user';
import { ReactComponent as SpotifySVG } from './../../../assets/Spotify_Icon.svg';

const $ExampleCode = `
fn execute(ctx) {
    let invoker = ctx.get_invoker();

    let my_response = format!("Hello, {}!", invoker.username);

    return my_response;
}
` as const;

type Service = {
	linked: boolean;
	title: string;
	icon: React.ReactElement;
	onClick?: () => void;
};

const ThirdPartyServices: Service[] = [
	{
		linked: false,
		title: 'Spotify',
		icon: <SpotifySVG className="w-6 h-6" />,
		onClick: () => {
			window.location.href = '/api/auth/spotify';
		},
	},
];

function SeperateThirdPartyServices(user: UserMe): Service[] {
	function HasService(name: string) {
		return user.third_party.find((service) => service === name);
	}

	const linked = ThirdPartyServices.filter((service) => HasService(service.title));
	const missing = ThirdPartyServices.filter((service) => !HasService(service.title));
	linked.forEach((service) => {
		service.linked = true;
	});

	return [...linked, ...missing];
}

type ServiceProps = {
	service: Service;
};

function LinkedService(props: ServiceProps) {
	return (
		<a
			className="flex items-center p-3 text-base font-bold text-gray-900 bg-gray-50 hover:bg-gray-100 hover:shad cursor-pointer"
			onClick={props.service.onClick}
		>
			{props.service.icon}
			<span className="flex-1 ml-1 whitespace-nowrap">{props.service.title}</span>
			<span className="whitespace-nowrap">
				<span>Connected</span>
			</span>
		</a>
	);
}

function MissingService(props: ServiceProps) {
	return (
		<a
			className="flex items-center p-3 text-base font-bold text-gray-900 bg-gray-50 hover:bg-gray-100 hover:shad cursor-pointer"
			onClick={props.service.onClick}
		>
			{props.service.icon}
			<span className="flex-1 ml-1 whitespace-nowrap">{props.service.title}</span>
		</a>
	);
}

export default function ({ user }: { user: UserMe }) {
	const services = useMemo(() => SeperateThirdPartyServices(user), [user]);

	return (
		<>
			<section className="w-full max-w-sm p-4 bg-white border border-gray-200 rounded-lg shadow sm:p-6">
				<h5 className="mb-3 text-base font-semibold text-gray-900 md:text-xl">
					Connect with Third Party Services
				</h5>
				<ul className="my-4 space-y-3">
					{services.map((service) => {
						if (service.linked) {
							return (
								<li key={service.title}>
									<LinkedService service={service} />
								</li>
							);
						}

						return (
							<li key={service.title}>
								<MissingService service={service} />
							</li>
						);
					})}
				</ul>
			</section>
			<section>
				<MonacoEditor defaultLanguage={$ExampleCode} className="border border-red-900" />
			</section>
		</>
	);
}
