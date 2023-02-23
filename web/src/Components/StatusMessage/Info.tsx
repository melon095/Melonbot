import CreateMessage, { Props, StatusType } from './Shared';

export default function (props: Props) {
	return <CreateMessage {...props} type={StatusType.Info} />;
}
