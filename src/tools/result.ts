// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Base<T, E> {
	readonly ok: boolean;
	readonly err: boolean;

	/**
	 * Return the Ok value if it exists, otherwise throw an error
	 */
	unwrap(): T;

	/**
	 * Return the Ok value if it exists, otherwise return the default value
	 */
	unwrapOr(def: () => T): T;
}

export class Ok<T> implements Base<T, never> {
	readonly ok!: true;
	readonly err!: false;
	readonly inner!: T;

	constructor(inner: T) {
		this.inner = inner;

		this.err = false;
		this.ok = true;
	}

	unwrap(): T {
		return this.inner;
	}

	unwrapOr<T2>(_def: () => T2): T | T2 {
		return this.inner;
	}
}

export class Err<E> implements Base<never, E> {
	readonly ok!: false;
	readonly err!: true;
	readonly inner!: E;

	constructor(inner: E) {
		this.inner = inner;

		this.err = true;
		this.ok = false;
	}

	unwrap(): never {
		throw this.inner;
	}

	unwrapOr<T2>(def: () => T2): T2 {
		return def();
	}
}

export type Result<T, E> = Ok<T> | Err<E>;
