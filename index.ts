/* eslint-disable @typescript-eslint/no-explicit-any */

import { EventEmitter } from "eventemitter3";

import ObservableSlim from "observable-slim";
import getByPath from "./lib/getByPath.js";
import isEqual from "./lib/isEqual.js";
import register from "./lib/register.js";

export type Action<S> = (
	arg: {
		state: S;
		actions: ActionTree<S>;
	},
	value: any
) => any;

type Change = {
	type:
		| "update"
		| "add"
		| "delete"
		| "splice"
		| "reconfigure"
		| "get"
		| "set";
	property: string | number | symbol;
	target: any;
	newValue?: any;
	oldValue?: any;
	currentPath: string;
};

type RemoveFirstParameter<T> = T extends (
	first: any,
	...rest: infer P
) => infer R
	? (...args: P) => R
	: never;

interface ActionTree<S> {
	[key: string]: Action<S>;
}

const state = {
	root: {
		urlParams: {},
		authenticated: false
	},
	automation: {
		activeTab: "triggers",
		isLoading: false
	}
};
const proxy = ObservableSlim.create(state, false, (changes): void => {
	console.log(changes);
});

console.log(state);
console.log(ObservableSlim.getPath(proxy));
console.log(ObservableSlim.getPath(proxy.automation));

proxy.automation.activeTab = "actions";
proxy.automation = { activeTab: "logs", isLoading: true };

export default function regie<S, A>(
	{
		initialState = {} as S & object,
		actions = {} as A & ActionTree<S>
	}: {
		initialState?: S & object;
		actions?: A & ActionTree<S>;
	} = {
		initialState: {} as S & object,
		actions: {} as A & ActionTree<S>
	}
): {
	state: S;
	observe: (
		mapper: any,
		handler: (value: any, change: any) => void
	) => () => void;
	actions: { [key in keyof A]: RemoveFirstParameter<A[key]> };
	$$register: any;
} {
	type MapperFn = ((state: S) => any) & { path?: string; lastValue?: any };
	type Mapper = string | MapperFn;

	const bus = new EventEmitter();

	console.log("Creating state:");
	const state = ObservableSlim.create(
		initialState,
		false,
		(changes): void => {
			changes.forEach((change): void => {
				if (
					change.type == "update" &&
					change.property == "length" &&
					Array.isArray(change.target) &&
					change.target.length == change.newValue
				) {
					return;
				}

				bus.emit("root", state, change);
			});
		}
	);
	console.log("Initial state:", state);
	console.log((state as any).automation);

	function observeLater(
		mapper: ((state: S) => any) & { path?: string; lastValue?: any },
		handler: (value: any, change: Change) => void
	): () => void {
		function observer(_value: unknown, change: Change): void {
			let val;
			try {
				val = mapper(state);
			} catch (e: any) {
				// a previously known and watched value (and its parent) is probably deleted
				// so call the handler with value undefined and update lastValue to undefined.
				console.log(e);
				if (typeof mapper.lastValue != "undefined")
					handler(undefined, change);
				mapper.lastValue = undefined;
				return;
			}

			if (typeof val != "undefined") {
				const path =
					(val &&
						ObservableSlim.isProxy(val) &&
						ObservableSlim.getPath(val)) ||
					mapper.path;

				if (
					!isEqual(mapper.lastValue, val) ||
					(change.currentPath.startsWith(path) &&
						path.length <= change.currentPath.length)
				) {
					mapper.lastValue = val;
					handler(val, change);
				}
			} else if (
				typeof mapper.lastValue != "undefined" &&
				typeof val == "undefined"
			) {
				handler(undefined, change);
				mapper.lastValue = undefined;
			}
		}

		bus.on("root", observer);
		const off = (): EventEmitter => bus.removeListener("root", observer);
		return (): void => {
			off();
		};
	}

	function observe(
		mapper: Mapper,
		handler: (value: any, change: Change) => void
	): () => void {
		let mapperFn = mapper;
		if (typeof mapper != "function" && typeof mapper != "string")
			mapperFn = (): void => mapper;

		if (typeof mapper == "string") {
			mapperFn = (): any => getByPath(state, mapper);
			mapperFn.path = mapper;
		}

		let val;

		try {
			val = (mapperFn as () => any)();
		} catch (e: any) {
			console.log(e);
			return observeLater(mapperFn as MapperFn, handler);
		}

		(mapperFn as MapperFn).lastValue = val;

		return observeLater(mapperFn as MapperFn, handler);
	}

	const boundRegister = register(observe, state);
	const boundActions = {} as {
		[key in keyof A]: RemoveFirstParameter<A[key]>;
	};

	const store = {
		state,
		observe,
		actions: boundActions
	};

	/* eslint-disable @typescript-eslint/no-unsafe-function-type */
	Object.keys(actions || {}).forEach((key: string): void => {
		boundActions[key as keyof A] = (
			actions[key as keyof A] as Function
		).bind(store, {
			actions: boundActions,
			state
		});
	});
	/* eslint-enable @typescript-eslint/no-unsafe-function-type */

	return {
		...store,
		$$register: boundRegister
	};
}
