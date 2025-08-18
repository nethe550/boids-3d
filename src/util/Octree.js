import { vec3, vec3_to_vec4, vec4_to_vec3, vec_add, vec_sub, vec_mul, vec_smag } from './vector.js';
import Renderer from '../dom/Renderer.js';

/**
 * @typedef {import('./vector.js').Vector3} Vector3
 * @typedef {import('../Boids.js').default} Boids
 */

/**
 * A 3D space-partitioning tree for {@link Boids} simulations.
 * @class
 */
class Octree {

    /**
     * The maximum capacity of each tree level.
     * @public
     * @static
     * @readonly
     * @const {number}
     */
    static MAX_CAPACITY = 4;

    /**
     * The center of the current volume.
     * @private
     * @type {Vector3}
     */
    #center;

    /**
     * The size of the current volume.
     * @private
     * @type {Vector3}
     */
    #size;

    /**
     * The indices of each boid in the current volume.
     * @private
     * @type {number[]|null}
     */
    #indices = [];

    /**
     * The child volumes of the current volume.
     * @private
     * @type {Octree[]|null}
     */
    #children = null;

    /**
     * Creates a new tree volume.
     * @constructor
     * @param {Vector3} center - The center of the volume.
     * @param {Vector3} size - The size of the volume.
     */
    constructor(center, size) {
        this.#center = center;
        this.#size = size;
    }
    
