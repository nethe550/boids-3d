import { vec_lerp, vec3_color_hex } from '../../../src/util/vector.js';
import { StateStore, StateActionTypes, RendererViewTypes } from './StateStore.js';
import Manager from './Manager.js';
import UI from './UI.js';
import Boids from '../../../src/Boids.js';

/**
 * @template T
 * @typedef {import('./UI.js').UIChangeEvent<T>} UIChangeEvent
 * @typedef {import('../../../src/util/vector.js').Vector3} Vector3
 */

// ================================================== //

/**
 * The global simulation state.
 * @type {StateStore}
 */
const store = new StateStore();

/**
 * The simulation manager.
 * @type {Manager}
 */
const manager = new Manager('#display', store, UI.simulation.input.autoUpdate.read(), true);

/**
 * The identifier of the previous frame request.
 * @type {number}
 */
let loopID = -1;

/**
 * The time (in seconds) elapsed since the simulation was started.
 * @type {number}
 */
let elapsed = 0;

/**
 * The maximum number of TPS (ticks per second) samples to be stored.
 * Used to compute a moving average of the current TPS.
 * @const {number}
 */
const tpsHistorySize = 60;

/**
 * A collection of previously-collected TPS (ticks per second) samples.
 * Used to compute a moving average of the current TPS.
 * @const {number[]}
 */
const tpsHistory = [];

/**
 * The sum of all collected TPS (ticks per second) samples.
 * Used to compute a moving average of the current TPS.
 * @type {number}
 */
let tpsSum = 0;

/**
 * The timestamp of the previous update (in milliseconds).
 * @type {number}
 */
let prevUpdate = performance.now();

/**
 * Updates per-frame UI information.
 * @returns {void}
 */
const renderUI = () => {
    UI.simulation.output.tps.write(Math.round(tpsSum / tpsHistory.length));
    const secs = (Math.floor(elapsed) % 60).toString().padStart(2, '0');
    const mins = (Math.floor(elapsed / 60) % 60).toString().padStart(2, '0');
    const hrs = Math.floor(elapsed / 3600).toString();
    UI.simulation.output.elapsed.write(`${hrs}:${mins}:${secs}`);
};

/**
 * The primary simulation update loop.
 * @returns {void}
 */
const updateloop = () => {
    const now = performance.now();
    const dt = (now - prevUpdate) * 1e-3; // ms -> s
    elapsed += dt;

    const currentTPS = 1 / dt;
    tpsHistory.push(currentTPS);
    tpsSum += currentTPS;
    if (tpsHistory.length > tpsHistorySize) tpsSum -= tpsHistory.shift();
    
    manager.update(dt);
    renderUI();

    prevUpdate = now;
    loopID = requestAnimationFrame(updateloop);
};

/**
 * Starts the simulation update loop.
 * @returns {void}
 */
const start = () => {
    if (loopID === -1) {
        loopID = requestAnimationFrame(updateloop);
        UI.simulation.output.state.write('Playing');
    }
};

/**
 * Stops the simulation update loop.
 * @returns {void}
 */
const stop = () => {
    cancelAnimationFrame(loopID);
    loopID = -1;
    elapsed = 0;
    UI.simulation.output.state.write('Paused');
    UI.simulation.output.elapsed.write('0:00:00');
    UI.simulation.output.tps.write('0');
};

/**
 * @template T
 * @typedef {(v: T) => T} UpdatePayloadProcessor A processor for a {@link UIChangeEvent}'s payload.
 */

/**
 * Dispatches a {@link StateActionTypes.SET} event that updates a value in the state {@link store}.
 * @template T The type of data to dispatch.
 * @param {UIChangeEvent<T>} e - The {@link UIChangeEvent} that holds the data to dispatch.
 * @param {string} path - The state object path to the value to update.
 * @param {UpdatePayloadProcessor<T>} processor - The processor used when dispatching the {@link UIChangeEvent} value.
 * @returns {void}
 */
const dispatchUpdate = (e, path, processor=(v) => v) => store.dispatch({ type: StateActionTypes.SET, path: path, payload: processor(e.detail.value) });

/**
 * Dispatches {@link StateActionTypes.SET} events that updates a vector in the state {@link store} determined by the component indices provided.
 * @template T The type of data to dispatch.
 * @param {UIChangeEvent<T>} e - The {@link UIChangeEvent} that holds the data to dispatch.
 * @param {string} path - The state object path to the vector to update.
 * @param {...number} components - The components in the event to dispatch events for.
 * @returns {void}
 * @throws {RangeError} If the payload of the {@link UIChangeEvent} is not a vector.
 * @throws {RangeError} If the payload of the {@link UIChangeEvent} contains fewer elements than the provided `components` array.
 */
const dispatchVectorUpdate = (e, path, ...components) => {
    if (components.length === 0) return;
    if (!Array.isArray(e.detail.value) || e.detail.value.length < components.length) throw new RangeError(`Event data is not a vector or does not contain enough components for requested operation.`);
    for (const comp of components) {
        store.dispatch({ type: StateActionTypes.SET, path: `${path}[${comp}]`, payload: e.detail.value[comp] });
    }
};

