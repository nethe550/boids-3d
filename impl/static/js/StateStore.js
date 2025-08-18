import { vec2, vec3, vec4 } from '../../../src/util/vector.js';
import { mat4x4_inv, mat4x4_transform, mat4x4_projection } from '../../../src/util/matrix.js';

/**
 * @typedef {import('../../../src/util/vector.js').Vector2} Vector2
 * @typedef {import('../../../src/util/vector.js').Vector3} Vector3
 * @typedef {import('../../../src/util/vector.js').Vector4} Vector4
 * @typedef {import('../../../src/util/matrix.js').Matrix4x4} Matrix4x4
 */

/**
 * @typedef {Object} Bounds3D A three-dimensional rectangular prism.
 * @property {Vector3} min - The minimum bounds.
 * @property {Vector3} max - The maximum bounds.
 */

/**
 * @typedef {Object} BoidEnvironmentState The boid environment state.
 * @property {number} count - The number of boids.
 * @property {number} accuracy - The maximum number of neighbors considered in integration.
 * @property {number} drag - The resistance to motion applied every integration step.
 * @property {number} randomness - The magnitude of random motion applied every integration step.
 */

/**
 * @typedef {Object} BoidInteractionState The boid interaction state.
 * @property {number} radius - The boid interaction radius.
 * @property {number} alignmentForce - The boid alignment force.
 * @property {number} alignmentBias - The boid alignment bias.
 * @property {number} cohesionForce - The boid cohesion force.
 * @property {number} separationForce - The boid separation force.
 * @property {number} steeringForce - The boid steering force.
 * @property {number} minSpeed - The minimum boid speed.
 * @property {number} maxSpeed - The maximum boid speed.
 */

/**
 * @typedef {Object} BoidState The boid state.
 * @property {Bounds3D} bounds - The boid bounding volume.
 * @property {BoidEnvironmentState} environment - The boid environment state.
 * @property {BoidInteractionState} interaction - The boid interaction state.
 */

/**
 * @typedef {Object} SimulationState The simulation state.
 * @property {boolean} running - Whether the simulation is running.
 */

/**
 * @typedef {Object} RendererProjectionState The renderer projection matrix state.
 * @property {number} fov - The field of view (radians) of the projection.
 * @property {number} near - The frustum near plane of the projection.
 * @property {number} far - The frustum far plane of the projection.
 * @property {number} aspect - The aspect ratio of the projection matrix.
 * @property {Matrix4x4} matrix - The projection matrix.
 */

/**
 * @typedef {('orbit'|'manual')} RendererViewType A type of renderer view control.
 */ 

/** 
 * An enumeration of renderer view methods.
 * @public
 * @readonly
 * @enum {RendererViewType}
 */
const RendererViewTypes = {
    /** @readonly @type {'orbit'}  @default */ ORBIT: 'orbit',
    /** @readonly @type {'manual'} @default */ MANUAL: 'manual'
};

/**
 * @typedef {Object} RendererViewOrbitState The renderer view orbit state.
 * @property {Vector3} position - The orbit view position.
 * @property {Vector2} rotation - The orbit view rotation (pitch, yaw).
 * @property {Vector3} target - The point to orbit around.
 * @property {number} distance - The orbit distance from the target.
 * @property {number} sensitivity - The sensitivity of the orbit controls.
 * @property {boolean} isDragging - Whether the mouse is currently being dragged.
 * @property {Vector2} lastMouse - The last known mouse position.
 */

/**
 * @typedef {Object} RendererViewManualState The renderer view manual state.
 * @property {Vector3} position - The manual view position.
 * @property {Vector3} rotation - The manual view rotation (pitch, yaw, roll).
 */

/**
 * @typedef {Object} RendererViewState The renderer view matrix state.
 * @property {RendererViewType} type - The type of view control.
 * @property {RendererViewOrbitState} orbit - The orbit view state.
 * @property {RendererViewManualState} manual - The manual view state.
 * @property {Matrix4x4} matrix - The view matrix.
 */

/**
 * @typedef {('tetrahedron'|'billboard'|'none')} BoidRenderingType A type of boid model rendering.
 */

/** 
 * An enumeration of boid rendering methods.
 * @public
 * @readonly
 * @enum {BoidRenderingType}
 */
const BoidRenderingTypes = {
    /** @readonly @type {'tetrahedron'} @default */ TETRAHEDRON: 'tetrahedron',
    /** @readonly @type {'billboard'}   @default */ BILLBOARD: 'billboard',
    /** @readonly @type {'none'}        @default */ NONE: 'none'
};

