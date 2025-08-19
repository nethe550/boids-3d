/**
 * @file A bird flocking simulation manager.
 * @author nethe550
 * @license MIT
 * @version 1.0.0
 */

import { vec3, vec_add, vec_sub, vec_mul, vec_norm, vec_smag, vec_mag, vec_dot } from './util/vector.js';
import Octree from './util/Octree.js';

/**
 * @typedef {import('./util/vector.js').Vector3} Vector3
 */

/**
 * A bird flocking simulation manager.
 * @class
 */
class Boids {

    /**
     * The margin of error when considering the bounds of a simulation.
     * @public
     * @static
     * @readonly
     * @const {number}
     * @default
     */
    static BOUNDS_EPSILON = 1e-2;

    /**
     * The number of boids.
     * @private
     * @type {number}
     */
    #N;

    /**
     * The number of neighbors considered when computing inter-boid forces.
     * @private
     * @type {number}
     */
    #accuracy;

    /**
     * The magnitude of velocity reduction applied every simulation step.
     * @private
     * @type {number}
     */
    #drag;

    /**
     * The magnitude of random velocity added to each boid every simulation step.
     * @private
     * @type {number}
     */
    #randomness;

    /**
     * The maximum radius in which boids will search for neighbors.
     * @private
     * @type {number}
     */
    #interactionRadius;

    /**
     * The magnitude of the direction alignment force.
     * @private
     * @type {number}
     */
    #alignmentForce;

    /**
     * The bias of the direction alignment force.
     * Values greater than 1 bias forces from neighbors travelling in the same direction greater,
     * while values less than 1 bias forces from neighbors travelling in the opposite direction greater.
     * @private
     * @type {number}
     */
    #alignmentBias;

    /**
     * The magnitude of the proximity cohesion force.
     * @private
     * @type {number}
     */
    #cohesionForce;

    /**
     * The magnitude of the proximity separation force.
     * @private
     * @type {number}
     */
    #separationForce;

    /**
     * The relative magnitude of direction-changing force(s).
     * @private
     * @type {number}
     */
    #steeringForce;

    /**
     * The global minimum velocity magnitude.
     * @private
     * @type {number}
     */
    #minSpeed;

    /**
     * The global maximum velocity magnitude.
     * @private
     * @type {number}
     */
    #maxSpeed;

    /**
     * The positions of the boids.
     * @private
     * @type {Vector3[]}
     */
    #positions = [];

    /**
     * The velocities of the boids.
     * @private
     * @type {Vector3[]}
     */
    #velocities = [];

    /**
     * The accelerations of the boids.
     * @private
     * @type {Vector3[]}
     */
    #accelerations = [];

    /**
     * The number of neighbors each boid detects every simulation step.
     * @private
     * @type {number[]}
     */
    #neighborCount = [];

    /**
     * The minimum bounds of the simulation.
     * @private
     * @type {Vector3}
     */
    #boundsMin = vec3(-5, -5, -5);

    /**
     * The maximum bounds of the simulation.
     * @private
     * @type {Vector3}
     */
    #boundsMax = vec3(5, 5, 5);

    /**
     * The space-partitioning octree used to query neighboring boids.
     * @private
     * @type {Octree}
     */
    #octree;

    /**
     * Creates a new bird flocking simulation.
     * @constructor
     * @param {number} [N=64] - Number of boids.
     * @param {number} [accuracy=32] - Maximum number of neighbors each boid will interact with.
     * @param {number} [drag=0.005] - Drag applied to boids' velocities per step.
     * @param {number} [randomness=0.001] - Random velocity magnitude applied to each boid per step.
     * @param {number} [interactionRadius=1] - The radius in which boids interact.
     * @param {number} [alignmentForce=1] - Strength of boid alignment.
     * @param {number} [alignmentBias=1.5] - Amount boids align with other boids. (>1 biased toward same-direction, <1 biased toward opposite-direction)
     * @param {number} [cohesionForce=1] - Strength of boid adhesion.
     * @param {number} [separationForce=1.1] - Strength of boid separation.
     * @param {number} [steeringForce=0.05] - Angle of directional change per step.
     * @param {number} [minSpeed=1] - Minimum boid speed.
     * @param {number} [maxSpeed=4] - Maximum boid speed.
     * @param {Vector3} [boundsMin=[-5,-5,-5]] - Minimum bounds.
     * @param {Vector3} [boundsMax=[5,5,5]] - Maximum bounds.
     */
    constructor(N=64, accuracy=32, drag=0.005, randomness=0.001, interactionRadius=1, alignmentForce=1, alignmentBias=1.5, cohesionForce=1, separationForce=1.1, steeringForce=0.05, minSpeed=1, maxSpeed=4, boundsMin=vec3(-5,-5,-5), boundsMax=vec3(5,5,5)) {
        this.#N = N;
        this.#accuracy = accuracy;
        this.#drag = drag;
        this.#randomness = randomness;
        this.#interactionRadius = interactionRadius;
        this.#alignmentForce = alignmentForce;
        this.#alignmentBias = alignmentBias;
        this.#cohesionForce = cohesionForce;
        this.#separationForce = separationForce;
        this.#steeringForce = steeringForce;
        this.#minSpeed = minSpeed;
        this.#maxSpeed = maxSpeed;
        this.#boundsMin = [...boundsMin];
        this.#boundsMax = [...boundsMax];
    }

