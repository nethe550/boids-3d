/**
 * @file Vector operations and utilities. 
 * @author nethe550
 * @license MIT
 * @version 1.1.0
 */

/**
 * @typedef {[number, number]} Vector2
 * @typedef {[number, number, number]} Vector3
 * @typedef {[number, number, number, number]} Vector4
 * @typedef {Vector2|Vector3|Vector4} Vector
 */

/**
 * @public
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @param {Vector2|undefined} [out=undefined]
 * @returns {Vector2}
 */
const vec2 = (x=0, y=0, out=undefined) => {
    if (out) {
        out[0] = x;
        out[1] = y;
        return out;
    }
    return [x, y];
};

/**
 * @public
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @param {number} [z=0]
 * @param {Vector3|undefined} [out=undefined]
 * @returns {Vector3}
 */
const vec3 = (x=0, y=0, z=0, out=undefined) => {
    if (out) {
        out[0] = x;
        out[1] = y;
        out[2] = z;
        return out;
    }
    return [x, y, z];
};

/**
 * @public
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @param {number} [z=0]
 * @param {number} [w=0]
 * @param {Vector4|undefined} [out=undefined]
 * @returns {Vector4}
 */
const vec4 = (x=0, y=0, z=0, w=0, out=undefined) => {
    if (out) {
        out[0] = x;
        out[1] = y;
        out[2] = z;
        out[3] = w;
        return out;
    }
    return [x, y, z, w];
}

/**
 * @public
 * @param {Vector2} v 
 * @param {number} [z=0]
 * @param {Vector3|undefined} [out=undefined]
 * @returns {Vector3}
 */
const vec2_to_vec3 = (v, z=0, out=undefined) => {
    if (out) {
        out[0] = v[0];
        out[1] = v[1];
        out[2] = z;
        return out;
    }
    return [v[0], v[1], z];
}

/**
 * @public
 * @param {Vector2} v
 * @param {number} [z=0]
 * @param {number} [w=0]
 * @param {Vector4|undefined} [out=undefined]
 * @returns {Vector4}
 */
const vec2_to_vec4 = (v, z=0, w=0, out=undefined) => {
    if (out) {
        out[0] = v[0];
        out[1] = v[1];
        out[2] = z;
        out[3] = w;
        return out;
    }
    return [v[0], v[1], z, w];
};

/**
 * @public
 * @param {Vector3} v
 * @param {Vector2|undefined} [out=undefined]
 * @returns {Vector2}
 */
const vec3_to_vec2 = (v, out=undefined) => {
    if (out) {
        out[0] = v[0];
        out[1] = v[1];
        return out;
    }
    return [v[0], v[1]];
}

/**
 * @public
 * @param {Vector3} v
 * @param {number} [w=0]
 * @param {Vector4|undefined} [out=undefined]
 * @returns {Vector4}
 */
const vec3_to_vec4 = (v, w=0, out=undefined) => {
    if (out) {
        out[0] = v[0];
        out[1] = v[1];
        out[2] = v[2];
        out[3] = w;
        return out;
    }
    return [v[0], v[1], v[2], w];
}

/**
 * @public
 * @param {Vector4} v
 * @param {Vector2|undefined} [out=undefined]
 * @returns {Vector2}
 */
const vec4_to_vec2 = (v, out=undefined) => {
    if (out) {
        out[0] = v[0];
        out[1] = v[1];
        return out;
    }
    return [v[0], v[1]];
};

/**
 * @public
 * @param {Vector4} v
 * @param {Vector3|undefined} [out=undefined]
 * @returns {Vector3}
 */
const vec4_to_vec3 = (v, out=undefined) => {
    if (out) {
        out[0] = v[0];
        out[1] = v[1];
        out[2] = v[2];
        return out;
    }
    return [v[0], v[1], v[2]];
};

/**
 * @public
 * @param {Vector} v
 * @returns {number}
 */
const vec_smag = v => {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    return s;
};

/**
 * @public
 * @param {Vector} v
 * @returns {number}
 */
const vec_mag = v => {
    return Math.sqrt(vec_smag(v));
};

/**
 * @param {Vector} v
 * @param {Vector|undefined} [out=undefined]
 * @returns {Vector}
 */
const vec_norm = (v, out=undefined) => {
    const mag = vec_mag(v);
    const o = out || [];
    if (Math.abs(mag) < 1e-8) return o;
    for (let i = 0; i < v.length; i++) o[i] = v[i] / mag;
    return o;
};

/**
 * @public
 * @param {Vector} a
 * @param {Vector|number} b
 * @param {Vector|undefined} [out=undefined]
 * @returns {Vector}
 */
const vec_add = (a, b, out=undefined) => {
    const o = out || [];
    if (typeof b === 'number') {
        for (let i = 0; i < a.length; i++) o[i] = a[i] + b;
    }
    else {
        for (let i = 0; i < a.length; i++) o[i] = a[i] + b[i];
    }
    return o;
};

