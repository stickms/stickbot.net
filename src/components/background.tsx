import { useEffect, useState } from 'react';
import '~/styles/background.css';

const PLACEHOLDER_IMAGE = '/images/bg-small.jpg';
const FULL_IMAGE = '/images/bg-full.jpg';

export function Background() {
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		const img = new Image();
		img.src = FULL_IMAGE;
		img.onload = () => setIsLoaded(true);
	}, []);

	return (
		<div className="background-container">
			<div
				className="background-image background-small"
				style={{ backgroundImage: `url(${PLACEHOLDER_IMAGE})` }}
			/>

			<div
				className={`background-image background-full ${isLoaded ? 'loaded' : ''}`}
				style={{ backgroundImage: `url(${FULL_IMAGE})` }}
			/>
		</div>
	);
}
