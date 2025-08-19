/**
 * @file Matrix operations and utilities. 
 * @author nethe550
 * @license MIT
 * @version 1.1.0
 */

import * as vector from './vector.js';

/**
 * @typedef {import('./vector.js').Vector3} Vector3
 * @typedef {import('./vector.js').Vector4} Vector4
 */

/**
 * @typedef {[number, number, number, number, number, number, number, number, number]} Matrix3x3
 * @typedef {[number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]} Matrix4x4
 */

/**
 * @public
 * @param {number} [m00=1]
 * @param {number} [m01=0]
 * @param {number} [m02=0]
 * @param {number} [m10=0]
 * @param {number} [m11=1]
 * @param {number} [m12=0]
 * @param {number} [m20=0]
 * @param {number} [m21=0]
 * @param {number} [m22=1]
 * @param {Matrix3x3|undefined} [out=undefined]
 * @returns {Matrix3x3}
 */
const mat3x3 = (
    m00=1, m01=0, m02=0,
    m10=0, m11=1, m12=0,
    m20=0, m21=0, m22=1,
    out=undefined
) => {
    if (out) {
        out[0] = m00; out[1] = m10; out[2] = m20;
        out[3] = m01; out[4] = m11; out[5] = m21;
        out[6] = m02; out[7] = m12; out[8] = m22;
        return out;
    }
    return [
        m00, m10, m20,
        m01, m11, m21,
        m02, m12, m22
    ];
};

/**
 * @public
 * @param {Matrix3x3} m
 * @returns {number}
 */
const mat3x3_det = m => {
    return m[0] * (m[4] * m[8] - m[5] * m[7]) -
           m[1] * (m[3] * m[8] - m[5] * m[6]) +
           m[2] * (m[3] * m[7] - m[4] * m[6]);
};

/**
 * @public
 * @param {number} [m00=1]
 * @param {number} [m01=0]
 * @param {number} [m02=0]
 * @param {number} [m03=0]
 * @param {number} [m10=0]
 * @param {number} [m11=1]
 * @param {number} [m12=0]
 * @param {number} [m13=0]
 * @param {number} [m20=0]
 * @param {number} [m21=0]
 * @param {number} [m22=1]
 * @param {number} [m23=0]
 * @param {number} [m30=0]
 * @param {number} [m31=0]
 * @param {number} [m32=0]
 * @param {number} [m33=1]
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4 = (
    m00=1, m01=0, m02=0, m03=0,
    m10=0, m11=1, m12=0, m13=0,
    m20=0, m21=0, m22=1, m23=0,
    m30=0, m31=0, m32=0, m33=1,
    out=undefined
) => {
    if (out) {
        out[ 0] = m00; out[ 1] = m10; out[ 2] = m20; out[ 3] = m30;
        out[ 4] = m01; out[ 5] = m11; out[ 6] = m21; out[ 7] = m31;
        out[ 8] = m02; out[ 9] = m12; out[10] = m22; out[11] = m32;
        out[12] = m03; out[13] = m13; out[14] = m23; out[15] = m33;
        return out;
    }
    return [
        m00, m10, m20, m30,
        m01, m11, m21, m31,
        m02, m12, m22, m32,
        m03, m13, m23, m33
    ];
};

/**
 * @public
 * @param {Matrix4x4} m
 * @returns {number}
 */
const mat4x4_det = m => {
    return m[0] * mat3x3_det([m[5], m[6], m[7], m[9], m[10], m[11], m[13], m[14], m[15]]) -
           m[1] * mat3x3_det([m[4], m[6], m[7], m[8], m[10], m[11], m[12], m[14], m[15]]) +
           m[2] * mat3x3_det([m[4], m[5], m[7], m[8], m[9],  m[11], m[12], m[13], m[15]]) -
           m[3] * mat3x3_det([m[4], m[5], m[6], m[8], m[9],  m[10], m[12], m[13], m[14]]);
};

/**
 * @public
 * @param {Matrix4x4} m
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_inv = (m, out=undefined) => {
    const o = out || [];
    const det = mat4x4_det(m);
    if (det === 0) return o;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const submat = [];
            for (let r = 0; r < 4; r++) {
                if (r === i) continue;
                for (let c = 0; c < 4; c++) {
                    if (c === j) continue;
                    submat.push(m[r * 4 + c]);
                }
            }
            const minor = mat3x3_det(submat);
            o[j * 4 + i] = ((i + j) % 2 == 0 ? 1 : -1) * minor
        }
    }
    for (let i = 0; i < 16; i++) o[i] /= det;
    return o;
};

/**
 * @public
 * @param {Matrix4x4} a
 * @param {Matrix4x4} b
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_mul_mat4x4 = (a, b, out=undefined) => {
    const o = out || [];
    for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
            let s = 0;
            for (let k = 0; k < 4; k++) s += a[r + k * 4] * b[k + c * 4];
            o[r + c * 4] = s;
        }
    }
    return o;
};

/**
 * @public
 * @param {Matrix4x4} m
 * @param {Vector3} v
 * @param {Vector4|undefined} out
 * @returns {Vector4}
 */