    /**
     * The number of boids.
     * @public
     * @readonly
     * @type {number}
     */
    get N() { return this.#N; }

    /**
     * The number of neighbors considered when computing inter-boid forces.
     * @public
     * @type {number}
     */
    get accuracy() { return this.#accuracy; }

    /**
     * The number of neighbors considered when computing inter-boid forces.
     * @public
     * @param {number} a
     */
    set accuracy(a) { this.#accuracy = a; }

    /**
     * The magnitude of velocity reduction applied every simulation step.
     * @public
     * @type {number}
     */
    get drag() { return this.#drag; }

    /**
     * The magnitude of velocity reduction applied every simulation step.
     * @public
     * @param {number} d
     */
    set drag(d) { this.#drag = d; }

    /**
     * The magnitude of random velocity added to each boid every simulation step.
     * @public
     * @type {number}
     */
    get randomness() { return this.#randomness; }

    /**
     * The magnitude of random velocity added to each boid every simulation step.
     * @public
     * @param {number} r
     */
    set randomness(r) { this.#randomness = r; }

    /**
     * The minimum bounds of the simulation.
     * @public
     * @type {Vector3}
     */
    get minBounds() { return this.#boundsMin; }

    /**
     * The minimum bounds of the simulation.
     * @public
     * @param {Vector3} b
     */
    set minBounds(b) {
        this.#boundsMin = b;
        this.#constrainBoids();
    }

    /**
     * The maximum bounds of the simulation.
     * @public
     * @type {Vector3}
     */
    get maxBounds() { return this.#boundsMax; }

    /**
     * The maximum bounds of the simulation.
     * @public
     * @param {Vector3} b
     */
    set maxBounds(b) {
        this.#boundsMax = b;
        this.#constrainBoids();
    }

    /**
     * The maximum radius in which boids will search for neighbors.
     * @public
     * @type {number}
     */
    get interactionRadius() { return this.#interactionRadius; }

    /**
     * The maximum radius in which boids will search for neighbors.
     * @public
     * @param {number} r
     */
    set interactionRadius(r) { this.#interactionRadius = r; }

    /**
     * The magnitude of the direction alignment force.
     * @public
     * @type {number}
     */
    get alignmentForce() { return this.#alignmentForce; }

    /**
     * The magnitude of the direction alignment force.
     * @public
     * @param {number} f
     */
    set alignmentForce(f) { this.#alignmentForce = f; }

    /**
     * The bias of the direction alignment force.
     * Values greater than 1 bias forces from neighbors travelling in the same direction greater,
     * while values less than 1 bias forces from neighbors travelling in the opposite direction greater.
     * @public
     * @type {number}
     */
    get alignmentBias() { return this.#alignmentBias; }

    /**
     * The bias of the direction alignment force.
     * Values greater than 1 bias forces from neighbors travelling in the same direction greater,
     * while values less than 1 bias forces from neighbors travelling in the opposite direction greater.
     * @public
     * @param {number} b
     */
    set alignmentBias(b) { this.#alignmentBias = b; }

    /**
     * The magnitude of the proximity cohesion force.
     * @public
     * @type {number}
     */
    get cohesionForce() { return this.#cohesionForce; }

    /**
     * The magnitude of the proximity cohesion force.
     * @public
     * @param {number} f
     */
    set cohesionForce(f) { this.#cohesionForce = f; }

    /**
     * The magnitude of the proximity separation force.
     * @public
     * @type {number}
     */
    get separationForce() { return this.#separationForce; }

    /**
     * The magnitude of the proximity separation force.
     * @public
     * @param {number} f
     */
    set separationForce(f) { this.#separationForce = f; }

    /**
     * The relative magnitude of direction-changing force(s).
     * @public
     * @type {number}
     */
    get steeringForce() { return this.#steeringForce; }

    /**
     * The relative magnitude of direction-changing force(s).
     * @public
     * @param {number} f
     */
    set steeringForce(f) { this.#steeringForce = f; }

    /**
     * The global minimum velocity magnitude.
     * @public
     * @type {number}
     */
    get minSpeed() { return this.#minSpeed; }

    /**
     * The global minimum velocity magnitude.
     * @public
     * @param {number} s
     */
    set minSpeed(s) { this.#minSpeed = s; }

    /**
     * The global maximum velocity magnitude.
     * @public
     * @type {number}
     */
    get maxSpeed() { return this.#maxSpeed; }

    /**
     * The global maximum velocity magnitude.
     * @public
     * @param {number} s
     */
    set maxSpeed(s) { this.#maxSpeed = s; }

    /**
     * The positions of the boids.
     * @public
     * @readonly
     * @type {Vector3[]}
     */
    get positions() { return this.#positions; }

    /**
     * The velocities of the boids.
     * @public
     * @readonly
     * @type {Vector3[]}
     */
    get velocities() { return this.#velocities; }

    /**
     * The accelerations of the boids.
     * @public
     * @readonly
     * @type {Vector3[]}
     */
    get accelerations() { return this.#accelerations; }

    /**
     * The number of neighbors each boid detects every simulation step.
     * @public
     * @readonly
     * @type {number[]}
     */
    get neighbourCount() { return this.#neighborCount; }

    /**
     * The space-partitioning octree used to query neighboring boids.
     * @public
     * @readonly
     * @type {Octree}
     */
    get tree() { return this.#octree; }

    /**
     * Initializes the simulation.
     * @public
     * @returns {void}
     */
    init() {
        this.#positions = [];
        this.#velocities = [];
        this.#accelerations = [];
        const speedRange = this.#maxSpeed - this.#minSpeed;
        const range = vec_sub(this.#boundsMax, this.#boundsMin);

        const s = vec_sub(this.#boundsMax, this.#boundsMin);
        const c = vec_add(this.#boundsMin, vec_mul(s, 0.5));
        this.#octree = new Octree(c, s);
        for (let i = 0; i < this.#N; i++) {
            const velocity = Math.random() * speedRange + this.#minSpeed;
            this.#positions[i] = vec3(Math.random() * range[0] + this.#boundsMin[0], Math.random() * range[1] + this.#boundsMin[1], Math.random() * range[2] + this.#boundsMin[2]);
            this.#velocities[i] = vec_mul(vec_norm(vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)), velocity);
            this.#accelerations[i] = vec3();
            this.#neighborCount[i] = 0;
            this.#octree.insert(this, i);
        }
    }

    /**
     * A temporary intermediate vector used in {@link Boids.step()}.
     * @private
     * @type {Vector3}
     */
    #temp_vec3_1 = vec3();

    /**
     * A temporary intermediate vector used in {@link Boids.step()}.
     * @private
     * @type {Vector3}
     */
    #temp_vec3_2 = vec3();

    /**
     * A temporary intermediate vector used in {@link Boids.step()}.
     * @private
     * @type {Vector3}
     */
    #temp_vec3_3 = vec3();

    /**
     * A temporary intermediate vector used in {@link Boids.step()}.
     * @private
     * @type {Vector3}
     */
    #alignment = vec3();

    /**
     * A temporary intermediate vector used in {@link Boids.step()}.
     * @private
     * @type {Vector3}
     */
    #cohesion = vec3();

    /**
     * A temporary intermediate vector used in {@link Boids.step()}.
     * @private
     * @type {Vector3}
     */
    #separation = vec3();

    /**
     * Steps the simulation forward by `dt` seconds.
     * @public
     * @param {number} dt - The timestep (in seconds).
     * @returns {void}
     */
    step(dt) {
        vec3(0, 0, 0, this.#temp_vec3_1);
        vec3(0, 0, 0, this.#temp_vec3_2);
        vec3(0, 0, 0, this.#temp_vec3_3);
        vec3(0, 0, 0, this.#alignment);
        vec3(0, 0, 0, this.#cohesion);
        vec3(0, 0, 0, this.#separation);

        const r2 = this.#interactionRadius ** 2;
        vec_sub(this.#boundsMax, this.#boundsMin, this.#temp_vec3_1);
        vec_add(this.#boundsMin, vec_mul(this.#temp_vec3_1, 0.5, this.#temp_vec3_2), this.#temp_vec3_2);
        this.#octree = new Octree(vec3(...this.#temp_vec3_2), vec3(...this.#temp_vec3_1));
        for (let i = 0; i < this.#N; i++) this.#octree.insert(this, i);

        for (let i = 0; i < this.#N; i++) {
            const pos = this.#positions[i];
            const vel = this.#velocities[i];

            vec3(0, 0, 0, this.#alignment);
            vec3(0, 0, 0, this.#cohesion);
            vec3(0, 0, 0, this.#separation);
            this.#neighborCount[i] = 0;
            let totalAlignmentWeight = 0;

            vec_sub(this.#boundsMax, this.#boundsMin, this.#temp_vec3_1);

            const neighbors = this.#octree.queryRadiusWrapped(this, pos, this.#interactionRadius);

            for (const j of neighbors) {
                if (i === j) continue;
                const otherPos = this.#positions[j];
                const otherVel = this.#velocities[j];

                // shortest wrapped distance between i, j
                vec_sub(otherPos, pos, this.#temp_vec3_2);
                for (let k = 0; k < 3; k++) {
                    if (this.#temp_vec3_2[k] > this.#temp_vec3_1[k] * 0.5) this.#temp_vec3_2[k] -= this.#temp_vec3_1[k];
                    else if (this.#temp_vec3_2[k] < -this.#temp_vec3_1[k] * 0.5) this.#temp_vec3_2[k] += this.#temp_vec3_1[k];
                }
                
                const d2 = vec_smag(this.#temp_vec3_2);
                if (d2 < r2) { // necessary; distance might vary between Euclidean/wrapped positions
                    this.#neighborCount[i]++;
                    const similarity = vec_dot(vec_norm(vel, this.#temp_vec3_1), vec_norm(otherVel, this.#temp_vec3_3));
                    const weight = 1 + this.#alignmentBias * similarity;
                    totalAlignmentWeight += weight;

                    vec_add(this.#alignment, vec_mul(otherVel, weight, this.#temp_vec3_1), this.#alignment);
                    vec_add(this.#cohesion, otherPos, this.#cohesion);
                    vec_add(this.#separation, vec_mul(this.#temp_vec3_2, -1 / (d2 || 1e-4), this.#temp_vec3_3), this.#separation);

                    if (this.#neighborCount[i] >= this.#accuracy) break;
                }
            }

            if (this.#neighborCount[i] > 0) {
                vec_mul(vec_norm(vec_sub(vec_mul(this.#alignment, 1 / totalAlignmentWeight, this.#temp_vec3_1), vel, this.#temp_vec3_2), this.#temp_vec3_3), this.#alignmentForce, this.#alignment);
                vec_mul(vec_norm(vec_sub(vec_mul(this.#cohesion, 1 / this.#neighborCount[i], this.#temp_vec3_1), pos, this.#temp_vec3_2), this.#temp_vec3_3), this.#cohesionForce, this.#cohesion);
                vec_mul(vec_norm(this.#separation, this.#temp_vec3_1), this.#separationForce, this.#separation);
            }

            vec_add(vec_add(this.#alignment, this.#cohesion, this.#temp_vec3_2), this.#separation, this.#temp_vec3_1);
            vec_mul(this.#temp_vec3_1, this.#steeringForce, this.#temp_vec3_1);
            vec3(
                (Math.random() * 2 - 1) * this.#randomness,
                (Math.random() * 2 - 1) * this.#randomness,
                (Math.random() * 2 - 1) * this.#randomness,
                this.#temp_vec3_3
            );
            vec_add(this.#temp_vec3_1, this.#temp_vec3_3, this.#temp_vec3_1);
            vec3(...this.#temp_vec3_1, this.#accelerations[i]);
        }

        const idrag = 1 - this.#drag;

        for (let i = 0; i < this.#N; i++) {
            let pos = this.#positions[i];
            let vel = this.#velocities[i];
            let acc = this.#accelerations[i];

            vec_add(vel, vec_mul(acc, dt, this.#temp_vec3_1), vel);
            vec_mul(vel, idrag, vel);

            const speed = vec_mag(vel);
            if (speed > this.#maxSpeed) vec_mul(vec_norm(vel, this.#temp_vec3_1), this.#maxSpeed, vel);
            else if (speed < this.#minSpeed) vec_mul(vec_norm(vel, this.#temp_vec3_1), this.#minSpeed, vel);
            this.#velocities[i] = vel;

            vec_add(pos, vec_mul(vel, dt, this.#temp_vec3_1), pos);

            this.#constrainBoid(pos);
        }
    }

    /**
     * Constrains all boids to within the simulation bounds.
     * Modifies all positions in-place.
     * @private
     * @returns {void}
     */
    #constrainBoids() {
        for (let i = 0; i < this.#N; i++) this.#constrainBoid(this.#positions[i]);
    }

    /**
     * Constrains a boid within the simulation bounds.
     * Modifies the position in-place.
     * @private
     * @param {Vector3} position - The position of the boid.
     * @returns {void}
     */
    #constrainBoid(position) {
        for (let k = 0; k < 3; k++) {
            if (position[k] < this.#boundsMin[k]) position[k] = this.#boundsMax[k];
            else if (position[k] > this.#boundsMax[k]) position[k] = this.#boundsMin[k];
        }
    }

}

export default Boids;