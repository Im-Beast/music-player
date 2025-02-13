type TypeAorB<A, B> =
	| ({ [keyA in keyof A]: A[keyA] } & { [keyB in Exclude<keyof B, keyof A>]?: never })
	| ({ [keyB in keyof B]: B[keyB] } & { [keyA in Exclude<keyof A, keyof B>]?: never });

export type EitherType<A> = A extends [infer A0, infer A1]
	? TypeAorB<A0, A1>
	: A extends [infer A0, infer A1, ...infer A2]
		? TypeAorB<A0, EitherType<[A1, ...A2]>>
		: never;

export type Maybe<X> = X | undefined;
