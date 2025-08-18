import { vec2, vec3, vec4, vec3_to_vec4, vec_add, vec_sub, vec_mul, vec_div, vec_dot, vec_lerp, vec_norm, vec3_cross, vec3_color_hex, vec4_color_hex, vec4_to_vec2 } from '../util/vector.js';
import { mat4x4, mat4x4_mul_vec3, mat4x4_mul_vec4 } from '../util/matrix.js';
import { billboard_polyline, billboard_ngon, billboard_mat4x4 } from '../util/billboard.js';
import { BoidRenderingTypes } from '../../impl/static/js/StateStore.js';
import Canvas from './Canvas.js';
import Boids from '../Boids.js';

/**
 * @typedef {import('../util/matrix.js').Matrix4x4} Matrix4x4
 * @typedef {import('../util/vector.js').Vector2} Vector2
 * @typedef {import('../util/vector.js').Vector3} Vector3
 * @typedef {import('../util/vector.js').Vector4} Vector4
 */

/**
 * @typedef {import('../../impl/static/js/StateStore.js').BoidRenderingType} BoidRenderingType
 */

/**
 * The global scale of billboard models.
 * @private
 * @type {Vector3}
 */
const BILLBOARD_SCALE = vec3(1,1,1);

/**
 * A renderer of {@link Boids} simulations.
 * @class
 */
class Renderer {

    /**
     * The vertices of a tetrahedron representing a boid.
     * @public
     * @static
     * @readonly
     * @const {Vector3[]}
     */
    static BOID_TETRAHEDRON_MODEL = [
        vec3( 0.0,  0.0,  2.0), // f
        vec3( 0.5, -0.5, -0.5), // br
        vec3(-0.5, -0.5, -0.5), // bl
        vec3( 0.0,  0.5, -0.5)  // bt
    ];

    /**
     * The edges of a tetrahedron representing a boid.
     * @public
     * @static
     * @readonly
     * @const {Vector2[]}
     */
    static BOID_TETRAHEDRION_EDGES = [
        [0, 1], [0, 2], [0, 3], // from front
        [1, 2], [2, 3], [3, 1]  // back
    ];

    /**
     * The vertices of a triangle representing a boid.
     * @public
     * @static
     * @readonly
     * @const {Vector3[]}
     */
    static BOID_BILLBOARD = billboard_polyline(
        vec2(2.0,  0.0), // f
        vec2(0.0, -0.5), // bl
        vec2(0.0,  0.5), // br
    );

    /**
     * The vertices of a circle representing the interaction radius of a boid.
     * @public
     * @static
     * @readonly
     * @const {Vector3[]}
     */
    static BOID_INTERACTION_CIRCLE = billboard_ngon(16, 1, 0);

    /**
     * The edges of a rectangular prism.
     * @public
     * @static
     * @readonly
     * @const {Vector2[]}
     */
    static BOX_EDGES = [
        [0, 1], [1, 2], [2, 3], [3, 0], // bottom
        [4, 5], [5, 6], [6, 7], [7, 4], // top
        [0, 4], [1, 5], [2, 6], [3, 7]  // verticals
    ];

    /**
     * The planes defining a clip-space culling frustum.
     * @public
     * @static
     * @readonly
     * @const {Vector4[]}
     */
    static CLIP_PLANES = [
        [-1, 0, 0, 1], // Right
        [1, 0, 0, 1],  // Left
        [0, -1, 0, 1], // Top
        [0, 1, 0, 1],  // Bottom
        [0, 0, -1, 1], // Far
        [0, 0, 1, 1]   // Near
    ];

    /**
     * The canvas to be rendered to.
     * @private
     * @type {Canvas}
     */
    #canvas;

    /**
     * The boids simulation.
     * @private
     * @type {Boids}
     */
    #boids;

    /**
     * The "camera" projection matrix.
     * @private
     * @type {Matrix4x4}
     */
    #projection;

    /**
     * The "camera" view matrix.
     * @private
     * @type {Matrix4x4}
     */
    #view;

    /**
     * The global rendering scale of boids.
     * @private
     * @type {number}
     */
    #boidScale = 0.1;

    /**
     * The method used to render boids.
     * @private
     * @type {BoidRenderingType}
     */
    #boidRenderingType = BoidRenderingTypes.TETRAHEDRON;

    /**
     * Whether the interaction radii of boids should be rendered.
     * @private
     * @type {boolean}
     */
    #shouldRenderInteractionRadius = false;

    /**
     * Whether the bounds of the boids simulation should be rendered.
     * @private
     * @type {boolean}
     */
    #shouldRenderBounds = true;

    /**
     * Whether the space-partitioning octree of the boids simulation should be rendered.
     * @private
     * @type {boolean}
     */
    #shouldRenderTree = false;

    /**
     * The color of boids with 0 neighbors.
     * @private
     * @type {Vector3}
     */
    #minBoidColor = vec3(255, 63, 63);

    /**
     * The color of boids with {@link Boids.accuracy} neighbor(s).
     * @private
     * @type {Vector3}
     */
    #maxBoidColor = vec3(63, 255, 63);