/**
 * @typedef {Object} RendererOptionsState The renderer options state.
 * @property {number} boidScale - The global scale of boid models.
 * @property {BoidRenderingType} boidType - The type of boid model.
 * @property {boolean} renderRadius - Whether to render boid interaction radii.
 * @property {boolean} renderBounds - Whether to render the simulation bounds.
 * @property {boolean} renderTree - Whether to render the simulation octree.
 */

/**
 * @typedef {Object} MinMaxColor A linearly-interpolated color gradient.
 * @param {Vector3} min - The starting color.
 * @param {Vector3} max - The ending color.
 */

/**
 * @typedef {Object} RendererColorsState The renderer colors state.
 * @property {MinMaxColor} boid - The boid color gradient.
 * @property {Vector4} radiusColor - The boid interaction radius color.
 * @property {Vector4} boundsColor - The simulation bounds color.
 * @property {Vector4} treeColor - The octree color.
 */

/**
 * @typedef {Object} RendererState The renderer state.
 * @property {RendererProjectionState} projection - The renderer projection state.
 * @property {RendererViewState} view - The renderer view state.
 * @property {RendererOptionsState} options - The renderer options state.
 * @property {RendererColorsState} colors - The renderer colors state.
 */

/**
 * @typedef {Object} State The global state.
 * @property {BoidState} boid - The boid state.
 * @property {SimulationState} simulation - The simulation state.
 * @property {RendererState} renderer - The renderer state.
 */

/**
 * @typedef {{ type: string, path: string, payload: *|undefined }} StateAction An action to query or modify a state store.
 */

/**
 * @typedef {('get'|'set')} StateActionType A type of state action.
 */

/**
 * An enumeration of state action types.
 * @public
 * @readonly
 * @enum {StateActionType}
 */
const StateActionTypes = {
    /** @readonly @type {'get'} @default */ GET: 'get',
    /** @readonly @type {'set'} @default */ SET: 'set'
};

/**
 * Retrieves the value of a property in a {@link State} object.
 * @template T The type of the value.
 * @package
 * @param {State} state - The state to query.
 * @param {string} path - The path to the property.
 * @return {T|undefined} The value, or `undefined` if it cannot be found.
 * @throws {ReferenceError} If the `path` is `false`-y.
 */
const getStateProperty = (state, path) => {
    if (!path) throw new ReferenceError(`No property at path '${path}'.`);
    const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.'); // replace `[n]` with `.n`; split on `.`
    return parts.reduce((acc, key) => {
        if (acc && key in acc) return acc[key];
        return undefined;
    }, state);
};

/**
 * Modifies the value of a property in a {@link State} object.
 * @template T The type of the value.
 * @package
 * @param {State} state - The state to modify.
 * @param {string} path - The path to the property.
 * @param {T} value - The new value of the property.
 * @returns {void}
 * @throws {ReferenceError} If the `path` is `false`-y.
 */
const setStateProperty = (state, path, value) => {
    if (!path) throw new ReferenceError(`No property at path '${path}'.`);
    const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.'); // replace `[n]` with `.n`; split on `.`
    return parts.reduce((acc, key, index) => {
        const isLast = index === parts.length - 1;
        if (isLast) acc[key] = value;
        else {
            const next = parts[index + 1];
            const isNextArrayIndex = /^\d+$/.test(next);
            if (!(key in acc)) acc[key] = isNextArrayIndex ? [] : {};
            return acc[key];
        }
        return state;
    }, state);
};

/**
 * @typedef {(state: State, action: StateAction) => void} ActionCallback A callback passed to {@link StateStore.subscribe()} and executed when notified of a {@link StateAction}.
 * @typedef {() => boolean} UnsubscribeCallback A callback to unsubscribe a callback from a {@link StateStore}.
 */

/**
 * A simulation state store.
 * @class
 */
class StateStore {

