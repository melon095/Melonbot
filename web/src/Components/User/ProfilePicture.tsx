import { UserMe } from '../../Types/user';

type Props = {
	user: UserMe;
};

export default function ({ user }: Props) {
	return (
		<div className="w-14 h-14 rounded-full overflow-hidden">
			<img src={user.profile.profile_picture} />
		</div>
	);
}
