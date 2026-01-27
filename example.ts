import slim from "observable-slim";
import regie from "./";
import BaseClass from "./BaseClass";

type Scooter = {
	location: Array<number>;
	battery: Array<number>;
	rid: string;
};

type ComponentProps = {
	scooter: Scooter;
};

const newVal: Scooter = { location: [32, 5], battery: [10, 32], rid: "hello" };

const { $$register, state, actions } = regie({
	initialState: {
		scooter: { location: [32, 45], battery: [10, 32], rid: "hello" }
	},
	actions: {
		setScooter({ state }, val): void {
			state.scooter = val;
		},
		setRid({ state }, val): void {
			state.scooter.rid = val;
		},
		updateFirstLocation({ state }, val): void {
			state.scooter.location[0] = val;
		}
	}
});

// In real usage, this would extend LitElement
class Component extends BaseClass {
	props: ComponentProps;

	constructor(props: ComponentProps) {
		super();
		this.props = props;
	}

	// Simulate being added to DOM (LitElement calls this automatically)
	connect(): void {
		this.connectedCallback();
	}

	// Simulate being removed from DOM
	disconnect(): void {
		this.disconnectedCallback();
	}

	["observe scooter.location[0]"](location: number): void {
		console.log("scooter.location changed");
		console.log(location, newVal.location);
	}
	["observe scooter.rid"](rid: string): void {
		console.log("scooter.rid changed");
		console.log(rid, state);
	}
	["observe scooter.battery"](): void {
		console.log("scooter.battery changed");
	}
}

$$register({ Component });

console.log("state", state);
console.log("state.scooter", state.scooter);

const cmp = new Component({ scooter: state.scooter });

// Simulate element being connected to DOM
cmp.connect();

console.log("cmp.props.scooter", cmp.props.scooter);
actions.setScooter(newVal);
actions.setRid("world");
actions.updateFirstLocation(99);

// Simulate element being removed from DOM (cleans up observers)
cmp.disconnect();

// Force observable-slim to clean up immediately (otherwise 10s delay)
slim.flushCleanup();
