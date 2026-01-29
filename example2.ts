import slim from "observable-slim";
import BaseClass from "./BaseClass";
import regie from "./dist";

type StateProps = {
	myState: {
		greeting: string;
	};
	myString: string;
};

// type ComponentProps = {
// 	myState: {
// 		greeting: string;
// 	};
// };

type MyState = {
	greeting: string;
};

const { $$register, state, actions } = regie({
	initialState: {
		myState: {
			greeting: "Hello"
		},
		myString: "World"
	} as StateProps,
	actions: {
		setGreeting({ state }, val): void {
			state.myState.greeting = val;
		},
		setString({ state }, val): void {
			state.myString = val;
		}
	}
});

// In real usage, this would extend LitElement
class Component extends BaseClass {
	props?: MyState;

	constructor() {
		super();
	}

	get Greeting(): string {
		return `${this.props?.greeting} ${state.myString}`;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.props = state.myState;
	}

	["observe greeting"](newVal: string): void {
		console.log("greeting changed", newVal);
	}
}

$$register({ Component });

console.log("this is state", state);
console.log("this is state.myState.greeting", state.myState.greeting);

const cmp = new Component();

// Simulate element being connected to DOM
cmp.connectedCallback();

console.log("Greeting", cmp.Greeting);
actions.setGreeting("Goodbye");
actions.setString("El Mundo");
console.log("Greeting", cmp.Greeting);

// Simulate element being removed from DOM (cleans up observers)
cmp.disconnectedCallback();

// Force observable-slim to clean up immediately (otherwise 10s delay)
slim.flushCleanup();
