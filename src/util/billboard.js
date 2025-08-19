/**
 * @file Billboard operations and utilities. 
 * @author nethe550
 * @license MIT
 * @version 1.0.0
 */

import { vec3, vec_add, vec_mul, vec_norm } from './vector.js';
import { mat4x4 } from './matrix.js';

/**
 * @typedef {import('./matrix.js').Matrix4x4} Matrix4x4
 */

/**
 * 2π
 * @public
 * @const {number}
 * @default
 */
const TAU = Math.PI * 2;

/**
 * Creates a 3D billboard polyline from a collection of 2D points.
 * @public
 * @param {...Vector2} p - The polyline points.
 * @returns {Vector3[]} The billboard polyline points.
 * @throws {RangeError} If less than 2 points are provided.
 */
const billboard_polyline = (...p) => {
    if (p.length < 2) throw new RangeError(`Expected at least 2 points.`);
    return p.map(_p => vec3(..._p, 0));
};

/**
 * Creates a regular N-gon billboard.
 * @public
 * @param {number} N - The number of sides.
 * @param {number} [radius=1] - The radius.
 * @param {number} [offset=0] - The angular offset.
 * @returns {Vector3[]} The billboard polygon points.
 * @throws {RangeError} If `N` is less than 3.
 * @throws {RangeError} If `radius` is less than or equal to 0.
 */
const billboard_ngon = (N, radius=1, offset=0) => {
    N = Math.floor(N);
    if (N < 3) throw new RangeError(`Expected at least 3 points.`);
    if (radius <= 0) throw new RangeError(`Radius must be positive.`);
    const out = [];
    const delta = 1 / N;
    for (let i = 0; i < N; i++) {
        const theta = i * delta * TAU + offset;
        out.push(vec3(radius * Math.cos(theta), radius * Math.sin(theta), 0));
    }
    return out;
};

/**
 * Creates a billboard model matrix.
 * @public
 * @param {Matrix4x4} view - The "camera" view matrix to align the normal direction with.
 * @param {Vector3} position - The position of the billboard.
 * @param {number} [rotation=0] - The rotation of the billboard.
 * @param {Vector3} [scale=[1,1,1]] - The scale of the billboard.
 * @param {Matrix4x4} [out=undefined] - A 4x4 matrix to hold the result.
 * @returns {Matrix4x4} `out` if it is not `undefined`, otherwise a new model matrix.
 */
const billboard_mat4x4 = (view, position, rotation=0, scale=[1,1,1], out=undefined) => {
    const right   = vec_norm(vec3(view[0], view[4], view[8]));
    const up      = vec_norm(vec3(view[1], view[5], view[9]));
    const cosR    = Math.cos(rotation);
    const sinR    = Math.sin(rotation);
    const right_r = vec_add(vec_mul(right, cosR), vec_mul(up,     sinR));
    const up_r    = vec_add(vec_mul(up,    cosR), vec_mul(right, -sinR));
    const right_s = vec_mul(right_r, scale[0]);
    const up_s    = vec_mul(up_r,    scale[1]);
    const forward = vec3(0, 0, scale[2]); // billboard plane normal (z)
    if (out) {
        out[ 0] =  right_s[0]; out[ 1] =  right_s[1]; out[ 2] =  right_s[2]; out[ 3] = 0;
        out[ 4] =     up_s[0]; out[ 5] =     up_s[1]; out[ 6] =     up_s[2]; out[ 7] = 0;
        out[ 8] =  forward[0]; out[ 9] =  forward[1]; out[10] =  forward[2]; out[11] = 0;
        out[12] = position[0]; out[13] = position[1]; out[14] = position[2]; out[15] = 1;
        return out;
    }
    return mat4x4(
        right_s[0], up_s[0], forward[0], position[0],
        right_s[1], up_s[1], forward[1], position[1],
        right_s[2], up_s[2], forward[2], position[2],
        0,               0,            0,          1
    );
};

export {
    TAU,

    billboard_polyline,
    billboard_ngon,

    billboard_mat4x4
};