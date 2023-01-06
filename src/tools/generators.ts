export function* chunkArr<T>(arr: T[], size: number): Generator<T[]> {
	let i = 0;
	while (i < arr.length) {
		yield arr.slice(i, (i += size));
	}
}
