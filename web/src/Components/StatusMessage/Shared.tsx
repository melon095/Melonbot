export type Props = {
	message: string;
	list?: string[];
};

export enum StatusType {
	Error = 'error',
	Warning = 'warning',
	Info = 'info',
}

type PrivateProps = Props & {
	type: StatusType;
};

const InformationSVG = () => (
	<svg
		aria-hidden="true"
		className="flex-shrink-0 inline w-5 h-5 mr-3"
		fill="currentColor"
		viewBox="0 0 20 20"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fillRule="evenodd"
			d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
			clipRule="evenodd"
		></path>
	</svg>
);

function Outer(props: { children: React.ReactNode; colourClass: string }) {
	return (
		<div className={`flex p-4 mb-4 text-sm border-l-4 ${props.colourClass} `}>
			{props.children}
		</div>
	);
}

function CreateList(props: Props) {
	return (
		<>
			<InformationSVG />
			<span className="sr-only">An Error Occured</span>
			<div>
				<span className="font-medium">{props.message}</span>
				{props.list && (
					<ul className="mt-1.5 ml-4 list-disc list-inside">
						{props.list.map((item, index) => (
							<li key={index}>{item}</li>
						))}
					</ul>
				)}
			</div>
		</>
	);
}

function Error(props: Props) {
	return (
		<Outer
			children={<CreateList {...props} />}
			colourClass="text-red-700 bg-red-100 border-red-500"
		/>
	);
}

function Warning(props: Props) {
	return (
		<Outer
			children={<CreateList {...props} />}
			colourClass="text-yellow-700 bg-orange-100 border-orange-500"
		/>
	);
}

function Info(props: Props) {
	return (
		<Outer
			children={<CreateList {...props} />}
			colourClass="text-blue-700 bg-blue-100 border-blue-500"
		/>
	);
}

export default function (props: PrivateProps) {
	switch (props.type) {
		case StatusType.Error:
			return Error(props);
		case StatusType.Warning:
			return Warning(props);
		case StatusType.Info:
			return Info(props);
	}
}