    /**
     * Whether this volume is a "leaf" (i.e. has no children)
     * - This indicates that it has 0 ≤ boids < {@link Octree.MAX_CAPACITY} contained within it.
     * @public
     * @readonly
     * @type {boolean}
     */
    get isLeaf() { return this.#children === null; }

    /**
     * Inserts a boid into this volume.
     * - May cause this volume to subdivide if this insertion would overflow {@link Octree.MAX_CAPACITY}.
     * @public
     * @param {Boids} boids - The simulation to reference.
     * @param {number} index - The index of the boid to insert.
     * @returns {boolean} Whether the boid was successfully inserted.
     */
    insert(boids, index) {
        const pos = boids.positions[index];
        if (!this.#contains(pos)) return false;
        if (this.isLeaf) {
            if (this.#indices.length >= Octree.MAX_CAPACITY) this.#subdivide(boids);
            else {
                this.#indices.push(index);
                return true;
            }
        }
        else {
            for (const child of this.#children) {
                if (child.insert(boids, index)) return true;
            }
            return false;
        }
    }

    /**
     * A temporary intermediate vector used in {@link Octree.queryRadius()} and {@link Octree.queryRadiusWrapped()}. 
     * @private
     * @type {Vector3}
     */
    #temp_vec3_1 = vec3();

    /**
     * Queries all boids within a certain radius around a point.
     * @public
     * @param {Boids} boids - The simulation to reference.
     * @param {Vector3} center - The center of the query.
     * @param {number} radius - The radius to query.
     * @param {number[]} [found=[]] - A recursive parameter used to accumulated discovered boids.
     * @returns {number[]} The indices of the boid(s) found.
     */
    queryRadius(boids, center, radius, found=[]) {
        if (!this.#intersects(center, radius)) return found || [];
        if (this.isLeaf) {
            const r2 = radius ** 2;
            for (const index of this.#indices) {
                const pos = boids.positions[index];
                vec_sub(pos, center, this.#temp_vec3_1);
                const d2 = vec_smag(this.#temp_vec3_1);
                if (d2 <= r2) found.push(index);
            }
        }
        else {
            for (const child of this.#children) child.queryRadius(boids, center, radius, found);
        }
        return found;
    }

    /**
     * Queries all boids within a certain radius around a point.
     * - Accounts for hypertoroidal geometry (i.e. left=right, top=bottom, forward=back)
     * @see {@link Octree.queryRadius()}
     * @public
     * @param {Boids} boids
     * @param {Vector3} center
     * @param {number} radius
     * @returns {number[]}
     */
    queryRadiusWrapped(boids, center, radius) {
        const found = [];
        const r2 = radius ** 2;
        const potentialNeighbors = this.queryRadius(boids, center, radius);
        for (const index of potentialNeighbors) {
            const pos = boids.positions[index];
            vec_sub(pos, center, this.#temp_vec3_1);
            for (let k = 0; k < 3; k++) {
                if (this.#temp_vec3_1[k] > this.#size[k] * 0.5) this.#temp_vec3_1[k] -= this.#size[k];
                else if (this.#temp_vec3_1[k] < -this.#size[k] * 0.5) this.#temp_vec3_1[k] += this.#size[k];
            }
            if (vec_smag(this.#temp_vec3_1) <= r2) found.push(index);
        }
        return found;
    }

    /**
     * Draws the wireframe box of this volume and all of its child volumes.
     * - The opacity of `color` is multiplied with the relative occupancy of the volume to determine final alpha.
     * @public
     * @param {Renderer} renderer - The renderer to render with.
     * @param {Vector3} color - The color of the box.
     * @returns {void}
     */
    draw(renderer, color) {
        if (this.isLeaf) {
            if (this.#indices.length > 0) {
                const hs = vec_mul(this.#size, 0.5);
                const min = vec_sub(this.#center, hs);
                const max = vec_add(this.#center, hs);
                const corners = [
                    vec3(min[0], min[1], min[2]),
                    vec3(max[0], min[1], min[2]),
                    vec3(max[0], max[1], min[2]),
                    vec3(min[0], max[1], min[2]),
                    vec3(min[0], min[1], max[2]),
                    vec3(max[0], min[1], max[2]),
                    vec3(max[0], max[1], max[2]),
                    vec3(min[0], max[1], max[2])
                ];
                renderer.drawBox(corners, vec3_to_vec4(vec4_to_vec3(color), (this.#indices.length / Octree.MAX_CAPACITY) * color[3]));
            }
        }
        else {
            for (const child of this.#children) child.draw(renderer, color);
        }
    }

    /**
     * Subdivides the current volume into 8 similar volumes.
     * - All of the original volume is occupied by child volumes.
     * - All child volumes are equal in dimensions.
     * @private
     * @param {Boids} boids - The simulation to reference.
     * @returns {void}
     */
    #subdivide(boids) {
        if (!this.isLeaf) throw new Error(`Octree already subdivided.`);
        const hs = vec_mul(this.#size, 0.5);
        const q = vec_mul(hs, 0.5); // q is the quarter-size vector
        const ppp = new Octree(vec_add(this.#center, vec3( q[0],  q[1],  q[2])), hs);
        const pnp = new Octree(vec_add(this.#center, vec3( q[0], -q[1],  q[2])), hs);
        const ppn = new Octree(vec_add(this.#center, vec3( q[0],  q[1], -q[2])), hs);
        const pnn = new Octree(vec_add(this.#center, vec3( q[0], -q[1], -q[2])), hs);
        const npp = new Octree(vec_add(this.#center, vec3(-q[0],  q[1],  q[2])), hs);
        const nnp = new Octree(vec_add(this.#center, vec3(-q[0], -q[1],  q[2])), hs);
        const npn = new Octree(vec_add(this.#center, vec3(-q[0],  q[1], -q[2])), hs);
        const nnn = new Octree(vec_add(this.#center, vec3(-q[0], -q[1], -q[2])), hs);
        this.#children = [
            ppp, pnp, ppn, pnn, 
            npp, nnp, npn, nnn
        ];
        for (const index of this.#indices) this.insert(boids, index);
        this.#indices = [];
    }

    /**
     * Determines whether this volume contains a point.
     * @private
     * @param {Vector3} point - The point to test.
     * @returns {boolean} Whether this volume contains the provided point.
     */
    #contains(point) {
        const hs = vec_mul(this.#size, 0.5);
        const min = vec_sub(this.#center, hs);
        const max = vec_add(this.#center, hs);
        return (
            point[0] >= min[0] && point[0] < max[0] &&
            point[1] >= min[1] && point[1] < max[1] &&
            point[2] >= min[2] && point[2] < max[2]
        );
    }

    /**
     * Determines whether this volume intersects with a sphere.
     * @private
     * @param {Vector3} center - The center of the sphere.
     * @param {number} radius - The radius of the sphere.
     * @returns {boolean} Whether this volume intersects the provided sphere.
     */
    #intersects(center, radius) {
        const hs = vec_mul(this.#size, 0.5);
        const min = vec_sub(this.#center, hs);
        const max = vec_add(this.#center, hs);
        const closest = vec3(
            Math.min(Math.max(center[0], min[0]), max[0]),
            Math.min(Math.max(center[1], min[1]), max[1]),
            Math.min(Math.max(center[2], min[2]), max[2])
        );
        const delta = vec_sub(closest, center);
        return vec_smag(delta) <= radius ** 2;
    }

}

export default Octree;