import { vec2, vec3, vec_add, vec_sub, vec_mul } from '../../../src/util/vector.js';
import { mat4x4_inv, mat4x4_transform, mat4x4_projection, mat4x4_lookat } from '../../../src/util/matrix.js';
import Boids from '../../../src/Boids.js';
import Canvas from '../../../src/dom/Canvas.js';
import Renderer from '../../../src/dom/Renderer.js';

import { StateActionTypes, RendererViewTypes } from './StateStore.js';

/**
 * @typedef {import('./StateStore.js').StateStore} StateStore
 * @typedef {import('./StateStore.js').UnsubscribeCallback} UnsubscribeCallback
 * @typedef {import('./StateStore.js').State} State
 * @typedef {import('./StateStore.js').StateAction} StateAction
 */

/**
 * A simulation manager.
 * @class
 */
class Manager {

    /**
     * A map of global state object paths to {@link Boids} properties.
     * @private
     * @static
     * @readonly
     * @type {Map<string, string>}
     */
    static BOIDS_PROPERTIES = new Map([
        ['boid.environment.accuracy', 'accuracy'],
        ['boid.environment.drag', 'drag'],
        ['boid.environment.randomness', 'randomness'],
        ['boid.interaction.radius', 'interactionRadius'],
        ['boid.interaction.alignmentForce', 'alignmentForce'],
        ['boid.interaction.alignmentBias', 'alignmentBias'],
        ['boid.interaction.cohesionForce', 'cohesionForce'],
        ['boid.interaction.separationForce', 'separationForce'],
        ['boid.interaction.steeringForce', 'steeringForce'],
        ['boid.interaction.minSpeed', 'minSpeed'],
        ['boid.interaction.maxSpeed', 'maxSpeed'],
        ['boid.bounds.min', 'minBounds'],
        ['boid.bounds.max', 'maxBounds']
    ]);

    /**
     * A map of global state object paths to {@link Renderer} properties.
     * @private
     * @static
     * @readonly
     * @type {Map<string, string>}
     */
    static RENDERER_PROPERTIES = new Map([
        ['renderer.projection.matrix', 'projection'],
        ['renderer.view.matrix', 'view'],
        ['renderer.options.boidScale', 'boidScale'],
        ['renderer.options.boidType', 'boidRenderingType'],
        ['renderer.options.renderRadius', 'renderInteractionRadius'],
        ['renderer.options.renderBounds', 'renderBounds'],
        ['renderer.options.renderTree', 'renderTree'],
        ['renderer.colors.boid.min', 'minBoidColor'],
        ['renderer.colors.boid.max', 'maxBoidColor'],
        ['renderer.colors.radiusColor', 'radiusColor'],
        ['renderer.colors.boundsColor', 'boundsColor'],
        ['renderer.colors.treeColor', 'treeColor']
    ]);

    /**
     * A map of global state object paths to a target object and its corresponding property.
     * Specifically used for updating vector properties.
     * @private
     * @static
     * @readonly
     * @type {Map<string, { target: string, prop: string }>}
     */
    static VECTOR_PROPERTIES = new Map([
        ['boid.bounds.min', { target: 'boids', prop: 'minBounds' }],
        ['boid.bounds.max', { target: 'boids', prop: 'maxBounds' }],
        ['renderer.view.manual.position', { target: 'renderer', prop: 'view' }],
        ['renderer.view.manual.rotation', { target: 'renderer', prop: 'view' }],
        ['renderer.colors.radiusColor', { target: 'renderer', prop: 'radiusColor' }],
        ['renderer.colors.boundsColor', { target: 'renderer', prop: 'boundsColor' }],
        ['renderer.colors.treeColor', { target: 'renderer', prop: 'treeColor' }]
    ]);

    /**
     * The global simulation state.
     * @private
     * @type {StateStore}
     */
    #store;

    /**
     * The callback created when subscribing to notifications from the global simulation state,
     * used to unsubscribe this object from state notifications.
     * @private
     * @type {UnsubscribeCallback}
     */
    #unsubscriber;

