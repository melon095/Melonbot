import { Link } from 'react-router-dom';
import { IsAuthenticated } from '../../Utils/IsAuthenticated';

const LoginButton = () => {
	return IsAuthenticated() ? (
		<a href="/user/dashboard">Dashboard</a>
	) : (
		<a href="/login">Login with Twitch</a>
	);
};

export default function () {
	return (
		<header>
			<nav>
				<div>
					<Link to="/">Home</Link>
					<LoginButton />
				</div>
			</nav>
		</header>
	);
}