/**
 * @public
 * @param {Vector} a
 * @param {Vector|number} b
 * @param {Vector|undefined} [out=undefined]
 * @returns {Vector}
 */
const vec_sub = (a, b, out=undefined) => {
    const o = out || [];
    if (typeof b === 'number') {
        for (let i = 0; i < a.length; i++) o[i] = a[i] - b;
    }
    else {
        for (let i = 0; i < a.length; i++) o[i] = a[i] - b[i];
    }
    return o;
};

/**
 * @public
 * @param {Vector} a
 * @param {Vector|number} b
 * @param {Vector|undefined} [out=undefined]
 * @returns {Vector}
 */
const vec_mul = (a, b, out=undefined) => {
    const o = out || [];
    if (typeof b === 'number') {
        for (let i = 0; i < a.length; i++) o[i] = a[i] * b;
    }
    else {
        for (let i = 0; i < a.length; i++) o[i] = a[i] * b[i];
    }
    return o;
};

/**
 * @public
 * @param {Vector} a
 * @param {Vector|number} b
 * @param {Vector|undefined} [out=undefined]
 * @returns {Vector}
 */
const vec_div = (a, b, out=undefined) => {
    const o = out || [];
    if (typeof b === 'number') {
        for (let i = 0; i < a.length; i++) o[i] = a[i] / b;
    }
    else {
        for (let i = 0; i < a.length; i++) o[i] = a[i] / b[i];
    }
    return o;
};

/**
 * @public
 * @param {Vector} a
 * @param {Vector|number} b
 * @param {Vector|undefined} [out=undefined]
 * @returns {Vector}
 */
const vec_mod = (a, b, out=undefined) => {
    const o = out || [];
    if (typeof b === 'number') {
        for (let i = 0; i < a.length; i++) o[i] = a[i] % b;
    }
    else {
        for (let i = 0; i < a.length; i++) o[i] = a[i] % b[i];
    }
    return o;
};

/**
 * @public
 * @param {Vector} a
 * @param {Vector} b
 * @returns {number}
 */
const vec_dot = (a, b) => {
    let out = 0;
    for (let i = 0; i < a.length; i++) out += a[i] * b[i];
    return out;
};

/**
 * @public
 * @param {Vector} a
 * @param {Vector} b
 * @param {number} t
 * @param {boolean} [clamp=false]
 * @param {Vector|undefined} [out=undefined]
 * @returns {Vector}
 */
const vec_lerp = (a, b, t, clamp=false, out=undefined) => {
    t = clamp ? t : Math.min(Math.max(t, 0), 1);
    const iT = 1 - t;
    const o = out || [];
    for (let i = 0; i < a.length; i++) o[i] = iT * a[i] + t * b[i];
    return o;
}

/**
 * @public
 * @param {Vector2} v
 * @param {boolean} [clockwise=false]
 * @param {Vector2|undefined} [out=undefined]
 * @returns {Vector2}
 */
const vec2_perpendicular = (v, clockwise=false, out=undefined) => {
    if (out) {
        if (clockwise) {
            out[0] = v[1];
            out[1] = -v[0];
        }
        else {
            out[0] = -v[1];
            out[1] = v[0];
        }
        return out;
    }
    return clockwise ? [v[1], -v[0]] : [-v[1], v[0]];
};

/**
 * @public
 * @param {Vector2} v
 * @param {number} [theta=0] 
 * @param {Vector2} [center=[0,0]]
 * @param {Vector2|undefined} [out=undefined]
 * @returns {Vector2}
 */
const vec2_rotate = (v, theta=0, center=vec2(), out=undefined) => {
    const x = v[0] - center[0];
    const y = v[1] - center[1];
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    if (out) {
        out[0] = center[0] + (x * c - s * y);
        out[1] = center[1] + (x * s + c * y);
        return out;
    }
    return [
        center[0] + (x * c - s * y),
        center[1] + (x * s + c * y)
    ];
};

/**
 * @public
 * @param {Vector3} v
 * @param {number} [theta=0]
 * @param {Vector3} [axis=[0,1,0]]
 * @param {Vector3|undefined} [out=undefined]
 */
const vec3_rotation = (v, theta=0, axis=[0,1,0], out=undefined) => {
    const a = vec_norm(axis);
    const co = Math.cos(theta);
    const si = Math.sin(theta);
    const ic = 1 - co;
    const d = vec_dot(a, v);
    const c = vec3_cross(a, v);
    if (out) {
        out[0] = v[0] * co + c[0] * si + a[0] * d * ic;
        out[1] = v[1] * co + c[1] * si + a[1] * d * ic;
        out[2] = v[2] * co + c[2] * si + a[2] * d * ic;
        return out;
    }
    return [
        v[0] * co + c[0] * si + a[0] * d * ic,
        v[1] * co + c[1] * si + a[1] * d * ic,
        v[2] * co + c[2] * si + a[2] * d * ic
    ];
};

/**
 * @public
 * @param {Vector3} a
 * @param {Vector3} b
 * @param {Vector3|undefined} [out=undefined]
 * @returns {Vector3}
 */