    /**
     * Whether this manager should automatically update properties upon receiving a relevant notification.
     * @private
     * @type {boolean}
     */
    #autoUpdate = true;

    /**
     * The reference to the current {@link Boids} object.
     * @private
     * @type {Boids}
     */
    #boids;

    /**
     * A collection of {@link Boids} properties to update upon invocation of {@link Manager.updateProperties()}.
     * Only used when `#autoUpdate` is `false`.
     * @private
     * @type {{ prop: string, value: any }[]}
     */
    #boidPropQueue = [];

    /**
     * The reference to the {@link Canvas} object.
     * @private
     * @type {Canvas}
     */
    #canvas;

    /**
     * The reference to the {@link Renderer} object.
     * @private
     * @type {Renderer}
     */
    #renderer;

    /**
     * A collection of {@link Renderer} properties to update upon invocation of {@link Manager.updateProperties()}.
     * Only used when `#autoUpdate` is `false`.
     * @private
     * @type {{ prop: string, value: any }[]}
     */
    #rendererPropQueue = [];

    /**
     * A collection of callbacks to invoke upon invocation of {@link Manager.updateProperties()}.
     * Only used when `#autoUpdate` is `false`.
     * @private
     * @type {(() => void)[]}
     */
    #actionQueue = [];

    /**
     * Whether the user is currently inputting one touch point (used to manage orbit view controls).
     * Only used when the user is interacting with the application using a touch-enabled display.
     * @private
     * @type {boolean}
     */
    #isTouchDragging = false;

    /**
     * The previous touch points retrieved by input listeners (used to manage orbit view controls).
     * Only used when the user is interacting with the application using a touch-enabled display.
     * @private
     * @type {TouchList|null}
     */
    #lastTouches = null;

