import FloppaSpin from './../../assets/FloppaSpin.gif';

export default function () {
	return (
		<div className="flex flex-col items-center justify-center">
			<span className="text-2xl text-center font-bold">Loading...</span>
			<div className="spinning-container">
				<div
					className="loading-spinner"
					style={{ backgroundImage: `url(${FloppaSpin})`, backgroundSize: 'cover' }}
				/>
			</div>
		</div>
	);
}