const mat4x4_mul_vec3 = (m, v, w=0, out=undefined) => {
    const o = out || [];
    for (let i = 0; i < 4; i++) o[i] = m[i] * v[0] + m[i + 4] * v[1] + m[i + 8] * v[2] + m[i + 12] * w;
    return o;
};

/**
 * @public
 * @param {Matrix4x4} m
 * @param {Vector4} v
 * @param {Vector4|undefined} [out=undefined]
 * @returns {Vector4}
 */
const mat4x4_mul_vec4 = (m, v, out=undefined) => {
    const o = out || [];
    for (let i = 0; i < 4; i++) o[i] = m[i] * v[0] + m[i + 4] * v[1] + m[i + 8] * v[2] + m[i + 12] * v[3];
    return o;
};

/**
 * @public
 * @param {Vector3} [translation=[0,0,0]]
 * @param {Vector3} [rotation=[0,0,0]]
 * @param {Vector3} [scale=[1,1,1]]
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_transform = (translation=[0,0,0], rotation=[0,0,0], scale=[1,1,1], out=undefined) => {
    const [tx, ty, tz] = translation;
    const [rx, ry, rz] = rotation;
    const [sx, sy, sz] = scale;
    const cx = Math.cos(rx), sxr = Math.sin(rx);
    const cy = Math.cos(ry), syr = Math.sin(ry);
    const cz = Math.cos(rz), szr = Math.sin(rz);
    const m00 = cz * cy;
    const m01 = cz * syr * sxr - szr * cx;
    const m02 = cz * syr * cx + szr * sxr;
    const m10 = szr * cy;
    const m11 = szr * syr * sxr + cz * cx;
    const m12 = szr * syr * cx - cz * sxr;
    const m20 = -syr;
    const m21 = cy * sxr;
    const m22 = cy * cx;
    if (out) {
        out[ 0] = m00 * sx; out[ 1] = m01 * sx; out[ 2] = m02 * sx; out[ 3] = 0;
        out[ 4] = m10 * sy; out[ 5] = m11 * sy; out[ 6] = m12 * sy; out[ 7] = 0;
        out[ 8] = m20 * sz; out[ 9] = m21 * sz; out[10] = m22 * sz; out[11] = 0;
        out[12] = tx;       out[13] = ty;       out[14] = tz;       out[15] = 1;
        return out;
    }
    return [
        m00 * sx, m01 * sx, m02 * sx, 0,
        m10 * sy, m11 * sy, m12 * sy, 0,
        m20 * sz, m21 * sz, m22 * sz, 0,
        tx,       ty,       tz,       1
    ];
};

/**
 * @public
 * @param {Vector3} t
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_translation = (t, out=undefined) => {
    if (out) {
        out[ 0] =    1; out[ 1] =    0; out[ 2] =    0; out[ 3] = 0;
        out[ 4] =    0; out[ 5] =    1; out[ 6] =    0; out[ 7] = 0;
        out[ 8] =    0; out[ 9] =    0; out[10] =    1; out[11] = 0;
        out[12] = t[0]; out[13] = t[1]; out[14] = t[2]; out[15] = 1;
        return out;
    }
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        t[0], t[1], t[2], 1
    ];
};

/**
 * @public
 * @param {number} x
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_rotation_x = (x, out=undefined) => {
    const c = Math.cos(x), s = Math.sin(x);
    if (out) {
        out[ 0] = 1; out[ 1] = 0; out[ 2] =  0; out[ 3] = 0;
        out[ 4] = 0; out[ 5] = c; out[ 6] = -s; out[ 7] = 0;
        out[ 8] = 0; out[ 9] = s; out[10] =  c; out[11] = 0;
        out[12] = 0; out[13] = 0; out[14] =  0; out[15] = 1;
        return out;
    }
    return [
        1, 0,  0, 0,
        0, c, -s, 0,
        0, s,  c, 0,
        0, 0,  0, 1
    ];
};

/**
 * @public
 * @param {number} y
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_rotation_y = (y, out=undefined) => {
    const c = Math.cos(y), s = Math.sin(y);
    if (out) {
        out[ 0] =  c; out[ 1] = 0; out[ 2] = s; out[ 3] = 0;
        out[ 4] =  0; out[ 5] = 1; out[ 6] = 0; out[ 7] = 0;
        out[ 8] = -s; out[ 9] = 0; out[10] = c; out[11] = 0;
        out[12] =  0; out[13] = 0; out[14] = 0; out[15] = 1;
        return out;
    }
    return [
         c, 0, s, 0,
         0, 1, 0, 0,
        -s, 0, c, 0,
         0, 0, 0, 1
    ];
};

/**
 * @public
 * @param {number} z
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_rotation_z = (z, out=undefined) => {
    const c = Math.cos(z), s = Math.sin(z);
    if (out) {
        out[ 0] = c; out[ 1] = -s; out[ 2] = 0; out[ 3] = 0;
        out[ 4] = s; out[ 5] =  c; out[ 6] = 0; out[ 7] = 0;
        out[ 8] = 0; out[ 9] =  0; out[10] = 1; out[11] = 0;
        out[12] = 0; out[13] =  0; out[14] = 0; out[15] = 1;
        return out;
    }
    return [
        c, -s, 0, 0,
        s,  c, 0, 0,
        0,  0, 1, 0,
        0,  0, 0, 1
    ];
};

/**
 * @public
 * @param {Vector3} r
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_rotation = (r, out=undefined) => {
    const [cx, cy, cz] = r.map(v => Math.cos(v));
    const [sx, sy, sz] = r.map(v => Math.sin(v));
    if (out) {
        out[ 0] =                cy * cz; out[ 1] =                cy * sz; out[ 2] =     -sy; out[ 3] = 0;
        out[ 4] = sx * sy * cz - cx * sz; out[ 5] = sx * sy * sz + cx * cz; out[ 6] = sx * cy; out[ 7] = 0;
        out[ 8] = cx * sy * cz + sx * sz; out[ 9] = cx * sy * sz - sx * cz; out[10] = cx * cy; out[11] = 0;
        out[12] =                      0; out[13] =                      0; out[14] =       0; out[15] = 1;
        return out;
    }
    return [
                       cy * cz,                cy * sz,     -sy, 0,
        sx * sy * cz - cx * sz, sx * sy * sz + cx * cz, sx * cy, 0,
        cx * sy * cz + sx * sz, cx * sy * sz - sx * cz, cx * cy, 0,
                             0,                      0,       0, 1
    ];
};

/**
 * @public
 * @param {Vector3} s
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_scale = (s, out=undefined) => {
    if (out) {
        out[ 0] = s[0]; out[ 1] =    0; out[ 2] =    0; out[ 3] = 0;
        out[ 4] =    0; out[ 5] = s[1]; out[ 6] =    0; out[ 7] = 0;
        out[ 8] =    0; out[ 9] =    0; out[10] = s[2]; out[11] = 0;
        out[12] =    0; out[13] =    0; out[14] =    0; out[15] = 1;
        return out;
    }
    return [
        s[0],    0,    0, 0,
           0, s[1],    0, 0,
           0,    0, s[2], 0,
           0,    0,    0, 1
    ];
};

/**
 * @public
 * @param {number} [fov=60]
 * @param {number} [aspect=1]
 * @param {number} [near=0.1]
 * @param {number} [far=100]
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_projection = (fov=60, aspect=1, near=0.1, far=100, out=undefined) => {
    const rad = (fov * Math.PI) / 180;
    const f = 1 / Math.tan(rad * 0.5);
    if (out) {
        out[ 0] = f / aspect; out[ 1] = 0; out[ 2] =                            0;     out[ 3] =  0;
        out[ 4] =          0; out[ 5] = f; out[ 6] =                            0;     out[ 7] =  0;
        out[ 8] =          0; out[ 9] = 0; out[10] =     -(far + near) / (far - near); out[11] = -1;
        out[12] =          0; out[13] = 0; out[14] = -(2 * far * near) / (far - near); out[15] =  0;
        return out;
    }
    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, -(far + near) / (far - near), -1,
        0, 0, -(2 * far * near) / (far - near), 0
    ];
};

/**
 * @public
 * @param {Vector3} eye
 * @param {Vector3} [target=[0,0,0]] 
 * @param {Vector3} [up=[0,1,0]]
 * @param {Matrix4x4|undefined} [out=undefined]
 * @returns {Matrix4x4}
 */