    /**
     * Creates a new simulation manager.
     * @constructor
     * @param {HTMLCanvasElement|string} element - The {@link HTMLCanvasElement} or valid CSS query string referencing a {@link HTMLCanvasElement} to render the simulation to.
     * @param {StateStore} store - The global simulation state store to reference and update.
     * @param {boolean} [autoUpdate=true] - Whether the simulation should automatically respond to notifications from the global state store.
     * @param {boolean} [autoResize=true] - Whether the {@link HTMLCanvasElement} should automatically resize to fill its parent element.
     */
    constructor(element, store, autoUpdate=true, autoResize=true) {
        this.#store = store;
        this.#unsubscriber = store.subscribe(this._notified.bind(this));
        this.#autoUpdate = autoUpdate;
        this.#canvas = new Canvas(element, autoResize);
        this.#initBoids(store.state);
        this.#boids.init();
        this.#renderer = new Renderer(
            this.#canvas,
            this.#boids,
            ...Array.from(Manager.RENDERER_PROPERTIES.keys()).map(p => store.get(p))
        );
        if (!this.#store.state.simulation.running) requestAnimationFrame(this.#renderer.render.bind(this.#renderer));

        this.#canvas.element.addEventListener('mousedown', this._onmousedown.bind(this));
        this.#canvas.element.addEventListener('mouseup', this._onmouseup.bind(this));
        this.#canvas.element.addEventListener('mouseleave', this._onmouseup.bind(this));
        this.#canvas.element.addEventListener('mousemove', this._onmousemove.bind(this));
        this.#canvas.element.addEventListener('wheel', this._onwheel.bind(this));
        this.#canvas.element.addEventListener('touchstart', this._ontouchstart.bind(this), { passive: false });
        this.#canvas.element.addEventListener('touchmove', this._ontouchmove.bind(this), { passive: false });
        this.#canvas.element.addEventListener('touchend', this._ontouchend.bind(this), { passive: false });

        /**
         * A callback invoked when the `#canvas` resizes.
         * Used to update the `#renderer`'s projection matrix, 
         * and if the simulation is paused, renders a new frame.
         * @returns {void}
         */
        const oncanvasresize = () => {
            this.#store.dispatch({ type: StateActionTypes.SET, path: 'renderer.projection.aspect', payload: this.#canvas.width / this.#canvas.height });
            if (this.#renderer && !this.#store.state.simulation.running) requestAnimationFrame(this.#renderer.render.bind(this.#renderer));
        }
        this.#canvas.addEventListener('resize', oncanvasresize.bind(this));
        oncanvasresize();
    }

    /**
     * Whether this {@link Manager} should automatically respond to notifications of state changes.
     * @public
     * @type {boolean}
     */
    get autoUpdate() { return this.#autoUpdate; }

    /**
     * Whether this {@link Manager} should automatically respond to notifications of state changes.
     * @public
     * @param {boolean} u
     */
    set autoUpdate(u) { this.#autoUpdate = u; }

    /**
     * Initializes the {@link Boids} object.
     * @private
     * @param {State} state - The current state to reference.
     * @returns {void}
     */
    #initBoids(state) {
        this.#boids = new Boids(
            state.boid.environment.count,
            state.boid.environment.accuracy,
            state.boid.environment.drag,
            state.boid.environment.randomness,
            state.boid.interaction.radius,
            state.boid.interaction.alignmentForce,
            state.boid.interaction.alignmentBias,
            state.boid.interaction.cohesionForce,
            state.boid.interaction.separationForce,
            state.boid.interaction.steeringForce,
            state.boid.interaction.minSpeed,
            state.boid.interaction.maxSpeed,
            state.boid.bounds.min,
            state.boid.bounds.max
        );
        this.#boids.init();
        if (this.#renderer) {
            this.#renderer.boids = this.#boids;
            if (!state.simulation.running) requestAnimationFrame(this.#renderer.render.bind(this.#renderer));
        }
    }

    /**
     * Updates the simulation.
     * @public
     * @param {number} dt - The elapsed time since the previous frame (in seconds).
     * @returns {void}
     */
    update(dt) {
        if (this.#boids) {
            this.#boids.step(dt);
            this.#renderer.render();
        }
    }

    /**
     * Updates the properties of the objects managed by this {@link Manager}.
     * Should only be invoked when {@link Manager.autoUpdate} is `false`.
     * @public
     * @returns {void}
     */
    updateProperties() {
        for (const a of this.#actionQueue) a();
        this.#actionQueue = [];
        for (const e of this.#boidPropQueue) this.#boids[e.prop] = e.value;
        this.#boidPropQueue = [];
        for (const e of this.#rendererPropQueue) this.#renderer[e.prop] = e.value;
        this.#rendererPropQueue = [];
        if (!this.#store.state.simulation.running) requestAnimationFrame(this.#renderer.render.bind(this.#renderer));
    }

    /**
     * Unsubscribes this {@link Manager} from notifications of state changes.
     * @public
     * @returns {void}
     */
    unsubscribe() {
        this.#unsubscriber();
        this.#unsubscriber = null;
    }

    /**
     * Invoked when the {@link StateStore} this {@link Manager} is subscribed to emits an event.
     * @protected
     * @param {State} state - The current state.
     * @param {StateAction} action - The action that created this event.
     * @returns {void}
     * @throws {ReferenceError} If the `action.path` references a path not defined in {@link Manager.BOIDS_PROPERTIES}, {@link Manager.RENDERER_PROPERTIES}, or {@link Manager.VECTOR_PROPERTIES}.
     */
    _notified(state, action) {
        if (action.type === StateActionTypes.SET) {
            
            let base_path = action.path;
            let prop_data = null;

            // check if path is vector component
            const vector_prop_path = Array.from(Manager.VECTOR_PROPERTIES.keys()).find(p => action.path.startsWith(p));
            if (vector_prop_path) {
                base_path = vector_prop_path;
                prop_data = Manager.VECTOR_PROPERTIES.get(base_path);
            }
            // if not vector, check other properties
            else if (Manager.BOIDS_PROPERTIES.has(action.path)) prop_data = { target: 'boids', prop: Manager.BOIDS_PROPERTIES.get(action.path) };
            else if (Manager.RENDERER_PROPERTIES.has(action.path)) prop_data = { target: 'renderer', prop: Manager.RENDERER_PROPERTIES.get(action.path) };

            // handle updates based on property data
            if (prop_data) {
                if (base_path.startsWith('boid.bounds.')) {
                    // update orbit view target
                    if (state.renderer.view.type === RendererViewTypes.ORBIT) {
                        const min = state.boid.bounds.min, max = state.boid.bounds.max;
                        const size = vec_sub(max, min);
                        state.renderer.view.orbit.target = vec_add(min, vec_mul(size, 0.5));
                        if (this.#autoUpdate) this.updateOrbitViewMatrix();
                        else this.#actionQueue.push(() => this.updateOrbitViewMatrix());
                    }
                }
                // update manual view
                else if (base_path.startsWith('renderer.view.manual.')) {
                    if (this.#autoUpdate) this.updateManualViewMatrix();
                    else this.#actionQueue.push(() => this.updateManualViewMatrix());
                    return;
                }

                // workaround; hash-prefixed (private) properties cannot be accessed using object index syntax
                const target_obj = prop_data.target === 'boids' ? this.#boids : (prop_data.target === 'renderer' ? this.#renderer : undefined);
                if (!target_obj) throw new ReferenceError(`Unknown property target '${prop_data.target}'.`);
                const prop_name = prop_data.prop;
                const updated_value = this.#store.get(base_path);

                if (this.#autoUpdate) {
                    target_obj[prop_name] = updated_value;
                    if (!state.simulation.running) requestAnimationFrame(this.#renderer.render.bind(this.#renderer));
                }
                else {
                    if (prop_data.target === 'boids') this.#boidPropQueue.push({ prop: prop_name, value: updated_value });
                    else if (prop_data.target === 'renderer') this.#rendererPropQueue.push({ prop: prop_name, value: updated_value });
                }
            }
            else if (action.path === 'boid.environment.count') {
                if (this.#autoUpdate) this.#initBoids(state);
                else this.#actionQueue.push(() => this.#initBoids(state));
            }
            else if (action.path.includes('renderer.projection.')) {
                const subpath = action.path.replace('renderer.projection.', '');
                if (subpath === 'fov' || subpath === 'near' || subpath === 'far' || subpath === 'aspect') {
                    const mat = mat4x4_projection(
                        state.renderer.projection.fov,
                        state.renderer.projection.aspect,
                        state.renderer.projection.near,
                        state.renderer.projection.far
                    );
                    if (this.#autoUpdate) this.#store.dispatch({ type: StateActionTypes.SET, path: 'renderer.projection.matrix', payload: mat });
                    else this.#rendererPropQueue.push({ prop: 'projection', value: mat });
                }
                else if (subpath === 'matrix') {
                    if (this.#autoUpdate) {
                        this.#renderer.projection = action.payload;
                        if (!state.simulation.running) requestAnimationFrame(this.#renderer.render.bind(this.#renderer));
                    }
                    else this.#rendererPropQueue.push({ prop: 'projection', value: state.renderer.projection.matrix });
                }
            }
            else if (action.path === 'renderer.view.type' || action.path === 'renderer.view.matrix') {
                if (action.path === 'renderer.view.type') {
                    switch (this.#store.state.renderer.view.type) {
                        case RendererViewTypes.ORBIT:
                            this.#canvas.element.style.cursor = 'grab';
                            break;
                        case RendererViewTypes.MANUAL:
                        default:
                            this.#canvas.element.style.cursor = 'default';
                            break;
                    }
                    if (this.#store.state.renderer.view.type === RendererViewTypes.ORBIT) this.#canvas.element.style.cursor = 'grab';
                    
                }
                if (this.#autoUpdate) {
                    if (state.renderer.view.type === RendererViewTypes.MANUAL) this.updateManualViewMatrix();
                    else this.updateOrbitViewMatrix();
                }
                else this.#rendererPropQueue.push({ prop: 'view', value: state.renderer.view.matrix });
            }
        }
    }

    /**
     * A callback invoked when a `mousedown` event occurs on the `#canvas`.
     * Used to update the orbit view controls.
     * @protected
     * @param {MouseEvent} e - The `mousedown` event.
     * @returns {void}
     */
    _onmousedown(e) {
        if (this.#store.state.renderer.view.type === RendererViewTypes.ORBIT) {
            this.#store.state.renderer.view.orbit.isDragging = true;
            vec2(e.clientX, e.clientY, this.#store.state.renderer.view.orbit.lastMouse);
            this.#canvas.element.style.cursor = 'grabbing';
        }
    }

    /**
     * A callback invoked when a `mouseup` or `mouseleave` event occurs on the `#canvas`.
     * Used to update the orbit view controls.
     * @protected
     * @param {MouseEvent} _ - The `mouseup` or `mouseleave` event.
     * @returns {void}
     */
    _onmouseup(_) {
        this.#store.state.renderer.view.orbit.isDragging = false;
        if (this.#store.state.renderer.view.type === RendererViewTypes.ORBIT) this.#canvas.element.style.cursor = 'grab';
    }

    /**
     * A callback invoked when a `mousemove` event occurs on the `#canvas`.
     * Used to update the orbit view controls.
     * @protected
     * @param {MouseEvent} e - The `mousemove` event.
     * @returns {void}
     */
    _onmousemove(e) {
        if (this.#store.state.renderer.view.type === RendererViewTypes.ORBIT && this.#store.state.renderer.view.orbit.isDragging) {
            const mouse = vec2(e.clientX, e.clientY);
            const delta = vec_sub(mouse, this.#store.state.renderer.view.orbit.lastMouse);
            const sensitivity = this.#store.state.renderer.view.orbit.sensitivity;
            const rot = vec_add(this.#store.state.renderer.view.orbit.rotation, vec2(delta[1] * sensitivity, delta[0] * sensitivity));
            const maxPitch = Math.PI * 0.5 - 1e-2;
            rot[0] = Math.min(Math.max(rot[0], -maxPitch), maxPitch);
            this.#store.state.renderer.view.orbit.rotation = rot;
            this.#store.state.renderer.view.orbit.lastMouse = mouse;
            this.updateOrbitViewMatrix();
        }
    }

    /**
     * A callback invoked when a `wheel` event occurs on the `#canvas`.
     * Used to update the orbit view controls.
     * @protected
     * @param {WheelEvent} e - The `wheel` event.
     * @returns {void}
     */
    _onwheel(e) {
        if (this.#store.state.renderer.view.type === RendererViewTypes.ORBIT) {
            this.#store.state.renderer.view.orbit.distance += e.deltaY * 1e-2;
            this.#store.state.renderer.view.orbit.distance = Math.max(1, this.#store.state.renderer.view.orbit.distance);
            this.updateOrbitViewMatrix();
            e.preventDefault();
        }
    }

    /**
     * A callback invoked when a `touchstart` event occurs on the `#canvas`.
     * Used to update the orbit view controls on a touch-enabled display.
     * @protected
     * @param {TouchEvent} e - The `touchstart` event.
     * @returns {void}
     */
    _ontouchstart(e) {
        if (this.#store.state.renderer.view.type !== RendererViewTypes.ORBIT) return;
        if (e.touches.length === 1) { // rotate
            this.#isTouchDragging = true;
            vec2(e.touches[0].clientX, e.touches[0].clientY, this.#store.state.renderer.view.orbit.lastMouse);
            this.#canvas.element.style.cursor = 'grabbing';
        }
        this.#lastTouches = e.touches;
        e.preventDefault();
    }

    /**
     * A callback invoked when a `touchmove` event occurs on the `#canvas`.
     * Used to update the orbit view controls on a touch-enabled display.
     * @protected
     * @param {TouchEvent} e - The `touchmove` event.
     * @returns {void}
     */
    _ontouchmove(e) {
        if (this.#store.state.renderer.view.type !== RendererViewTypes.ORBIT) return;
        if (e.touches.length === 1 && this.#isTouchDragging) { // rotate
            const touch = e.touches[0];
            const mouse = vec2(touch.clientX, touch.clientY);
            const delta = vec_sub(mouse, this.#store.state.renderer.view.orbit.lastMouse);
            const sensitivity = this.#store.state.renderer.view.orbit.sensitivity;
            const rot = vec_add(this.#store.state.renderer.view.orbit.rotation, vec2(delta[1] * sensitivity, delta[0] * sensitivity));
            const maxPitch = Math.PI * 0.5 - 1e-2;
            rot[0] = Math.min(Math.max(rot[0], -maxPitch), maxPitch);
            this.#store.state.renderer.view.orbit.rotation = rot;
            this.#store.state.renderer.view.orbit.lastMouse = mouse;
            this.updateOrbitViewMatrix();
        }
        else if (e.touches.length === 2 && this.#lastTouches && this.#lastTouches.length === 2) { // zoom
            const [t0, t1] = e.touches;
            const [lt0, lt1] = this.#lastTouches;

            const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            const lastDist = Math.hypot(lt1.clientX - lt0.clientX, lt1.clientY - lt0.clientY);

            const zoomDelta = (lastDist - dist) * 0.1;
            this.#store.state.renderer.view.orbit.distance += zoomDelta;
            this.#store.state.renderer.view.orbit.distance = Math.max(1, this.#store.state.renderer.view.orbit.distance);
            this.updateOrbitViewMatrix();
        }
        this.#lastTouches = e.touches;
        e.preventDefault();
    }

    /**
     * A callback invoked when a `touchend` event occurs on the `#canvas`.
     * Used to update the orbit view controls on a touch-enabled display.
     * @protected
     * @param {TouchEvent} e - The `touchend` event.
     * @returns {void}
     */
    _ontouchend(e) {
        if (e.touches.length === 0) {
            this.#isTouchDragging = false;
            this.#canvas.element.style.cursor = 'grab';
        }
        this.#lastTouches = e.touches;
    }

    /**
     * Updates the manually-controlled view matrix of this {@link Renderer}.
     * @public
     * @returns {void}
     */
    updateManualViewMatrix() {
        this.#store.state.renderer.view.matrix = mat4x4_inv(mat4x4_transform(this.#store.state.renderer.view.manual.position, this.#store.state.renderer.view.manual.rotation, vec3(1, 1, 1)));
        this.#renderer.view = this.#store.state.renderer.view.matrix;
        if (!this.#store.state.simulation.running) requestAnimationFrame(this.#renderer.render.bind(this.#renderer));
    }

    /**
     * Updates the orbit-controlled view matrix of this {@link Renderer}.
     * @public
     * @returns {void}
     */
    updateOrbitViewMatrix() {
        const { target, distance } = this.#store.state.renderer.view.orbit;
        const { 0: pitch, 1: yaw } = this.#store.state.renderer.view.orbit.rotation;
        const cpitch = Math.cos(pitch);
        this.#store.state.renderer.view.orbit.position = vec3(
            target[0] + distance * cpitch * Math.sin(yaw),
            target[1] + distance * Math.sin(pitch),
            target[2] + distance * cpitch * Math.cos(yaw)
        );
        this.#store.state.renderer.view.matrix = mat4x4_lookat(this.#store.state.renderer.view.orbit.position, target);
        this.#renderer.view = this.#store.state.renderer.view.matrix;
        if (!this.#store.state.simulation.running) requestAnimationFrame(this.#renderer.render.bind(this.#renderer));
    }

}

export default Manager;