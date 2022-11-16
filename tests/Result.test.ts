import { Result, Err, Ok } from './../src/tools/result';

describe('Result', () => {
	it('should return the Ok value if it exists', () => {
		const result: Result<number, string> = new Ok(5);

		expect(result.ok).toBe(true);
		expect(result.unwrap()).toBe(5);
	});

	it('should throw an error if the Ok value does not exist', () => {
		const result: Result<number, string> = new Err('error');

		expect(result.err).toBe(true);
		expect(() => result.unwrap()).toThrowError('error');
	});

	it('should return the Ok value if it exists, otherwise return the default value', () => {
		const result: Result<number, string> = new Ok(5);

		expect(result.ok).toBe(true);
		expect(result.unwrapOr(() => 10)).toBe(5);
	});

	it('should return the default value if the Ok value does not exist', () => {
		const result: Result<number, string> = new Err('error');

		expect(result.err).toBe(true);
		expect(result.unwrapOr(() => 10)).toBe(10);
	});

	it('Function Decleration', () => {
		const cb = (): Result<number, string> => {
			return new Err('error');
		};

		const result = cb();

		expect(result.err).toBe(true);
		expect(() => result.unwrap()).toThrow('error');
		expect(result.unwrapOr(() => 10)).toBe(10);
	});

	it('A', () => {
		const cb = (): Result<number, string> => {
			return new Ok(5);
		};

		const result = cb();

		expect(result.ok).toBe(true);
		expect(result.unwrap()).toBe(5);
		expect(result.unwrapOr(() => 10)).toBe(5);
	});
});