const vec3_cross = (a, b, out=undefined) => {
    if (out) {
        out[0] = a[1] * b[2] - a[2] * b[1];
        out[1] = a[2] * b[0] - a[0] * b[2];
        out[2] = a[0] * b[1] - a[1] * b[0];
        return out;
    }
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
};

/**
 * @public
 * @param {Vector3} v
 * @returns {string}
 */
const vec3_color_rgb = v => {
    return `rgb(${Math.floor(v[0])},${Math.floor(v[1])},${Math.floor(v[2])})`;
};

/**
 * @public
 * @param {Vector3} v
 * @returns {string}
 */
const vec3_color_hex = v => {
    return `#${Math.floor(v[0]).toString(16).padStart(2, '0')}${Math.floor(v[1]).toString(16).padStart(2, '0')}${Math.floor(v[2]).toString(16).padStart(2, '0')}`;
};

/**
 * @public
 * @param {Vector4} v
 * @returns {string}
 */
const vec4_color_rgb = v => {
    return `rgba(${Math.floor(v[0])},${Math.floor(v[1])},${Math.floor(v[2])},${v[3]})`;
};

/**
 * @public
 * @param {Vector4} v
 * @returns {string}
 */
const vec4_color_hex = v => {
    return `#${Math.floor(v[0]).toString(16).padStart(2, '0')}${Math.floor(v[1]).toString(16).padStart(2, '0')}${Math.floor(v[2]).toString(16).padStart(2, '0')}${Math.floor(v[3] * 255).toString(16).padStart(2, '0')}`;
};

/**
 * @public
 * @param {string} c
 * @param {Vector3|undefined} [out=undefined]
 * @returns {Vector3}
 * @throws {Error}
 */
const color_vec3_rgb = (c, out=undefined) => {
    const match = RegExp(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).exec(c);
    if (!match) throw new Error(`Invalid RGB color string format: ${c}`);
    if (out) {
        out[0] = parseInt(match[1]);
        out[1] = parseInt(match[2]);
        out[2] = parseInt(match[3]);
        return out;
    }
    return vec3(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
};

/**
 * @public
 * @param {string} c
 * @param {Vector3|undefined} [out=undefined]
 * @returns {Vector3}
 * @throws {Error}
 */
const color_vec3_hex = (c, out=undefined) => {
    const match = RegExp(/^#?([0-9a-fA-F]{6})$/).exec(c);
    if (!match) throw new Error(`Invalid hex color string format: ${c}`);
    const hex = match[1];
    if (out) {
        out[0] = parseInt(hex.substring(0, 2), 16);
        out[1] = parseInt(hex.substring(2, 4), 16);
        out[2] = parseInt(hex.substring(4, 6), 16);
        return out;
    }
    return vec3(
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16)
    );
};

/**
 * @public
 * @param {string} c
 * @param {Vector4|undefined} [out=undefined]
 * @returns {Vector4}
 */
const color_vec4_rgb = (c, out=undefined) => {
    const match = RegExp(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)$/).exec(c);
    if (!match) throw new Error(`Invalid RGBA color string format: ${c}`);
    if (out) {
        out[0] = parseInt(match[1]);
        out[1] = parseInt(match[2]);
        out[2] = parseInt(match[3]);
        out[3] = parseFloat(match[4]);
        return out;
    }
    return vec4(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseFloat(match[4]));
};

/**
 * @public
 * @param {string} c
 * @param {Vector4|undefined} [out=undefined]
 * @returns {Vector4}
 */
const color_vec4_hex = (c, out=undefined) => {
    const match = RegExp(/^#?([0-9a-fA-F]{8})$/).exec(c);
    if (!match) throw new Error(`Invalid hex color string format: ${c}`);
    const hex = match[1];
    if (out) {
        out[0] = parseInt(hex.substring(0, 2), 16);
        out[1] = parseInt(hex.substring(2, 4), 16);
        out[2] = parseInt(hex.substring(4, 6), 16);
        out[3] = parseInt(hex.substring(6, 8), 16) / 255;
        return out;
    }
    return vec4(
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16),
        parseInt(hex.substring(6, 8), 16) / 255
    );
};

export {
    vec2,
    vec3,
    vec4,

    vec2_to_vec3,
    vec2_to_vec4,
    vec3_to_vec2,
    vec3_to_vec4,
    vec4_to_vec2,
    vec4_to_vec3,

    vec_smag,
    vec_mag,
    vec_norm,

    vec_add,
    vec_sub,
    vec_mul,
    vec_div,
    vec_mod,
    vec_dot,
    vec_lerp,

    vec2_perpendicular,
    vec2_rotate,

    vec3_rotation,
    vec3_cross,

    vec3_color_rgb,
    vec3_color_hex,
    color_vec3_rgb,
    color_vec3_hex,

    vec4_color_rgb,
    vec4_color_hex,
    color_vec4_rgb,
    color_vec4_hex
};