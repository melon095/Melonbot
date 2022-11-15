import { Result } from './../src/tools/result';

describe('Result', () => {
	it('should be able to create an Ok result', () => {
		const result = Result.Ok('Hello World');
		expect(result.IsOk).toBe(true);
		expect(result.Inner).toBe('Hello World');
	});

	it('should be able to create an Err result', () => {
		const result = Result.Err('Hello World');
		expect(result.IsOk).toBe(false);
		expect(result.Error).toBe('Hello World');
	});

	it('should be able to unwrap an Ok result', () => {
		const result = Result.Ok('Hello World');
		expect(result.unwrap()).toBe('Hello World');
	});

	it('should be able to unwrap an Err result', () => {
		const result = Result.Err('Hello World');
		expect(() => result.unwrap()).toThrow('Hello World');
	});
});
