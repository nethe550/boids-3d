import { vec2, vec_sub } from '../util/vector.js';

/**
 * @typedef {import('../util/vector.js').Vector2} Vector2
 */

/**
 * @typedef {Object} CanvasResizeEventData Data relevant to a canvas being resized.
 * @property {Vector2} prev - The previous size.
 * @property {Vector2} curr - The current size.
 * @property {Vector2} delta - The change in size.
 */

/**
 * @event Canvas#ResizeEvent
 * @type {CustomEvent<CanvasResizeEventData>}
 */

/**
 * An abstraction of a {@link HTMLCanvasElement}.
 * @class
 * @extends {EventTarget}
 */
class Canvas extends EventTarget {

    /**
     * The HTML element being managed.
     * @private
     * @type {HTMLCanvasElement}
     */
    #element;

    /**
     * The 2D rendering context of the managed HTML element.
     * @private
     * @type {CanvasRenderingContext2D}
     */
    #ctx;

    /**
     * Whether this canvas should automatically resize to fill its parent element.
     * @private
     * @type {boolean}
     */
    #autoResize;

    /**
     * Creates a new canvas manager.
     * @constructor
     * @param {HTMLCanvasElement|string} element - The {@link HTMLCanvasElement} or valid CSS query referencing a {@link HTMLCanvasElement} to manage.
     * @param {boolean} [autoResize=true] - Whether this canvas should automatically resize to fill its parent element.
     * @throws {TypeError} If `element` is not a {@link HTMLCanvasElement} or is not a CSS query string referencing a {@link HTMLCanvasElement}.
     */
    constructor(element, autoResize=true) {
        super();
        if (element instanceof HTMLCanvasElement) this.#element = element;
        else if (typeof element === 'string') this.#element = document.querySelector(element);
        if (!this.#element || !(this.#element instanceof HTMLCanvasElement)) throw new TypeError(`Parameter 'element' must be a HTMLCanvasElement or valid CSS query string.`);
        this.#ctx = this.#element.getContext('2d');
        this.#autoResize = autoResize;
        if (this.#autoResize) this.#bind();
    }

    /**
     * The HTML element managed by this object.
     * @public
     * @readonly
     * @type {HTMLCanvasElement}
     */
    get element() { return this.#element; }

    /**
     * The 2D rendering context of the managed HTML element.
     * @public
     * @readonly
     * @type {CanvasRenderingContext2D}
     */
    get ctx() { return this.#ctx; }

    /**
     * The width of the managed HTML element.
     * @public
     * @type {number}
     */
    get width() { return this.#element.width; }

    /**
     * The width of the managed HTML element.
     * @public
     * @param {number} w - The new width.
     * @fires Canvas#ResizeEvent
     */
    set width(w) { this.#onsizechanged(() => { this.#element.width = w; }); }

    /**
     * The height of the managed HTML element.
     * @public
     * @type {number}
     */
    get height() { return this.#element.height; }

    /**
     * The height of the managed HTML element.
     * @public
     * @param {number} h - The new height.
     * @fires Canvas#ResizeEvent
     */
    set height(h) { this.#onsizechanged(() => { this.#element.height = h; }); }

    /**
     * The size of the managed HTMLElement.
     * @public
     * @type {Vector2}
     */
    get size() { return vec2(this.#element.width, this.#element.height); }

    /**
     * The size of the managed HTMLElement.
     * @public
     * @param {Vector2} s - The new size.
     * @fires Canvas#ResizeEvent
     */
    set size(s) { this.#onsizechanged(() => { this.#element.width = s[0]; this.#element.height = s[1]; }); }

    /**
     * Whether this canvas should automatically resize to fill its parent element.
     * @public
     * @type {boolean}
     */
    get autoResize() { return this.#autoResize; }

    /**
     * Whether this canvas should automatically resize to fill its parent element.
     * @public
     * @param {boolean} r
     */
    set autoResize(r) {
        if (r !== this.#autoResize) {
            this.#autoResize = r;
            if (this.#autoResize) this.#bind();
            else this.#unbind();
        }
    }

    /**
     * Binds {@link Canvas._resize()} to the window `resize` event.
     * @private
     * @returns {void}
     * @listens Canvas#ResizeEvent
     */
    #bind() {
        window.addEventListener('resize', this._resize.bind(this));
        this._resize();
    }

    /**
     * Unbinds {@link Canvas._resize()} from the window `resize` event.
     * @private
     * @returns {void}
     */
    #unbind() {
        window.removeEventListener('resize', this._resize.bind(this));
    }

    /**
     * Invoked when this manager is bound to the window `resize` event and a `resize` event occurs.
     * @protected
     * @param {Event} _ - The `resize` event.
     * @returns {void}
     * @fires Canvas#ResizeEvent
     */
    _resize(_) {
        this.#onsizechanged(() => {
            const box = this.#element.parentElement.getBoundingClientRect();
            this.#element.width = box.width;
            this.#element.height = box.height;
        });
    }

    /**
     * A wrapper function that invokes a callback.
     * - Manages the `resize` event dispatched by this {@link Canvas}.
     * @private
     * @param {() => void} func - The callback to invoke.
     * @returns {void}
     * @fires Canvas#ResizeEvent
     */
    #onsizechanged(func) {
        const prev = vec2(this.#element.width, this.#element.height);
        func();
        const curr = vec2(this.#element.width, this.#element.height);
        this.dispatchEvent(new CustomEvent('resize', { detail: { prev: prev, curr: curr, delta: vec_sub(curr, prev) } }));
    }

}

export default Canvas;