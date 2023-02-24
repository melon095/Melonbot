import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../App';

const ButtonCSS = `font-medium inline-flex items-center justify-center border border-transparent rounded leading-snug transition duration-150 ease-in-out px-4 py-2 shadow text-gray-200 bg-gray-900 hover:bg-gray-800 ml-3`;

type LoginButtonProps = {
	username?: string;
};

const LoginButton = (props: LoginButtonProps) => {
	if (props?.username) {
		return (
			<a href="/user/dashboard" className={ButtonCSS}>
				Dashboard for {props.username}
			</a>
		);
	}

	return (
		<a href="/api/auth/twitch" className={ButtonCSS}>
			Login with Twitch
		</a>
	);
};

const LogoutButton = () => {
	return (
		<a href="/api/auth/logout" className={ButtonCSS}>
			Logout
		</a>
	);
};

const HamburgerSVG = () => {
	return (
		<>
			<svg
				className="w-6 h-6"
				fill="currentColor"
				viewBox="0 0 20 20"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					fillRule="evenodd"
					d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
					clipRule="evenodd"
				></path>
			</svg>
			<svg
				className="hidden w-6 h-6"
				fill="currentColor"
				viewBox="0 0 20 20"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					fillRule="evenodd"
					d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
					clipRule="evenodd"
				></path>
			</svg>
		</>
	);
};

export default function () {
	const userContext = useContext(UserContext);

	// const [hamburger, setHamburger] = useState(true);

	return (
		<header className="w-full pb-8">
			<nav className="max-w-6xl mx-auto px-5 sm:px-6">
				<div className="flex flex-wrap items-center justify-between h-16 md:h-20">
					<span />
					{/* <button
						type="button"
						className="md:hidden inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
						onClick={() => setHamburger(!hamburger)}
					>
						<span className="sr-only">Open main menu</span>
						<HamburgerSVG />
					</button> */}
					<nav className="w-full md:flex md:flex-grow md:w-auto">
						<ul className="flex flex-col md:flex-row flex-grow justify-start flex-wrap items-center space-x-5">
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
						<ul className="flex flex-col md:flex-row flex-grow justify-end flex-wrap items-center space-x-4">
							{userContext?.user && (
								<li>
									<LogoutButton />
								</li>
							)}
							<li>
								<LoginButton username={userContext?.user?.profile.name || ''} />
							</li>
						</ul>
					</nav>
				</div>
			</nav>
		</header>
	);
}
