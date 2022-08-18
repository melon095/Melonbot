export const RandomNumber = (min: number, max: number): number => {
	return Math.round(Math.random() * (max - min) + min);
};