    /**
     * The color of the boids simulation bounds wireframe box.
     * @private
     * @type {Vector4}
     */
    #boundsColor = vec4(255, 255, 255, 0.4);

    /**
     * The color of the boids simulation space-partitioning octree wireframe box(es).
     * @private
     * @type {Vector4}
     */
    #treeColor = vec4(63, 63, 255, 0.2);

    /**
     * The color of the boids' interaction radii.
     * @private
     * @type {Vector4}
     */
    #radiusColor = vec4(255, 63, 255, 0.125);

    /**
     * Creates a new {@link Boids} simulation renderer.
     * @constructor
     * @param {Canvas} canvas - The canvas to render to.
     * @param {Boids} boids - The simulation to render.
     * @param {Matrix4x4} projection - The "camera" projection matrix.
     * @param {Matrix4x4} view - The "camera" view matrix.
     * @param {number} [boidScale=0.1] - The global rendering scale of boids.
     * @param {BoidRenderingType} [boidRenderingType='tetrahedron'] - The method used to render boids.
     * @param {boolean} [renderInteractionRadius=false] - Whether boids' interaction radii should be rendered.
     * @param {boolean} [renderBounds=true] - Whether the bounds of the simulation should be rendered.
     * @param {boolean} [renderTree=false] - Whether the space-partitioning octree of the simulation should be rendered.
     * @param {Vector3} [minBoidColor=[255,63,63]] - The color of boids with 0 neighbors.
     * @param {Vector3} [maxBoidColor=[63,255,63]] - The color of boids with {@link Boids.accuracy} neighbor(s).
     * @param {Vector4} [radiusColor=[255,63,255,0.125]] - The color of the boids' interaction radii.
     * @param {Vector4} [boundsColor=[255,255,255,0.4]] - The color of the simulation bounds.
     * @param {Vector4} [treeColor=[63,63,255,0.2]] - The color of the space-partitioning octree.
     */
    constructor(canvas, boids, projection, view, boidScale=0.1, boidRenderingType=BoidRenderingTypes.TETRAHEDRON, renderInteractionRadius=false, renderBounds=true, renderTree=false, minBoidColor=[255,63,63], maxBoidColor=[63,255,63], radiusColor=[255,63,255,0.125], boundsColor=[255,255,255,0.4], treeColor=[63,63,255,0.2]) {
        this.#canvas = canvas;
        this.#boids = boids;
        this.#projection = projection;
        this.#view = view;
        this.#boidScale = boidScale;
        this.#boidRenderingType = boidRenderingType;
        this.#shouldRenderInteractionRadius = renderInteractionRadius;
        this.#shouldRenderBounds = renderBounds;
        this.#shouldRenderTree = renderTree;
        this.#minBoidColor = minBoidColor;
        this.#maxBoidColor = maxBoidColor;
        this.#radiusColor = radiusColor;
        this.#boundsColor = boundsColor;
        this.#treeColor = treeColor;
    }