    /**
     * The default state.
     * @public
     * @static
     * @readonly
     * @type {State}
     */
    static get DEFAULT() {
        const projectionFOV = 45;
        const projectionNear = 0.01;
        const projectionFar = 100;
        const projectionAspect = 1;
        const projectionMatrix = mat4x4_projection(projectionFOV, projectionAspect, projectionNear, projectionFar);

        const viewManualPosition = vec3(9, 12, 36);
        const viewManualRotation = vec3(17.9, -14.04, -4.4).map(c => (c * Math.PI) / 180);
        const viewMatrix = mat4x4_inv(mat4x4_transform(viewManualPosition, viewManualRotation, vec3(1, 1, 1)));

        return {
            boid: {
                bounds: {
                    min: vec3(-5, -5, -5),
                    max: vec3( 5,  5,  5)
                },
                environment: {
                    count: 512,
                    accuracy: 8,
                    drag: 0.005,
                    randomness: 1
                },
                interaction: {
                    radius: 0.5,
                    alignmentForce: 1,
                    alignmentBias: 1.5,
                    cohesionForce: 1,
                    separationForce: 1.25,
                    steeringForce: 1,
                    minSpeed: 1,
                    maxSpeed: 4
                }
            },
            simulation: {
                running: false
            },
            renderer: {
                projection: {
                    fov: projectionFOV,
                    near: projectionNear,
                    far: projectionFar,
                    aspect: projectionAspect,
                    matrix: projectionMatrix
                },
                view: {
                    type: RendererViewTypes.MANUAL,
                    orbit: {
                        position: vec3(0, 0, 20),
                        rotation: vec2(0, 0),
                        target: vec3(0, 0, 0),
                        distance: 20,
                        sensitivity: 0.005,
                        isDragging: false,
                        lastMouse: vec2(0, 0),
                    },
                    manual: {
                        position: viewManualPosition,
                        rotation: viewManualRotation,
                    },
                    matrix: viewMatrix
                },
                options: {
                    boidScale: 0.1,
                    boidType: BoidRenderingTypes.TETRAHEDRON,
                    renderRadius: false,
                    renderBounds: true,
                    renderTree: false
                },
                colors: {
                    boid: {
                        min: vec3(255, 63, 63),
                        max: vec3(63, 255, 63)
                    },
                    radiusColor: vec4(255, 63, 255, 0.125),
                    boundsColor: vec4(255, 255, 255, 0.4),
                    treeColor: vec4(63, 63, 255, 0.2)
                }
            }
        };
    }

    /**
     * The current {@link State} of this store.
     * @private
     * @type {State}
     */
    #state;

    /**
     * Creates a new state store.
     * @constructor
     * @param {State|undefined} [initialState=undefined] - The initial state.
     */
    constructor(initialState) {
        this.#state = initialState || StateStore.DEFAULT;
        this.listeners = new Map();
    }

    /**
     * The current state in this store.
     * @public
     * @readonly
     * @type {State}
     */
    get state() { return this.#state; }

    /**
     * Retrieves a value from this store.
     * @template T The type of the value.
     * @public
     * @param {string} path - The path to the property.
     * @returns {T|undefined} The value, or `undefined` if the property cannot be found.
     * @throws {ReferenceError} If the `path` is `false`-y.
     */
    get(path) {
        return this.dispatch({ type: 'get', path: path });
    }

    /**
     * Modifies a value in this store.
     * @template T The type of the value.
     * @public
     * @param {string} path - The path to the property.
     * @param {T} value - The new value.
     * @returns {void}
     * @throws {ReferenceError} If the `path` is `false`-y.
     */
    set(path, value) {
        this.dispatch({ type: 'set', path: path, payload: value });
    }

    /**
     * Dispatches a {@link StateAction} to all subscribed listeners of this store.
     * @public
     * @param {StateAction} action - The action to dispatch.
     * @returns {*|undefined} - If the `action`'s `type` is {@link StateActionTypes.GET}, the value of the property. Otherwise, `undefined`.
     * @throws {ReferenceError} If the `action`'s `type` is {@link StateActionTypes.SET} and its `payload` is `null` or `undefined`.
     * @throws {ReferenceError} If the `action`'s `type` is not recognized.
     */
    dispatch(action) {
        switch (action.type) {
            case StateActionTypes.GET: {
                const out = getStateProperty(this.#state, action.path);
                this._notify(action);
                return out;
            }
            case StateActionTypes.SET: {
                if (action.payload == null) throw new ReferenceError(`Payload with type '${action.type}' must contain a payload.`);
                setStateProperty(this.#state, action.path, action.payload);
                this._notify(action);
                return undefined;
            }
            default:
                throw new ReferenceError(`Unknown action type: '${action.type}'.`);
        }
    }

    /**
     * Subscribes a callback to the notifications of this store.
     * @public
     * @param {ActionCallback} cb - The callback to subscribe.
     * @returns {UnsubscribeCallback} A callback to unsubscribe this callback from this store.
     */
    subscribe(cb) {
        const id = Date.now() + Math.random();
        this.listeners.set(id, cb);
        return () => this.listeners.delete(id);
    }

    /**
     * Notifies all subscribers of this store of a new action.
     * @protected
     * @param {StateAction} action - The action to notify of.
     * @returns {void}
     */
    _notify(action) {
        this.listeners.forEach(cb => cb(this.#state, action));
    }

}

export {
    StateStore,
    StateActionTypes,
    RendererViewTypes,
    BoidRenderingTypes
};