const mat4x4_lookat = (eye, target=[0,0,0], up=[0,1,0], out=undefined) => {
    const f = vector.vec_norm(vector.vec_sub(target, eye));
    const r = vector.vec_norm(vector.vec3_cross(up, f));
    const u = vector.vec3_cross(f, r);
    if (out) {
        out[ 0] =                    r[0]; out[ 1] =                    u[0]; out[ 2] =                  -f[0]; out[ 3] = 0;
        out[ 4] =                    r[1]; out[ 5] =                    u[1]; out[ 6] =                  -f[1]; out[ 7] = 0;
        out[ 8] =                    r[2]; out[ 9] =                    u[2]; out[10] =                  -f[2]; out[11] = 0;
        out[12] = -vector.vec_dot(r, eye); out[13] = -vector.vec_dot(u, eye); out[14] = vector.vec_dot(f, eye); out[15] = 1;
        return out;
    }
    return [
        r[0], u[0], -f[0], 0,
        r[1], u[1], -f[1], 0,
        r[2], u[2], -f[2], 0,
        -vector.vec_dot(r, eye), -vector.vec_dot(u, eye), vector.vec_dot(f, eye), 1
    ];
};

export {
    mat3x3,
    mat3x3_det,

    mat4x4,
    mat4x4_det,
    mat4x4_inv,
    mat4x4_mul_mat4x4,
    mat4x4_mul_vec3,
    mat4x4_mul_vec4,

    mat4x4_translation,
    mat4x4_rotation_x,
    mat4x4_rotation_y,
    mat4x4_rotation_z,
    mat4x4_rotation,
    mat4x4_scale,

    mat4x4_transform,
    mat4x4_projection,
    mat4x4_lookat
};