import { useParams, useSearchParams } from 'react-router-dom';
import Error from '../../Components/StatusMessage/Error';
import { Props as ErrorProps } from '../../Components/StatusMessage/Shared';

type Props = {
	reason: string;
};

function ConstructMessage(reason: string) {
	switch (reason) {
		case 'failed-to-authenticate': {
			return 'Failed to authenticate with Service. Please try again.';
		}
		default: {
			return 'An unknown error has occurred. Please try again.';
		}
	}
}

export default function () {
	const { reason } = useParams<Props>();
	const params = useSearchParams();
	const props: ErrorProps = {
		message: ConstructMessage(reason || ''),
	};

	const m = params[0].get('m');

	if (m) {
		props.list = [m];
	}
	// TODO: Test
	return (
		<div className="flex flex-col items-center justify-center flex-1">
			<Error {...props} />
		</div>
	);
}
