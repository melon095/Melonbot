import './app.css';
import { Routes, Route } from 'react-router-dom';
import React from 'react';
import Header from './Components/Header';
import Footer from './Components/Footer';

const Home = React.lazy(() => import('./Pages/Home/index'));
const NotFound = React.lazy(() => import('./Pages/NotFound/index'));

export default function () {
	return (
		<div className="flex flex-col min-h-screen">
			<Header />
			<Routes>
				<Route
					index
					element={
						<React.Suspense fallback={<div>Loading...</div>}>
							<Home />
						</React.Suspense>
					}
				/>
				<Route
					path="*"
					element={
						<React.Suspense fallback={<div>Loading...</div>}>
							<NotFound />
						</React.Suspense>
					}
				/>
			</Routes>
			<Footer />
		</div>
	);
}