/**
 * Converts an angle `deg` in degrees to radians.
 * @param {number} deg - The angle in degrees.
 * @returns {number} The angle in radians.
 */
const deg2rad = deg => (deg * Math.PI) / 180;

/**
 * Creates a CSS `linear-gradient` between two colors in regular discrete steps.
 * @param {Vector3} min - The first color.
 * @param {Vector3} max - The second color.
 * @param {number} steps - The number of discrete steps.
 * @returns {string} The CSS linear gradient.
 */
const steppedColorGradient = (min, max, steps) => {
    if (steps <= 0) return `linear-gradient(90deg, ${vec3_color_hex(min)} 0%, ${vec3_color_hex(min)} 100%)`;
    const colorStops = [];
    const stepSize = 100 / steps;
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const color = vec_lerp(min, max, t);
        const hex = vec3_color_hex(color);
        const start = i * stepSize;
        const end = (i + 1) * stepSize;
        colorStops.push(`${hex} ${start.toFixed(2)}%`);
        colorStops.push(`${hex} ${end.toFixed(2)}%`);
    }
    return `linear-gradient(90deg, ${colorStops.join(', ')})`;
};

/**
 * Binds the UI elements from the {@link UI} object to the simulation state and its functions.
 * @returns {void}
 */
const bindUI = () => {
    // boid
    UI.boids.environment.bounds.min.x.addEventListener('change', e => {
        e.detail.value = Math.min(Math.max(e.detail.value, UI.boids.environment.bounds.min.x.min), UI.boids.environment.bounds.max.x.read() - Boids.BOUNDS_EPSILON);
        UI.boids.environment.bounds.min.x.write(e.detail.value);
        dispatchUpdate(e, 'boid.bounds.min[0]');
    });
    UI.boids.environment.bounds.min.y.addEventListener('change', e => {
        e.detail.value = Math.min(Math.max(e.detail.value, UI.boids.environment.bounds.min.y.min), UI.boids.environment.bounds.max.y.read() - Boids.BOUNDS_EPSILON);
        UI.boids.environment.bounds.min.y.write(e.detail.value);
        dispatchUpdate(e, 'boid.bounds.min[1]');
    });
    UI.boids.environment.bounds.min.z.addEventListener('change', e => {
        e.detail.value = Math.min(Math.max(e.detail.value, UI.boids.environment.bounds.min.z.min), UI.boids.environment.bounds.max.z.read() - Boids.BOUNDS_EPSILON);
        UI.boids.environment.bounds.min.z.write(e.detail.value);
        dispatchUpdate(e, 'boid.bounds.min[2]');
    });
    UI.boids.environment.bounds.max.x.addEventListener('change', e => {
        e.detail.value = Math.min(Math.max(e.detail.value, UI.boids.environment.bounds.min.x.read() + Boids.BOUNDS_EPSILON), UI.boids.environment.bounds.max.x.max);
        UI.boids.environment.bounds.max.x.write(e.detail.value);
        dispatchUpdate(e, 'boid.bounds.max[0]');
    });
    UI.boids.environment.bounds.max.y.addEventListener('change', e => {
        e.detail.value = Math.min(Math.max(e.detail.value, UI.boids.environment.bounds.min.y.read() + Boids.BOUNDS_EPSILON), UI.boids.environment.bounds.max.y.max);
        UI.boids.environment.bounds.max.y.write(e.detail.value);
        dispatchUpdate(e, 'boid.bounds.max[1]');
    });
    UI.boids.environment.bounds.max.z.addEventListener('change', e => {
        e.detail.value = Math.min(Math.max(e.detail.value, UI.boids.environment.bounds.min.z.read() + Boids.BOUNDS_EPSILON), UI.boids.environment.bounds.max.z.max);
        UI.boids.environment.bounds.max.z.write(e.detail.value);
        dispatchUpdate(e, 'boid.bounds.max[2]');
    });
    UI.boids.environment.count.addEventListener('change', e => dispatchUpdate(e, 'boid.environment.count'));
    UI.boids.environment.accuracy.addEventListener('change', e => dispatchUpdate(e, 'boid.environment.accuracy'));
    UI.boids.environment.drag.addEventListener('change', e => dispatchUpdate(e, 'boid.environment.drag'));
    UI.boids.environment.randomness.addEventListener('change', e => dispatchUpdate(e, 'boid.environment.randomness'));
    UI.boids.interaction.radius.addEventListener('change', e => dispatchUpdate(e, 'boid.interaction.radius'));
    UI.boids.interaction.alignment.force.addEventListener('change', e => dispatchUpdate(e, 'boid.interaction.alignmentForce'));
    UI.boids.interaction.alignment.bias.addEventListener('change', e => dispatchUpdate(e, 'boid.interaction.alignmentBias'));
    UI.boids.interaction.cohesion.addEventListener('change', e => dispatchUpdate(e, 'boid.interaction.cohesionForce'));
    UI.boids.interaction.separation.addEventListener('change', e => dispatchUpdate(e, 'boid.interaction.separationForce'));
    UI.boids.interaction.steering.addEventListener('change', e => dispatchUpdate(e, 'boid.interaction.steeringForce'));
    UI.boids.interaction.speed.min.addEventListener('change', e => dispatchUpdate(e, 'boid.interaction.minSpeed'));
    UI.boids.interaction.speed.max.addEventListener('change', e => dispatchUpdate(e, 'boid.interaction.maxSpeed'));

    // simulation
    UI.simulation.input.state.addEventListener('change', e => {
        const running = e.detail.value === 'sim-start';
        store.dispatch({ type: StateActionTypes.SET, path: 'simulation.running', payload: running });
        if (running) start();
        else stop();
    });
    UI.simulation.input.autoUpdate.addEventListener('change', e => manager.autoUpdate = e.detail.value);
    UI.simulation.input.update.addEventListener('click', manager.updateProperties.bind(manager));

    // renderer
    UI.projection.fov.addEventListener('change', e => dispatchUpdate(e, 'renderer.projection.fov'));
    UI.projection.near.addEventListener('change', e => dispatchUpdate(e, 'renderer.projection.near'));
    UI.projection.far.addEventListener('change', e => dispatchUpdate(e, 'renderer.projection.far'));
    
    /** @type {HTMLDivElement} */
    const manualViewControls = document.querySelector('fieldset.control[data-name="view"] div.control-grid[data-type="vector"]');
    UI.view.state.addEventListener('change', e => {
        const manual = e.detail.value === RendererViewTypes.MANUAL;
        manualViewControls.style.display = manual ? 'grid' : 'none';
        dispatchUpdate(e, 'renderer.view.type');
    });
    const viewState = UI.view.state.active.name;
    store.dispatch({ type: StateActionTypes.SET, path: 'renderer.view.type', payload: viewState });
    if (viewState === RendererViewTypes.MANUAL) manager.updateManualViewMatrix();
    else manager.updateOrbitViewMatrix();

    UI.view.position.x.addEventListener('change', e => dispatchUpdate(e, 'renderer.view.manual.position[0]'));
    UI.view.position.y.addEventListener('change', e => dispatchUpdate(e, 'renderer.view.manual.position[1]'));
    UI.view.position.z.addEventListener('change', e => dispatchUpdate(e, 'renderer.view.manual.position[2]'));
    UI.view.rotation.pitch.addEventListener('change', e => dispatchUpdate(e, 'renderer.view.manual.rotation[0]', deg2rad));
    UI.view.rotation.yaw.addEventListener('change', e => dispatchUpdate(e, 'renderer.view.manual.rotation[1]', deg2rad));
    UI.view.rotation.roll.addEventListener('change', e => dispatchUpdate(e, 'renderer.view.manual.rotation[2]', deg2rad));
    UI.rendering.boidScale.addEventListener('change', e => dispatchUpdate(e, 'renderer.options.boidScale'));
    UI.rendering.boidRendering.addEventListener('change', e => dispatchUpdate(e, 'renderer.options.boidType'));
    UI.rendering.renderInteractionRadius.addEventListener('change', e => dispatchUpdate(e, 'renderer.options.renderRadius'));
    UI.rendering.renderBounds.addEventListener('change', e => dispatchUpdate(e, 'renderer.options.renderBounds'));
    UI.rendering.renderTree.addEventListener('change', e => dispatchUpdate(e, 'renderer.options.renderTree'));

    /** @type {HTMLDivElement} */
    const boidColorGradient = document.querySelector('div.color-gradient#boid-color-gradient');
    UI.rendering.boidColor.min.addEventListener('change', e => {
        dispatchUpdate(e, 'renderer.colors.boid.min');
        boidColorGradient.style.background = steppedColorGradient(e.detail.value, store.state.renderer.colors.boid.max, store.state.boid.environment.accuracy);
    });
    UI.rendering.boidColor.max.addEventListener('change', e => {
        dispatchUpdate(e, 'renderer.colors.boid.max');
        boidColorGradient.style.background = steppedColorGradient(store.state.renderer.colors.boid.min, e.detail.value, store.state.boid.environment.accuracy);
    });
    boidColorGradient.style.background = steppedColorGradient(store.state.renderer.colors.boid.min, store.state.renderer.colors.boid.max, store.state.boid.environment.accuracy);

    UI.rendering.radiusColor.color.addEventListener('change', e => dispatchVectorUpdate(e, 'renderer.colors.radiusColor', 0, 1, 2));
    UI.rendering.radiusColor.alpha.addEventListener('change', e => dispatchUpdate(e, 'renderer.colors.radiusColor[3]'));
    UI.rendering.boundsColor.color.addEventListener('change', e => dispatchVectorUpdate(e, 'renderer.colors.boundsColor', 0, 1, 2));
    UI.rendering.boundsColor.alpha.addEventListener('change', e => dispatchUpdate(e, 'renderer.colors.boundsColor[3]'));
    UI.rendering.treeColor.color.addEventListener('change', e => dispatchVectorUpdate(e, 'renderer.colors.treeColor', 0, 1, 2));
    UI.rendering.treeColor.alpha.addEventListener('change', e => dispatchUpdate(e, 'renderer.colors.treeColor[3]'));
};

bindUI();