import { Link } from 'react-router-dom';
import { IsAuthenticated } from '../../Utils/IsAuthenticated';

const ButtonCSS = `font-medium inline-flex items-center justify-center border border-transparent rounded leading-snug transition duration-150 ease-in-out px-4 py-2 shadow text-gray-200 bg-gray-900 hover:bg-gray-800 ml-3`;

const LoginButton = () => {
	return IsAuthenticated() ? (
		<a href="/user/dashboard" className={ButtonCSS}>
			Dashboard
		</a>
	) : (
		<a href="/login" className={ButtonCSS}>
			Login with Twitch
		</a>
	);
};

const LogoutButton = () => {
	return (
		<a href="/logout" className={ButtonCSS}>
			Logout
		</a>
	);
};

export default function () {
	// const isLogged = IsAuthenticated();
	const isLogged = true; // TODO

	return (
		<header className="w-full pb-8">
			<nav className="max-w-6xl mx-auto px-5 sm:px-6">
				<div className="flex items-center justify-between h-16 md:h-20">
					<nav className="flex flex-grow">
						<ul className="flex flex-grow justify-start flex-wrap items-center space-x-5">
							<li>
								<Link to="/" className={ButtonCSS}>
									Home
								</Link>
							</li>
							<li>
								<Link to="/bot/commands-list" className={ButtonCSS}>
									List of Public Commands
								</Link>
							</li>
						</ul>
						<ul className="flex flex-grow justify-end flex-wrap items-center space-x-4">
							{isLogged && (
								<li>
									<LogoutButton />
								</li>
							)}
							<li>
								<LoginButton />
							</li>
						</ul>
					</nav>
				</div>
			</nav>
		</header>
	);
}
