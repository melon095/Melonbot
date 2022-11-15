type Opts<T, E> = {
	isOk: boolean;
	inner: T;
	error: E;
};

export class Result<T, E> {
	private constructor(opts: Opts<T, E>) {
		this.isOk = opts.isOk;
		this.inner = opts.inner;
		this.error = opts.error;
	}

	static Ok<T>(value: T): Result<T, null> {
		return new Result<T, null>({ isOk: true, inner: value, error: null });
	}

	static Err<E>(error: E): Result<null, E> {
		return new Result<null, E>({ isOk: false, inner: null, error });
	}

	readonly isOk: boolean;
	readonly inner: T;
	readonly error: E;

	unwrap(): T {
		if (this.isOk) {
			return this.inner;
		}

		throw this.error;
	}

	public get IsOk(): boolean {
		return this.isOk;
	}

	public get Inner(): T {
		return this.inner;
	}

	public get Error(): E {
		return this.error;
	}
}
