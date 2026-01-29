/* eslint-disable @typescript-eslint/no-explicit-any */
import ObservableSlim from "observable-slim";
import getByPath from "./getByPath.js";

export default (
		observe: any,
		state: any
	): (({ Component }: { Component: any }) => void) =>
	({ Component }: { Component: any }): void => {
		const originalConnected = Component.prototype.connectedCallback;

		Component.prototype.connectedCallback = function (): void {
			// Call original first (LitElement needs this for setup)
			if (originalConnected) originalConnected.call(this);

			// Guard against re-registration on reconnect
			if (this.__regie_initialized__) return;
			this.__regie_initialized__ = true;

			this.__regie_observer_removers__ = [];

			const showMe = (window as any).showMe;

			if (showMe) console.log("props", this.props);
			if (showMe) console.log("activeTab", this.props.activeTab);
			if (showMe) console.log("triggers", this.props.triggers);
			for (const propName in this.props) {
				if (showMe) console.log("propName", propName);
				if (
					this.props[propName] == null ||
					typeof this.props[propName] == "undefined"
				)
					continue;

				// Update props when the values passed down are overridden at the root

				if (!ObservableSlim.isProxy(this.props[propName])) continue;
				const path = ObservableSlim.getPath(this.props[propName]);
				if (showMe) console.log("propName", propName, "path", path);

				this.__regie_observer_removers__.push(
					observe(path, (newValue: any): void => {
						this.props[propName] = newValue;
					})
				);
			}

			if (showMe) console.log(this.props["activeTab"]);
			if (showMe)
				console.log(ObservableSlim.getPath(this.props["activeTab"]));

			const methods = new Set<string>();

			let prototype = this.constructor.prototype;

			do {
				Object.getOwnPropertyNames(prototype).forEach(
					(m: string): Set<string> => methods.add(m)
				);
				prototype = Object.getPrototypeOf(prototype);
			} while (
				prototype != Component.prototype &&
				Object.getPrototypeOf(prototype)
			);

			const observeMethods = [...methods].filter((x: string): boolean =>
				x.startsWith("observe")
			);
			const mapStateMethods =
				(this.mapStateToProps && this.mapStateToProps()) || {};

			Object.keys(mapStateMethods).forEach((method: string): void => {
				const observeMethodsForMappedState = observeMethods.filter(
					(m: string): boolean => m.slice(8) == method
				);

				let observer;

				if (typeof mapStateMethods[method] == "string") {
					observer = (): any =>
						getByPath(state, mapStateMethods[method]);
				} else if (typeof mapStateMethods[method] == "function") {
					try {
						observer = mapStateMethods[method].bind(this, state);
					} catch (e: any) {
						console.log(e);
					}
				} else {
					throw new Error(
						`Invalid type '${typeof mapStateMethods[
							method
						]}' for '${method}'. mapStateToProps should return an object whose properties are either strings or functions.`
					);
				}

				let propValue: any;

				this.__regie_observer_removers__.push(
					observe(observer, (newValue: any, change: any): void => {
						propValue = newValue;
						observeMethodsForMappedState.forEach(
							(m: string): void => this[m](newValue, change)
						);
					})
				);

				propValue = observer.lastValue;

				Object.defineProperty(this.props, method, {
					get: (): any => propValue,
					set: (newValue: any): never => {
						throw new Error(
							`Refusing to update '${method}' to ${newValue}. Please use an action to update the state.`
						);
					}
				});
			});

			observeMethods.forEach((method: string): void => {
				const path = method.slice(8);
				if (showMe) console.log("observing path", path);

				const [firstPath, ...restPath] = path.split(".");
				if (showMe) console.log(mapStateMethods);

				if (path in mapStateMethods) {
					return;
				} else if (!(firstPath in this.props)) {
					throw new Error(
						`Trying to observe '${firstPath}' prop in the '${this.constructor.name}' component but it hasn't been passed down as a prop during instantiation.`
					);
				} else if (
					!(
						this.props[firstPath] &&
						ObservableSlim.isProxy(this.props[firstPath])
					)
				) {
					throw new Error(
						`You are passing down '${firstPath}' as a prop to the '${this.constructor.name}' component but it is a primitive value in the store and can't be passed down as a prop. Consider passing its parent object as a prop instead and you can still observe the primitive in the '${this.constructor.name}' component.`
					);
				}

				this.__regie_observer_removers__.push(
					observe(
						ObservableSlim.getPath(this.props[firstPath])
							.split(".")
							.concat(restPath)
							.join("."),
						this[method].bind(this)
					)
				);
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(window as any).showMe = false;
		};

		const originalDisconnected = Component.prototype.disconnectedCallback;

		Component.prototype.disconnectedCallback = function (): void {
			if (this.__regie_observer_removers__) {
				this.__regie_observer_removers__.forEach(
					(removeObserver: () => void): void => removeObserver()
				);
				this.__regie_observer_removers__ = [];
			}
			this.__regie_initialized__ = false;

			if (originalDisconnected) originalDisconnected.call(this);
		};
	};