    /**
     * The canvas being rendered to.
     * @public
     * @readonly
     * @type {Canvas}
     */
    get canvas() { return this.#canvas; }

    /**
     * The simulation being rendered.
     * @public
     * @type {Boids}
     */
    get boids() { return this.#boids; }

    /**
     * The simulation being rendered.
     * @public
     * @param {Boids} b
     */
    set boids(b) { this.#boids = b; }

    /**
     * The "camera" projection matrix.
     * @public
     * @type {Matrix4x4}
     */
    get projection() { return this.#projection; }

    /**
     * The "camera" projection matrix.
     * @public
     * @param {Matrix4x4} p
     */
    set projection(p) { this.#projection = p; }

    /**
     * The "camera" view matrix.
     * @public
     * @type {Matrix4x4}
     */
    get view() { return this.#view; }
 
    /**
     * The "camera" view matrix.
     * @public
     * @param {Matrix4x4} v
     */
    set view(v) { this.#view = v; }

    /**
     * The global rendering scale of boids.
     * @public
     * @type {number}
     */
    get boidScale() { return this.#boidScale; }

    /**
     * The global rendering scale of boids.
     * @public
     * @param {number} s
     */
    set boidScale(s) { this.#boidScale = s; }

    /**
     * The method used to render boids.
     * @public
     * @type {BoidRenderingType}
     */
    get boidRenderingType() { return this.#boidRenderingType; }

    /**
     * The method used to render boids.
     * @public
     * @param {BoidRenderingType} t
     */
    set boidRenderingType(t) { this.#boidRenderingType = t; }

    /**
     * Whether the boids' interaction radii should be rendered.
     * @public
     * @type {boolean}
     */
    get renderInteractionRadius() { return this.#shouldRenderInteractionRadius; }

    /**
     * Whether the boids' interaction radii should be rendered.
     * @public
     * @param {boolean} i
     */
    set renderInteractionRadius(i) { this.#shouldRenderInteractionRadius = i; }

    /**
     * Whether the bounds of the simulation should be rendered.
     * @public
     * @type {boolean}
     */
    get renderBounds() { return this.#shouldRenderBounds; }

    /**
     * Whether the bounds of the simulation should be rendered.
     * @public
     * @param {boolean} b
     */
    set renderBounds(b) { this.#shouldRenderBounds = b; }

    /**
     * Whether the space-partitioning octree of the simulation should be rendered.
     * @public
     * @type {boolean}
     */
    get renderTree() { return this.#shouldRenderTree; }

    /**
     * Whether the space-partitioning octree of the simulation should be rendered.
     * @public
     * @param {boolean} t
     */
    set renderTree(t) { this.#shouldRenderTree = t; }

    /**
     * The color of boids with 0 neighbors.
     * @public
     * @type {Vector3}
     */
    get minBoidColor() { return this.#minBoidColor; }

    /**
     * The color of boids with 0 neighbors.
     * @public
     * @param {Vector3} c
     */
    set minBoidColor(c) { this.#minBoidColor = c; }

    /**
     * The color of boids with {@link Boids.accuracy} neighbor(s).
     * @public
     * @type {Vector3}
     */
    get maxBoidColor() { return this.#maxBoidColor; }

    /**
     * The color of boids with {@link Boids.accuracy} neighbor(s).
     * @public
     * @param {Vector3} c
     */
    set maxBoidColor(c) { this.#maxBoidColor = c; }

    /**
     * The color of the simulation's bounds.
     * @public
     * @type {Vector4}
     */
    get boundsColor() { return this.#boundsColor; }

    /**
     * The color of the simulation's bounds.
     * @public
     * @param {Vector4} c
     */
    set boundsColor(c) { this.#boundsColor = c; }

    /**
     * The color of the simulation's space-partitioning octree.
     * @public
     * @type {Vector4}
     */
    get treeColor() { return this.#treeColor; }

    /**
     * The color of the simulation's space-partitioning octree.
     * @public
     * @param {Vector4} c
     */
    set treeColor(c) { this.#treeColor = c; }

    /**
     * The color of the boids' interaction radii.
     * @public
     * @type {Vector4}
     */
    get radiusColor() { return this.#radiusColor; }

    /**
     * The color of the boids' interaction radii.
     * @public
     * @param {Vector4} c
     */
    set radiusColor(c) { this.#radiusColor = c; }

    /**
     * Renders the current {@link Boids} simulation.
     * @public
     * @returns {void}
     */
    render() {
        this.#canvas.ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        const temp_vec2_1 = vec2();
        const temp_vec4_1 = vec4();
        const temp_vec4_2 = vec4();
        const temp_vec4_3 = vec4();
        const temp_vec4_4 = vec4();
        
        if (this.#shouldRenderBounds) {
            const temp_vec2_2 = vec2();
            this.#renderBounds(temp_vec4_1, temp_vec4_2, temp_vec4_3, temp_vec4_4, temp_vec2_1, temp_vec2_2);
        }

        if (this.#boidRenderingType !== BoidRenderingTypes.NONE || this.#shouldRenderInteractionRadius) { // only iterate if necessary
            const temp_vec3_1 = vec3();
            const temp_mat4x4_1 = mat4x4();
            
            /** @type {((position: Vector3, velocity: Vector3, neighborCount: number) => void)} */
            let renderfunc = () => {}; // no-op
            if (this.#boidRenderingType === BoidRenderingTypes.TETRAHEDRON) {
                const temp_vec2_2 = vec2();
                const temp_vec3_2 = vec3();
                const temp_vec3_3 = vec3();
                renderfunc = this.#renderBoidTetrahedron.bind(this, temp_vec2_1, temp_vec2_2, temp_vec3_1, temp_vec3_2, temp_vec3_3, temp_vec4_1, temp_vec4_2, temp_mat4x4_1);
            }
            else if (this.#boidRenderingType === BoidRenderingTypes.BILLBOARD) renderfunc = this.#renderBoidBillboard.bind(this, temp_vec2_1, temp_vec3_1, temp_vec4_1, temp_vec4_2, temp_vec4_3, temp_mat4x4_1);

            for (let i = 0; i < this.#boids.N; i++) {
                const position = this.#boids.positions[i];
                const velocity = this.#boids.velocities[i];
                const neighborCount = this.#boids.neighbourCount[i];
                renderfunc(position, velocity, neighborCount);
                if (this.#shouldRenderInteractionRadius) {
                    const nfac = neighborCount / this.#boids.accuracy;
                    if (Math.abs(nfac) < 1e-6) continue; // invisible
                    const bbmodel = billboard_mat4x4(this.#view, position, 0, vec_mul(BILLBOARD_SCALE, this.#boids.interactionRadius, temp_vec3_1));
                    this.drawBillboard(Renderer.BOID_INTERACTION_CIRCLE, bbmodel, true, null, [this.#radiusColor[0], this.#radiusColor[1], this.#radiusColor[2], this.#radiusColor[3] * nfac], temp_vec4_1, temp_vec4_2, temp_vec2_1);
                }
            }
        }

        if (this.#shouldRenderTree) this.#renderTree();
    }

    /**
     * Renders a boid with the tetrahedron model.
     * - Aligns the major axis of the tetrahedron with the boid's velocity direction.
     * @private
     * @param {Vector2} temp_vec2_1 - A (unique) temporary intermediate vector.
     * @param {Vector2} temp_vec2_2 - A (unique) temporary intermediate vector.
     * @param {Vector3} temp_vec3_1 - A (unique) temporary intermediate vector.
     * @param {Vector3} temp_vec3_2 - A (unique) temporary intermediate vector.
     * @param {Vector3} temp_vec3_3 - A (unique) temporary intermediate vector.
     * @param {Vector4} temp_vec4_1 - A (unique) temporary intermediate vector.
     * @param {Vector4} temp_vec4_2 - A (unique) temporary intermediate vector.
     * @param {Matrix4x4} temp_mat4x4_1 - A (unique) temporary intermediate matrix.
     * @param {Vector3} position - The position of the boid.
     * @param {Vector3} velocity - The velocity of the boid.
     * @param {number} neighborCount - The number of neighbors the boid has.
     * @returns {void}
     */
    #renderBoidTetrahedron(temp_vec2_1, temp_vec2_2, temp_vec3_1, temp_vec3_2, temp_vec3_3, temp_vec4_1, temp_vec4_2, temp_mat4x4_1, position, velocity, neighborCount) {
        this.#canvas.ctx.beginPath();
        this.#canvas.ctx.strokeStyle = vec3_color_hex(this.#boidGradient(neighborCount, this.#boids.accuracy, temp_vec4_1));
        this.#createBoidTetrahedronModelMatrix(position, velocity, temp_vec3_1, temp_vec3_2, temp_vec3_3, temp_mat4x4_1);

        const projected = Renderer.BOID_TETRAHEDRON_MODEL.map(p_local => {
            const worldPos = mat4x4_mul_vec3(temp_mat4x4_1, p_local, 1, temp_vec3_1);
            const clipPos = mat4x4_mul_vec4(this.#projection, mat4x4_mul_vec4(this.#view, vec3_to_vec4(worldPos, 1, temp_vec4_2)));
            return clipPos;
        });

        for (const [a, b] of Renderer.BOID_TETRAHEDRION_EDGES) {
            const p1_clip = projected[a];
            const p2_clip = projected[b];

            const t_values = Renderer.ClipLine(p1_clip, p2_clip, temp_vec4_1);

            if (t_values !== null) {
                const { t_min, t_max } = t_values;
                vec_sub(p2_clip, p1_clip, temp_vec4_1);

                vec_add(p1_clip, vec_mul(temp_vec4_1, t_min, temp_vec4_2), temp_vec4_2);
                Renderer.ToScreenFromClip(this.#canvas, temp_vec4_2, temp_vec2_1, temp_vec2_2)
                this.#canvas.ctx.moveTo(temp_vec2_1[0], temp_vec2_1[1]);
                
                vec_add(p1_clip, vec_mul(temp_vec4_1, t_max, temp_vec4_2), temp_vec4_2);
                Renderer.ToScreenFromClip(this.#canvas, temp_vec4_2, temp_vec2_1, temp_vec2_2);
                this.#canvas.ctx.lineTo(temp_vec2_1[0], temp_vec2_1[1]);
            }
        }
        this.#canvas.ctx.stroke();
    }

    /**
     * Renders a boid with the triangle model.
     * - Aligns the major axis of the triangle with the boid's screen-space velocity direction.
     * - Aligns the normal direction of the triangle with the "camera".
     * 
     * The screen-space velocity may degenerate to a zero-vector in cases where the "camera" is
     * looking directly along the world-space velocity vector. This is an inherent limitation of
     * rendering a three-dimensional direction as a two-dimensional polygon, resulting in angle
     * inaccuracy and/or rotational instability when viewing boids moving directly toward or away
     * from the camera.
     * @private
     * @param {Vector2} temp_vec2_1 - A (unique) temporary intermediate vector.
     * @param {Vector3} temp_vec3_1 - A (unique) temporary intermediate vector.
     * @param {Vector4} temp_vec4_1 - A (unique) temporary intermediate vector.
     * @param {Vector4} temp_vec4_2 - A (unique) temporary intermediate vector.
     * @param {Vector4} temp_vec4_3 - A (unique) temporary intermediate vector.
     * @param {Matrix4x4} temp_mat4x4 - A (unique) temporary intermediate matrix.
     * @param {Vector3} position - The position of the boid.
     * @param {Vector3} velocity - The velocity of the boid.
     * @param {number} neighborCount - The number of neighbors the boid has.
     * @returns {void}
     */
    #renderBoidBillboard(temp_vec2_1, temp_vec3_1, temp_vec4_1, temp_vec4_2, temp_vec4_3, temp_mat4x4, position, velocity, neighborCount) {
        temp_vec3_1 ||= vec3();
        mat4x4_mul_vec3(this.#view, velocity, 0, temp_vec3_1);
        const rotation = Math.atan2(temp_vec3_1[1], temp_vec3_1[0]); // will degenerate if temp_vec3_1 approaches 0-magnitude
        vec3(this.#boidScale, this.#boidScale, this.#boidScale, temp_vec3_1);
        billboard_mat4x4(this.#view, position, rotation, temp_vec3_1, temp_mat4x4);
        vec3_to_vec4(this.#boidGradient(neighborCount, this.#boids.accuracy), 1, temp_vec4_3);
        this.drawBillboard(Renderer.BOID_BILLBOARD, temp_mat4x4, true, undefined, temp_vec4_3, temp_vec4_1, temp_vec4_2, temp_vec2_1);
    }

    /**
     * Samples the color of a boid with a given number of neighbors.
     * - Linearly interpolates between `#minBoidColor` and `#maxBoidColor`.
     * @private
     * @param {number} neighborCount - The number of neighbors the boid has.
     * @param {number} maxNeighborCount - The maximum number of neighbors the boid can have.
     * @param {Vector3|Vector4|undefined} temp_vec3or4_1 - A (unique) temporary intermediate vector.
     * @returns {Vector3} The interpolated color.
     */
    #boidGradient(neighborCount, maxNeighborCount, temp_vec3or4_1) {
        return vec_lerp(this.#minBoidColor, this.#maxBoidColor, neighborCount / maxNeighborCount, true, temp_vec3or4_1);
    }

    /**
     * Creates a transformation matrix for a boid being rendered with the tetrahedron model.
     * @private
     * @param {Vector3} position - The position of the boid.
     * @param {Vector3} velocity - The velocity of the boid.
     * @param {Vector3} basis_forward - An intermediate vector used to hold the forward direction.
     * @param {Vector3} basis_up - An intermediate vector used to hold the up direction.
     * @param {Vector3} basis_right - An intermediate vector used to hold the right direction.
     * @param {Matrix4x4} out_mat4x4 - A unique 4x4 matrix to hold the result.
     * @returns {Matrix4x4} The generated transformation matrix.
     */
    #createBoidTetrahedronModelMatrix(position, velocity, basis_forward, basis_up, basis_right, out_mat4x4) {
        vec_norm(velocity, basis_forward); // velocity direction
        vec3(0, 1, 0, basis_up); // up direction
        if (Math.abs(vec_dot(basis_forward, basis_up)) > 0.99) vec3(0, 0, 1, basis_up); // reassign up direction
        vec_norm(vec3_cross(basis_forward, basis_up, basis_right), basis_right); // right direction
        vec3_cross(basis_right, basis_forward, basis_up); // reassign up direction
        return mat4x4(
            basis_right[0] * this.#boidScale, basis_up[0] * this.#boidScale, basis_forward[0] * this.#boidScale, position[0],
            basis_right[1] * this.#boidScale, basis_up[1] * this.#boidScale, basis_forward[1] * this.#boidScale, position[1],
            basis_right[2] * this.#boidScale, basis_up[2] * this.#boidScale, basis_forward[2] * this.#boidScale, position[2],
                                          0,                            0,                                 0,           1,
            out_mat4x4
        );
    }

    /**
     * Renders a wireframe box from the bounds of the {@link Boids} simulation.
     * @private
     * @param {Vector4|undefined} [temp_view_pos=undefined] - A (unique) intermediate vector to hold the view position of each box vertex.
     * @param {Vector4|undefined} [temp_delta=undefined] - A (unique) intermediate vector to hold the difference between two view-space vertices along an edge.
     * @param {Vector4|undefined} [temp_interpolated=undefined] - A (unique) intermediate vector to hold the interpolated view-space position along an edge.
     * @param {Vector4|undefined} [temp_clipped_cpos=undefined] - A (unique) intermediate vector to hold the clip-space position of a vertex along a frustum-clipped edge.
     * @param {Vector2|undefined} [temp_screen_pos=undefined] - A (unique) intermediate vector to hold the screen position of each box vertex.
     * @param {Vector2|undefined} [temp_ndc=undefined] - A (unique) intermediate vector to hold the NDC (normalized device coordinates) position of each box vertex.
     * @returns {void}
     */
    #renderBounds(temp_delta=undefined, temp_view_pos=undefined, temp_interpolated=undefined, temp_clipped_cpos=undefined, temp_screen_pos=undefined, temp_ndc=undefined) {
        const min = this.#boids.minBounds;
        const max = this.#boids.maxBounds;
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
        this.drawBox(corners, this.#boundsColor, temp_delta, temp_view_pos, temp_interpolated, temp_clipped_cpos, temp_screen_pos, temp_ndc);
    }

    /**
     * Renders the space-partitioning octree of the {@link Boids} simulation.
     * @private
     * @returns {void}
     */
    #renderTree() {
        if (this.#boids.tree) this.#boids.tree.draw(this, this.#treeColor);
    }

    /**
     * Renders a rectangular prism given its corners and a color.
     * @public
     * @param {Vector3[]|Vector4[]} corners - The corners of the box.
     * @param {Vector4} color - The color of the box.
     * @param {Vector4|undefined} [temp_delta=undefined] - A (unique) intermediate vector to hold the difference between two view-space vertices along an edge.
     * @param {Vector4|undefined} [temp_view_pos=undefined] - A (unique) intermediate vector to hold the view position of each box vertex.
     * @param {Vector4|undefined} [temp_interpolated=undefined] - A (unique) intermediate vector to hold the interpolated view-space position along an edge.
     * @param {Vector4|undefined} [temp_clipped_cpos=undefined] - A (unique) intermediate vector to hold the clip-space position of a vertex along a frustum-clipped edge.
     * @param {Vector2|undefined} [temp_screen_pos=undefined] - A (unique) intermediate vector to hold the screen position of each box vertex.
     * @param {Vector2|undefined} [temp_ndc=undefined] - A (unique) intermediate vector to hold the NDC (normalized device coordinates) position of each box vertex.
     * @returns {void}
     */
    drawBox(corners, color, temp_delta=undefined, temp_view_pos=undefined, temp_interpolated=undefined, temp_clipped_cpos=undefined, temp_screen_pos=undefined, temp_ndc=undefined) {
        temp_view_pos ||= vec4();
        temp_delta ||= vec4();
        temp_interpolated ||= vec4();
        temp_clipped_cpos ||= vec4();
        temp_screen_pos ||= vec2();
        temp_ndc ||= vec2();

        const projected = corners.map(corner => Renderer.GetClipPosition(this.#projection, this.#view, corner, temp_view_pos));
        this.#canvas.ctx.beginPath();
        this.#canvas.ctx.strokeStyle = vec4_color_hex(color);

        for (const [a, b] of Renderer.BOX_EDGES) {
            const p1 = projected[a];
            const p2 = projected[b];
            const t_values = Renderer.ClipLine(p1.cpos, p2.cpos);
            if (t_values !== null) {
                const { t_min, t_max } = t_values;
                vec_sub(p2.cpos, p1.cpos, temp_delta);
                
                vec_add(p1.cpos, vec_mul(temp_delta, t_min, temp_interpolated), temp_clipped_cpos);
                Renderer.ToScreenFromClip(this.#canvas, temp_clipped_cpos, temp_screen_pos, temp_ndc);
                this.#canvas.ctx.moveTo(temp_screen_pos[0], temp_screen_pos[1]);

                vec_add(p1.cpos, vec_mul(temp_delta, t_max, temp_interpolated), temp_clipped_cpos);
                Renderer.ToScreenFromClip(this.#canvas, temp_clipped_cpos, temp_screen_pos, temp_ndc);
                this.#canvas.ctx.lineTo(temp_screen_pos[0], temp_screen_pos[1]);
            }
        }
        this.#canvas.ctx.stroke();
    }

    /**
     * Renders a billboard.
     * @public
     * @param {Vector3[]} bb - The billboard vertices.
     * @param {Matrix4x4} model - The billboard transformation matrix.
     * @param {boolean} [closed=true] - Whether the billboard should be treated as a closed polyline.
     * @param {Vector4|null} [stroke=null] - The stroke color.
     * @param {Vector4|null} [fill=null] - The fill color.
     * @param {Vector4|undefined} [temp_vec4_1=undefined] - A (unique) temporary intermediate vector.
     * @param {Vector4|undefined} [temp_vec4_2=undefined] - A (unique) temporary intermediate vector.
     * @param {Vector2|undefined} [temp_ndc=undefined] - A (unique) temporary intermediate vector to hold NDC (normalized device coordinates) positions of billboard vertices.
     * @returns {void}
     */
    drawBillboard(bb, model, closed=true, stroke=null, fill=null, temp_vec4_1=undefined, temp_vec4_2=undefined, temp_ndc=undefined) {
        if (!stroke && !fill) return; // invisible

        temp_vec4_1 ||= vec4();
        temp_vec4_2 ||= vec4();
        temp_ndc ||= vec2();        
        
        const world = bb.map(p => mat4x4_mul_vec3(model, p, 1));
        const clip = world.map(wpos => mat4x4_mul_vec4(this.#projection, mat4x4_mul_vec4(this.#view, wpos, temp_vec4_1)));
        
        if (closed && fill) {
            const clippedPoly = Renderer.ClipPolygon(clip, temp_vec4_1, temp_vec4_2);
            if (clippedPoly) {
                const screenPoly = clippedPoly.map(v => Renderer.ToScreenFromClip(this.#canvas, v, undefined, temp_ndc));
                this.#canvas.ctx.beginPath();
                this.#canvas.ctx.moveTo(screenPoly[0][0], screenPoly[0][1]);
                for (let i = 1; i < screenPoly.length; i++) this.#canvas.ctx.lineTo(screenPoly[i][0], screenPoly[i][1]);
                this.#canvas.ctx.closePath();
                this.#canvas.ctx.fillStyle = vec4_color_hex(fill);
                this.#canvas.ctx.fill();
                if (stroke) {
                    this.#canvas.ctx.strokeStyle = vec4_color_hex(stroke);
                    this.#canvas.ctx.stroke();
                }
            }
        }

        const clippedLines = Renderer.ClipPolyline(closed, clip, temp_vec4_1, temp_vec4_2);
        if (stroke && clippedLines) {
            const screenLines = clippedLines.map(poly => poly.map(v => Renderer.ToScreenFromClip(this.#canvas, v, undefined, temp_ndc)));
            this.#canvas.ctx.beginPath();
            this.#canvas.ctx.strokeStyle = vec4_color_hex(stroke);
            for (const line of screenLines) {
                this.#canvas.ctx.moveTo(line[0][0], line[0][1]);
                this.#canvas.ctx.lineTo(line[1][0], line[1][1]);
            }
            this.#canvas.ctx.stroke();
        }
    }

    /**
     * Calculates the clip-space position of a world-space position.
     * @public
     * @static
     * @param {Matrix4x4} projection - The "camera" projection matrix.
     * @param {Matrix4x4} view - The "camera" view matrix.
     * @param {Vector3} point - The world-space position.
     * @param {Vector4|undefined} [temp_view_pos=undefined] - A temporary intermediate vector to hold the view-space position.
     * @returns {{ cpos: Vector4, isVisible: boolean }} The clip-space position and whether the position is within the "camera" frustum.
     */
    static GetClipPosition(projection, view, point, temp_view_pos=undefined) {
        temp_view_pos ||= vec4();
        mat4x4_mul_vec3(view, point, 1, temp_view_pos); // view pos
        const cpos = mat4x4_mul_vec4(projection, temp_view_pos); // clip pos
        const isVisible = !(cpos[0] > cpos[3] || cpos[0] < -cpos[3] ||
                            cpos[1] > cpos[3] || cpos[1] < -cpos[3] ||
                            cpos[2] > cpos[3] || cpos[2] < -cpos[3]);
        return { cpos, isVisible };
    }

    /**
     * Calculates the screen-space position of a clip-space position.
     * @public
     * @static
     * @param {Canvas} canvas - The {@link Canvas} to reference as the "screen".
     * @param {Vector4} clip - The clip-space position.
     * @param {Vector2|undefined} [out_screenpos=undefined] - If not `undefined`, then the screen-space result of this calculation.
     * @param {Vector2|undefined} [temp_ndc=undefined] - A temporary intermediate vector to hold the NDC (normalized device coordinates) of the position.
     * @returns {Vector2} Either `out_screenpos` if it is not `undefined`, or a new {@link Vector2} holding the screen-space position.
     */
    static ToScreenFromClip(canvas, clip, out_screenpos=undefined, temp_ndc=undefined) {
        temp_ndc ||= vec2();
        vec_div(vec4_to_vec2(clip, temp_ndc), clip[3], temp_ndc);
        if (out_screenpos) {
            out_screenpos[0] = Math.floor((temp_ndc[0] + 1) * 0.5 * canvas.width);
            out_screenpos[1] = Math.floor((1 - (temp_ndc[1] + 1) * 0.5) * canvas.height);
            return out_screenpos;
        }
        return vec2(
            Math.floor((temp_ndc[0] + 1) * 0.5 * canvas.width),
            Math.floor((1 - (temp_ndc[1] + 1) * 0.5) * canvas.height)
        );
    }

    /**
     * Calculates a screen-space position from a world-space position.
     * @public
     * @static
     * @param {Canvas} canvas - The {@link Canvas} to reference as the "screen".
     * @param {Matrix4x4} projection - The "camera" projection matrix.
     * @param {Matrix4x4} view - The "camera" view matrix.
     * @param {Vector3} point - The world-space position.
     * @param {Vector2|undefined} [out_screenpos=undefined] - If not `undefined`, then the screen-space result of this calculation.
     * @param {Vector4|undefined} [temp_view_pos=undefined] - A (unique) temporary intermediate vector to hold the view-space position of the point.
     * @param {Vector2|undefined} [temp_ndc=undefined] - A (unique) temporary intermediate vector to hold the NDC (normalized device coordinates) of the position.
     * @returns {Vector2|null} If the point is visible, either `out_screenpos` if it is not `undefined`, or a {@link Vector2} holding the screen-space position. `null` if the point is not visible in the "camera" frustum.
     */
    static ToScreen(canvas, projection, view, point, out_screenpos=undefined, temp_view_pos=undefined, temp_ndc=undefined) {
        const { cpos, isVisible } = Renderer.GetClipPosition(projection, view, point, temp_view_pos);
        if (!isVisible) return null;
        return Renderer.ToScreenFromClip(canvas, cpos, out_screenpos, temp_ndc);
    }
    
    /**
     * Sutherland-Hodgman line-clipping algorithm.
     * - Calculates the parametric `t_min` and/or `t_max` value(s) that determine the visible endpoint(s) of the line.
     * @public
     * @static
     * @param {Vector4} p1_cpos - The first clip-space position.
     * @param {Vector4} p2_cpos - The second clip-space position.
     * @param {Vector4|undefined} [temp_diff=undefined] - A temporary intermediate vector to hold the difference of `p2_cpos` and `p1_cpos`.
     * @returns {{ t_min: number, t_max: number }|null} The parametric value(s) if the line is fully/partially visible, or `null` if the line is completely invisible.
     */
    static ClipLine(p1_cpos, p2_cpos, temp_diff=undefined) {
        let t_min = 0; // entry parameter
        let t_max = 1; // exit parameter
        temp_diff ||= vec4();
        vec_sub(p2_cpos, p1_cpos, temp_diff);
        for (const plane of Renderer.CLIP_PLANES) {
            const p_dot_plane = vec_dot(p1_cpos, plane);
            const diff_dot_plane = vec_dot(temp_diff, plane);
            // line parallel to the plane
            if (Math.abs(diff_dot_plane) < 1e-6) {
                if (p_dot_plane < 0) return null; // parallel and on outside of plane; cull
                continue;
            }
            const t = -p_dot_plane / diff_dot_plane;
            if (diff_dot_plane > 0) t_min = Math.max(t_min, t); // line moving toward normal (outside -> inside; entry point)
            else t_max = Math.min(t_max, t); // line moving away from normal (inside -> outside; exit point)
        }

        if (t_min < t_max) return { t_min, t_max };    
        else return null;
    }

    /**
     * An abstraction of the Sutherland-Hodgman line-clipping algorithm, extended to polylines.
     * @see {@link Renderer.ClipLine()}
     * @public
     * @static
     * @param {boolean} closed - Whether the polyline should be considered as closed.
     * @param {Vector4[]} cpos_points - The clip-space positions of the polyline vertices.
     * @param {Vector4|undefined} [temp_vec4_1=undefined] - A (unique) temporary intermediate vector.
     * @param {Vector4|undefined} [temp_vec4_2=undefined] - A (unique) temporary intermediate vector.
     * @returns {Vector4[][]|null} - A collection of clip-space 2-point line pairs, or `null` if the polyline contains less than 2 points or is completely invisible.
     */
    static ClipPolyline(closed, cpos_points, temp_vec4_1=undefined, temp_vec4_2=undefined) {
        temp_vec4_1 ||= vec4();
        temp_vec4_2 ||= vec4();
        const out = [];
        const N = cpos_points.length;
        if (N < 2) return null; // cannot form a line
        const maxI = closed ? N : N - 1;
        for (let i = 0; i < maxI; i++) {
            const a = cpos_points[i];
            const b = cpos_points[(i + 1) % N]; // wrap index
            const res = Renderer.ClipLine(a, b, temp_vec4_1);
            if (res != null) {
                const { t_min, t_max } = res;
                vec_sub(b, a, temp_vec4_1); // NOSONAR (S2234) intentional
                const cA = vec_add(a, vec_mul(temp_vec4_1, t_min, temp_vec4_2));
                const cB = vec_add(a, vec_mul(temp_vec4_1, t_max, temp_vec4_2));
                out.push([cA, cB]); // clipped line
            }
        }
        return out.length > 0 ? out : null;
    }

    /**
     * An abstraction of the Sutherland-Hodgman line-clipping algorithm, extended to polygons.
     * @see {@link Renderer.ClipLine()}
     * @see {@link Renderer.ClipPolyline()}
     * @public
     * @static
     * @param {Vector4[]} cpos_polygon - The clip-space positions of the polygon vertices.
     * @param {Vector4|undefined} [temp_diff=undefined] - A (unique) intermediate vector to hold the difference of the points of each line segment.
     * @param {Vector4|undefined} [temp_interpolated=undefined] - A (unique) intermediate vector to hold the interpolated position of a vertex along a clipped line.
     * @returns {Vector4[]|null} A collection of clip-space positions, or `null` if the polygon contains 0 points or is completely invisible.
     */
    static ClipPolygon(cpos_polygon, temp_diff=undefined, temp_interpolated=undefined) {
        temp_diff ||= vec4();
        temp_interpolated ||= vec4();

        let out = cpos_polygon;
        for (const plane of Renderer.CLIP_PLANES) {
            const input = out;
            out = [];
            const N = input.length;
            if (N === 0) return null;

            for (let i = 0; i < N; i++) {
                const curr = input[i];
                const prev = input[(i + N - 1) % N]; // wrap index
                const dcurr = vec_dot(curr, plane);
                const dprev = vec_dot(prev, plane);
                const insideCurr = dcurr >= 0;
                const insidePrev = dprev >= 0;
                if (insideCurr && insidePrev) out.push(curr); // both endpoints inside frustum
                else if (!insideCurr && insidePrev) { // exiting
                    const t = dprev / (dprev - dcurr);
                    const intersection = vec_add(prev, vec_mul(vec_sub(curr, prev, temp_diff), t, temp_interpolated));
                    out.push(intersection); // add intersection only
                }
                else if (insideCurr && !insidePrev) { // entering
                    const t = dprev / (dprev - dcurr);
                    const intersection = vec_add(prev, vec_mul(vec_sub(curr, prev, temp_diff), t, temp_interpolated));
                    out.push(intersection, curr); // add intersection and current
                }
                // both outside; add nothing
            }
            if (out.length === 0) return null; // completely clipped
        }
        return out;
    }

}

export default Renderer;