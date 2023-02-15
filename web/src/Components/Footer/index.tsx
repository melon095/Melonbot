import BotName from '../../Utils/BotName';
import { ReactComponent as GithubSVG } from './../../assets/github-mark.svg';
import { ReactComponent as TwitchSVG } from './../../assets/TwitchGlitchBlackOps.svg';

const SVGCss =
	'flex justify-center items-center text-gray-600 hover:text-gray-900 hover:bg-white-100 ronder-full shadow transition duration-150 ease-in-out';

const GithubLink = () => (
	<li>
		<a
			className={SVGCss}
			aria-label="Github"
			href="https://github.com/JoachimFlottorp/Melonbot"
		>
			<GithubSVG className="w-8 h-8 fill-current" viewBox="0 0 100 100" />
		</a>
	</li>
);

const TwitchLink = () => (
	<li className="ml-4">
		<a className={SVGCss} aria-label="Twitch" href={`https://www.twitch.tv/${BotName()}`}>
			<TwitchSVG className="w-8 h-8 fill-current" />
		</a>
	</li>
);

export default function () {
	return (
		<footer className="mt-auto">
			<div className="relative py-4 md:py-8 border-t border-gray-200">
				<ul className="absolute flex mb-4 mb:order-1 mb:ml-4 md:mb-8 inset-y-0 right-0 m-5">
					<GithubLink />
					<TwitchLink />
				</ul>
			</div>
		</footer>
	);
}
