import { useContext, useState } from 'react';
import { UserContext } from '../../../App';
import Info from '../../../Components/StatusMessage/Info';
import ProfilePicture from '../../../Components/User/ProfilePicture';
import ChannelDashboard from './Channel';
import UserDashboard from './User';

export default function () {
	const userContext = useContext(UserContext);

	if (!userContext || !userContext.user) {
		return <></>;
	}

	const { user } = userContext;
	const { has_channel } = user;
	const [showUser, setShowUser] = useState(true);
	const [showChannel, setShowChannel] = useState(false);

	return (
		<div className="mx-20">
			<header className="border-b border-gray-200 flex w-full items-center justify-center">
				<div className="text-sm font-medium text-center flex-1 order-1">
					<ul className="">
						<div className="flex felx-wrap -mb-px">
							<li className="mr-2">
								<a
									onClick={() => {
										setShowUser(true);
										setShowChannel(false);
									}}
									className="inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-200 cursor-pointer"
								>
									<span>User</span>
								</a>
							</li>
							<li className="mr-2">
								<a
									onClick={() => {
										if (has_channel) {
											setShowUser(false);
											setShowChannel(true);
										}
									}}
									className={`inline-block p-4 border-b-2 border-transparent rounded-t-lg ${
										has_channel
											? 'hover:text-gray-600 hover:border-gray-200 cursor-pointer'
											: 'text-gray-400 cursor-not-allowed'
									}`}
									title={`${
										has_channel ? '' : 'Melonbot is not joined in your channel.'
									}`}
								>
									<span>Channel</span>
								</a>
							</li>
						</div>
					</ul>
				</div>
				<div className="order-2">
					<li className="flex flex-row items-center justify-center">
						<h1 className="mr-4">{user.profile.name}</h1>
						<ProfilePicture user={user} />
					</li>
				</div>
			</header>
			{/* border-gray-300 border h-full */}
			<section className="my-4 ">
				{showUser && <UserDashboard user={user} />}
				{has_channel && showChannel && <ChannelDashboard user={user} />}
			</section>
		</div>
	);
}
