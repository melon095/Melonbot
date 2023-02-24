import { Routes, Route } from 'react-router-dom';
import React from 'react';
import Header from './Components/Header';
import Footer from './Components/Footer';
import Loading from './Components/Loading';
import { IUserContext, UserMe } from './Types/user';
import useFetch from './Hooks/useFetch';

export const UserContext = React.createContext<IUserContext | null>(null);

const Home = React.lazy(() => import('./Pages/Home/index'));
const Dashboard = React.lazy(() => import('./Pages/User/Dashboard/index'));
const CommandsList = React.lazy(() => import('./Pages/Bot/CommandsList/index'));
const CommandDetails = React.lazy(() => import('./Pages/Bot/CommandsList/[command]'));
const NotFound = React.lazy(() => import('./Pages/Error/NotFound'));
const ServerError = React.lazy(() => import('./Pages/Error/Custom'));

export default function () {
	const [user, setUser] = React.useState<UserMe | null>(null);

	const { data, statusCode } = useFetch<UserMe>({ endpoint: '/api/me' });

	React.useEffect(() => {
		switch (statusCode) {
			case 401:
				setUser(null);
				break;
			case 200:
				setUser(data);
				break;
		}
	}, [data, statusCode]);

	return (
		<div className="flex flex-col min-h-screen">
			<UserContext.Provider value={{ user, setUser }}>
				<Header />
				<Routes>
					<Route
						index
						element={
							<React.Suspense fallback={<Loading />}>
								<Home />
							</React.Suspense>
						}
					/>
					<Route
						path="/bot/commands-list"
						element={
							<React.Suspense fallback={<Loading />}>
								<CommandsList />
							</React.Suspense>
						}
					/>
					<Route
						path="/bot/commands-list/:command"
						element={
							<React.Suspense fallback={<Loading />}>
								<CommandDetails />
							</React.Suspense>
						}
					/>
					<Route
						path="/user/dashboard"
						element={
							<React.Suspense fallback={<Loading />}>
								<Dashboard />
							</React.Suspense>
						}
					/>
					<Route
						path="/error/:reason"
						element={
							<React.Suspense fallback={<Loading />}>
								<ServerError />
							</React.Suspense>
						}
					/>
					<Route
						path="*"
						element={
							<React.Suspense fallback={<Loading />}>
								<NotFound />
							</React.Suspense>
						}
					/>
				</Routes>
				<Footer />
			</UserContext.Provider>
		</div>
	);
}
