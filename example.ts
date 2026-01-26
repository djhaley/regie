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
		setScooter({ mutations }, val): void {
			mutations.setVal(val);
		}
	},
	mutations: {
		setVal({ state }, val): void {
			state.scooter = val;
		}
	}
});

class Component extends BaseClass {
	props: ComponentProps;

	constructor(props: ComponentProps) {
		super();

		console.log("here are props", props);
		this.props = props;
		this.created();
	}

	created(): void {
		this.createdHooks();
	}

	dispose(): void {}

	["observe scooter.location"](location: number): void {
		console.log("scooter.location changed");
		console.log(location, newVal.location);
		// t.end()
	}
	["observe scooter.rid"](): void {
		console.log("scooter.rid changed");
		// t.fail()
	}
	["observe scooter.battery"](): void {
		console.log("scooter.battery changed");
		// t.fail()
	}
}

$$register({ Component });

console.log("state", state);
console.log("state", state.scooter);
const cmp = new Component({ scooter: state.scooter });

console.log(cmp.props.scooter);
actions.setScooter(newVal);
