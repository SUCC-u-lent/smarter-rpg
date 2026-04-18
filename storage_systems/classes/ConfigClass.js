import Connectivity from "./ConnectivityClass";

export default class Config {
    #connectivity;
    #enabled;
    #statMode;
    constructor() {
        this.#connectivity = new Connectivity();
        this.#enabled = false;
        this.#statMode = "normal"; // normal, crazy, wild
        // Normal stat mode = Constrained to defined profile stats
        // Crazy stat mode = Constrained to any profile stats even ones its not assigned to
        // Wild stat mode = AI Unhinged unleashed. AI can create and use any stat it wants with no constraints.
    }
}