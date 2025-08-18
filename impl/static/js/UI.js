import { vec3, vec3_color_hex, color_vec3_hex } from '../../../src/util/vector.js';

/**
 * @typedef {import('../../../src/util/vector.js').Vector3} Vector3
 */

/**
 * @template T The type of the value.
 * @typedef {Object} UIChangeEventData Data relevant to a UI element changing.
 * @property {Event} event - The impetus.
 * @property {T} value - The new value.
 */

/**
 * @template T
 * @typedef {CustomEvent<UIChangeEventData<T>>} UIChangeEvent An event dispatched when a UI element changes.
 */

/**
 * @event UIElement#ChangeEvent
 * @type {UIChangeEvent}
 */

/**
 * @template T The type of the value.
 * @typedef {Object} UIInputEventData Data relevant to a UI element recieving input.
 * @property {Event} event - The impetus.
 * @property {T} value - The new value.
 */

/**
 * @template T
 * @typedef {CustomEvent<UIInputEventData>} UIInputEvent An event dispatched when a UI element receives input.
 */

/**
 * @event UIElement#InputEvent
 * @type {UIInputEvent}
 */

/**
 * A UI element manager.
 * @template T The type of the value this UI element stores.
 * @template {HTMLElement} K The type of {@link HTMLElement} that this UI element manages.
 * @abstract
 * @class
 * @extends {EventTarget}
 */
class UIElement extends EventTarget {

    /**
     * The element being managed.
     * @protected
     * @type {K}
     */
    _element;

    /**
     * The name of this UI element.
     * @protected
     * @type {string}
     */
    _name;

    /**
     * Whether this UI element is bound to its `element`'s `change` events.
     * @protected
     * @type {boolean}
     */
    _hasOnChange = false;

    /**
     * Creates a new UI element.
     * @constructor
     * @param {K} type - The type of the {@link HTMLElement} this UI element will manage.
     * @param {K|string} element - The element to manage.
     * @param {string} name - The name of this element.
     * @throws {TypeError} If `element` is not an instance of `type`.
     */
    constructor(type, element, name) {
        super();
        if (element instanceof type) this._element = element;
        else if (typeof element === 'string') this._element = document.querySelector(element);
        if (!this._element || !(this._element instanceof type)) throw new TypeError(`Parameter 'element' must be a ${type.name} or valid CSS query string.`);
        this._name = name;
        this.bindOnChange();
    }

    /**
     * The HTML element this UI element manages.
     * @public
     * @readonly
     * @type {HTMLElement}
     */
    get element() { return this._element; }

    /**
     * The name of this UI element.
     * @public
     * @readonly
     * @type {string}
     */
    get name() { return this._name; }

    /**
     * Whether this UI element is bound to its `element`'s `change` events.
     * @public
     * @readonly
     * @type {boolean}
     */
    get onChangeBound() { return this._hasOnChange; }

    /**
     * Reads the value of this UI element.
     * @public
     * @abstract
     * @returns {T} The value of this UI element.
     */
    read() {
        return this._element.innerText;
    }

    /**
     * Writes the value of this UI element.
     * @public
     * @abstract
     * @param {T} v - The new value.
     * @returns {void}
     */
    write(v) {
        this._element.innerText = v == null ? '' : (typeof v === 'object' ? v.toString() : v);
    }

    /**
     * Binds this UI element to its `element`'s `change` events.
     * @public
     * @listens UIElement#ChangeEvent
     * @returns {void}
     */
    bindOnChange() {
        if (this._hasOnChange) return;
        this._element.addEventListener('change', this._onChange.bind(this));
        this._hasOnChange = true;
    }

    /**
     * Unbinds this UI element from its `element`'s `change` events.
     * @public
     * @returns {void}
     */
    unbindOnChange() {
        if (!this._hasOnChange) return;
        this._element.removeEventListener('change', this._onChange.bind(this));
        this._hasOnChange = false;
    }

    /**
     * Invoked when this UI element's `element`'s `change` event is received.
     * @protected
     * @param {Event} e
     * @returns {void}
     * @fires UIElement#ChangeEvent
     */
    _onChange(e) {
        this.dispatchEvent(new CustomEvent('change', { detail: { event: e, value: this.read() } }));
    }

}

/**
 * A UI {@link HTMLSelectElement} manager.
 * @class
 * @extends {UIElement<string, HTMLSelectElement>}
 */
class UISelectElement extends UIElement {

    /**
     * Creates a new UI {@link HTMLSelectElement} manager.
     * @constructor
     * @param {HTMLSelectElement|string} element - The element to manage.
     * @param {string} name - The name of the element.
     * @param {number} [defaultOptionIndex=0] - The default option to select.
     * @throws {TypeError} If `element` is not a {@link HTMLSelectElement}.
     */
    constructor(element, name, defaultOptionIndex=0) {
        super(HTMLSelectElement, element, name);
        this.selectedIndex = defaultOptionIndex;
    }

    /**
     * The selected option.
     * @public
     * @readonly
     * @type {string}
     */
    get selected() { return this._element.value; }

    /**
     * The selected option index.
     * @public
     * @type {number}
     */
    get selectedIndex() { return this._element.selectedIndex; }

    /**
     * The selected option index.
     * @public
     * @param {number} i - The new index.
     * @throws {RangeError} If the index is outside the range of options.
     */
    set selectedIndex(i) {
        if (i < 0 || i >= this._element.options.length) throw new RangeError(`Provided option index is outside the bounds of options in this HTMLSelectElement.`);
        this._element.selectedIndex = i;
    }

    /**
     * Reads the selected option.
     * @public
     * @override
     * @returns {string|null}
     */
    read() {
        return this._element.value;
    }

    /**
     * Writes the selected option.
     * @public
     * @override
     * @param {string} v - The new option.
     * @returns {void}
     * @throws {ReferenceError} If the new option is not an option within the managed element.
     */
    write(v) {
        let found = false;
        for (let i = 0; i < this._element.options.length; i++) {
            if (this._element.options[i].value === v) {
                this._element.selectedIndex = i;
                found = true;
                break;
            }
        }
        if (!found) throw new ReferenceError(`No option with value '${v}' found.`);
    }

}

/**
 * A UI {@link HTMLInputElement} manager.
 * @template T The type of the input value.
 * @abstract
 * @class
 * @extends {UIElement<T, HTMLInputElement>}
 */
class UIInputElement extends UIElement {

    /**
     * Whether this UI element is bound to its `element`'s `input` event.
     * @protected
     * @type {boolean}
     */
    _hasOnInput = false;

    /**
     * Creates a new UI {@link HTMLInputElement} manager.
     * @constructor
     * @param {HTMLInputElement|string} element - The element to manage.
     * @param {string} name - The name of this element.
     * @throws {TypeError}
     */
    constructor(element, name) {
        super(HTMLInputElement, element, name);
        this.bindOnInput();
    }

    /**
     * The {@link UIInputElement} this UI element manages.
     * @public
     * @override
     * @readonly
     * @type {HTMLInputElement}
     */
    get element() { return this._element; }

    /**
     * Whether this UI element is bound to its `element`'s `input` events.
     * @public
     * @readonly
     * @type {boolean}
     */
    get onInputBound() { return this._hasOnInput; }

    /**
     * Reads the value of this UI element.
     * @public
     * @override
     * @returns {T} The value of this UI element.
     */
    read() {
        return this._element.value;
    }

    /**
     * Writes the value of this UI element.
     * @public
     * @override
     * @param {T} v - The new value.
     * @returns {void}
     */
    write(v) {
        this._element.value = v;
    }

    /**
     * Binds this UI element to its `element`'s `input` events.
     * @public
     * @returns {void}
     * @listens UIInputEvent
     */
    bindOnInput() {
        if (this._hasOnInput) return;
        this._element.addEventListener('input', this._onInput.bind(this));
        this._hasOnInput = true;
    }

    /**
     * Unbinds this UI element to its `element`'s `input` events.
     * @public
     * @returns {void}
     */
    unbindOnInput() {
        if (!this._hasOnInput) return;
        this._element.removeEventListener('input', this._onInput.bind(this));
        this._hasOnInput = false;
    }

    /**
     * Invoked when this UI element's `element`'s `input` event is received.
     * @protected
     * @param {Event} e
     * @returns {void}
     * @fires UIInputEvent
     */
    _onInput(e) {
        this.dispatchEvent(new CustomEvent('input', { detail: { event: e, value: this.read() } }));
    }

}

/**
 * A UI {@link HTMLInputElement} manager for color inputs.
 * @class
 * @extends {UIInputElement<Vector3>}
 */
class UIColorElement extends UIInputElement {

    /**
     * Creates a new UI color manager.
     * @constructor
     * @param {HTMLInputElement|string} element - The element to manage.
     * @param {string} name - The name of the element.
     * @param {Vector3} initialColor - The initial color.
     * @throws {TypeError} If the `element`'s `type` is not `"color"`.
     */
    constructor(element, name, initialColor) {
        super(element, name);
        if (this._element.type !== 'color') throw new TypeError(`Property 'type' of parameter 'element' must be 'color'.`);
        this.write(initialColor);
    }

    /**
     * Reads the value of this UI element.
     * @public
     * @override
     * @returns {Vector3} The value of this UI element.
     */
    read() {
        return color_vec3_hex(this._element.value);
    }

    /**
     * Writes the value of this UI element.
     * @public
     * @param {Vector3} c - The new value.
     * @returns {void}
     */
    write(c) {
        this._element.value = vec3_color_hex(c);
    }

}

/**
 * A UI {@link HTMLInputElement} manager for checkbox inputs.
 * @class
 * @extends {UIInputElement<boolean>}
 */
class UICheckboxElement extends UIInputElement {

    /**
     * Creates a new UI checkbox manager.
     * @constructor
     * @param {HTMLInputElement|string} element - The element to manage.
     * @param {string} name - The name of the element.
     * @param {boolean} [initialState=false] - The initial state.
     * @throws {TypeError}
     */
    constructor(element, name, initialState=false) {
        super(element, name);
        if (this._element.type !== 'checkbox') throw new TypeError(`Property 'type' of parameter 'element' must be 'checkbox'.`);
        this.write(initialState);
    }

    /**
     * Reads the value of this UI element.
     * @public
     * @override
     * @returns {boolean} THe value of this UI element.
     */
    read() {
        return this._element.checked;
    }

    /**
     * Writes the value of this UI element.
     * @public
     * @override
     * @param {boolean} v - The new value.
     * @returns {void}
     */
    write(v) {
        this._element.checked = v;
    }

}

/**
 * A UI {@link HTMLInputElement} manager for number inputs.
 * @class
 * @extends {UIInputElement<number>}
 */
class UINumberElement extends UIInputElement {

    /**
     * The minimum value.
     * @protected
     * @type {number}
     */
    _min = Number.NEGATIVE_INFINITY;

    /**
     * The maximum value.
     * @protected
     * @type {number}
     */
    _max = Number.POSITIVE_INFINITY;

    /**
     * Creates a new UI number manager.
     * @constructor
     * @param {HTMLInputElement|string} element - The element to manage.
     * @param {string} name - The name of the element.
     * @param {number} [min=Number.NEGATIVE_INFINITY] - The minimmum value.
     * @param {number} [max=Number.POSITIVE_INFINITY] - The maximum value.
     * @param {number} [initialValue=0] - The initial value.
     * @throws {TypeError}
     * @throws {RangeError}
     */
    constructor(element, name, min=Number.NEGATIVE_INFINITY, max=Number.POSITIVE_INFINITY, initialValue=0) {
        super(element, name);
        if (this._element.type !== 'number') throw new TypeError(`Property 'type' of parameter 'element' must be 'number'.`);
        if (Math.abs(max - min) < 1e-8 || min > max) throw new RangeError(`Parameters 'min' and 'max' must follow the convention [min < max].`);
        this.min = min;
        this.max = max;
        this.write(initialValue);
    }

    /**
     * The minimum value.
     * @public
     * @type {number}
     */
    get min() { return this._min; }

    /**
     * The minimum value.
     * @public
     * @param {number} m - The new value.
     */
    set min(m) {
        this._min = m;
        this._element.min = isFinite(this._min) ? this._min : '';
    }

    /**
     * The maximum value.
     * @public
     * @type {number}
     */
    get max() { return this._max; }

    /**
     * The maximum value.
     * @public
     * @param {number} m - The new value.
     */
    set max(m) {
        this._max = m;
        this._element.max = isFinite(this._max) ? this._max : '';
    }

    /**
     * Reads the value of this UI element.
     * @public
     * @override
     * @returns {number} The value of this UI element.
     */
    read() {
        return parseFloat(this._element.value);
    }

    /**
     * Writes the value of this UI element.
     * @public
     * @override
     * @param {number} v - The new value.
     * @returns {void}
     */
    write(v) {
        this._element.value = Math.min(Math.max(v, this._min), this._max);
    }

}

/**
 * A UI {@link HTMLSpanElement} manager for text.
 * @class
 * @extends {UIElement<string, HTMLSpanElement>}
 */
class UITextElement extends UIElement {

    /**
     * Creates a new UI text manager.
     * @constructor
     * @param {HTMLSpanElement|string} element - The element to manage.
     * @param {string} name - The name of the element.
     * @param {string} [initialValue=''] - The initial value.
     */
    constructor(element, name, initialValue='') {
        super(HTMLSpanElement, element, name);
        this.write(initialValue);
    }

    /**
     * Reads the value of this UI element.
     * @public
     * @override
     * @returns {string} The value of this UI element.
     */
    read() {
        return this._element.innerText;
    }

    /**
     * Writes the value of this UI element.
     * @public
     * @override
     * @param {string} v - The new value.
     * @returns {void}
     */
    write(v) {
        this._element.innerText = v;
    }

}

/**
 * @typedef {Object} ButtonClickedEventData Data relevant to a button being clicked.
 * @property {Event} event
 * @property {string} name
 */

/**
 * @event UIButtonElement#ClickedEvent
 * @type {CustomEvent<ButtonClickedEventData>}
 */

/**
 * A UI {@link HTMLButtonElement} manager.
 * @class
 * @extends {UIElement<boolean, HTMLButtonElement>}
 */
class UIButtonElement extends UIElement {

    /**
     * Whether this UI element is bound to its `element`'s `click` events.
     * @protected
     * @type {boolean}
     */
    _hasOnClick;

    /**
     * Creates a new {@link HTMLButtonElement} manager.
     * @constructor
     * @param {HTMLButtonElement|string} element - The element to manage.
     * @param {string} name - The name of the element.
     */
    constructor(element, name) {
        super(HTMLButtonElement, element, name);
        this.bindOnClick();
    }

    /**
     * @public
     * @readonly
     * @type {number}
     */
    get onClickBound() { return this._hasOnClick; }

    /**
     * Reads the value of this UI element.
     * @public
     * @override
     * @returns {boolean} The value of this UI element.
     * @throws {Error} If invoked. Buttons cannot be read.
     */
    read() {
        throw new Error(`Cannot read a button's state. Use events.`);
    }

    /**
     * Writes the value of this UI element.
     * @public
     * @override
     * @param {boolean} v - The new value.
     * @returns {void}
     * @throws {Error} If invoked. Buttons cannot be read.
     */
    write(v) {
        throw new Error(`Cannot write a button's state. Use events.`);
    }

    /**
     * Binds this UI element to its `element`'s `click` events.
     * @public
     * @returns {void}
     * @fires UIButtonElement#ClickedEvent
     */
    bindOnClick() {
        if (this._hasOnClick) return;
        this._element.addEventListener('click', this._onClick.bind(this));
        this._hasOnClick = true;
    }

    /**
     * Unbinds this UI element to its `element`'s `click` events.
     * @public
     * @returns {void}
     */
    unbindOnClick() {
        if (!this._hasOnClick) return;
        this._element.removeEventListener('click', this._onClick.bind(this));
        this._hasOnClick = false;
    }

    /**
     * Invoked when this UI element's `element`'s `click` event is received.
     * @protected
     * @param {Event} e
     * @returns {void}
     */
    _onClick(e) {
        this.dispatchEvent(new CustomEvent('click', { detail: { event: e, name: this._name } }));
    }

}

/**
 * A UI {@link HTMLButtonElement} manager for selectable buttons.
 * @class
 * @extends {UIButtonElement}
 */
class UISelectableButtonElement extends UIButtonElement {

    /**
     * The dataset key for determining whether a button is selected.
     * @public
     * @static
     * @readonly
     * @const {string}
     */
    static SELECTED = 'selected';

    /**
     * Creates a new UI selectable button manager.
     * @constructor
     * @param {HTMLButtonElement|string} element - The element to manage.
     * @param {string} name - The name of the element.
     * @param {boolean} [initialState=false] - The initial state.
     * @throws {TypeError}
     */
    constructor(element, name, initialState=false) {
        super(element, name);
        this.write(initialState);
    }

    /**
     * Reads the value of this UI element.
     * @public
     * @override
     * @returns {boolean} The value of this UI element.
     */
    read() {
        const selected = this._element.dataset[UISelectableButtonElement.SELECTED];
        return selected !== undefined ? (selected === 'true') : false;
    }

    /**
     * Reads the value of this UI element.
     * @public
     * @override
     * @param {boolean} v - The new value.
     * @returns {void}
     */
    write(v) {
        this._element.dataset[UISelectableButtonElement.SELECTED] = v;
    }

}

/**
 * A UI exclusive selectable button state manager.
 * @class
 */
class UIExclusiveButtonState extends EventTarget {

    /**
     * The dataset key for determining whether the exclusive state is inverted.
     * @public
     * @static
     * @readonly
     * @const {string}
     */
    static INVERTED = 'inverted';

    /**
     * Whether the exclusive state is inverted.
     * @protected
     * @type {boolean}
     */
    _invert = false;

    /**
     * The managed buttons.
     * @protected
     * @type {UISelectableButtonElement[]}
     */
    _buttons;

    /**
     * The active button index.
     * @protected
     * @type {number}
     */
    _active = -1;

    /**
     * Creates a new UI exclusive button state manager.
     * @constructor
     * @param {boolean} invert - Whether the exclusive state is inverted.
     * @param {...UISelectableButtonElement} buttons - The buttons to manage.
     * @throws {RangeError} If less than 2 buttons are provided.
     * @throws {Error} If no buttons are active.
     * @throws {Error} If more than one button is active.
     */
    constructor(invert, ...buttons) {
        super();
        this._invert = invert;
        if (buttons.length < 2) throw new RangeError(`Expected at least 2 buttons.`);
        this._buttons = buttons;
        let active = [];
        for (let i = 0; i < this._buttons.length; i++) {
            const state = this._buttons[i].read();
            if (this._invert ? !state : state) active.push(i);
        }
        if (active.length < 1) throw new Error(`No buttons are active.`);
        if (active.length > 1) throw new Error(`More than 1 button is active.`);
        this._active = active[0];
        for (const b of this._buttons) {
            b.element.dataset[UIExclusiveButtonState.INVERTED] = this._invert;
            if (!b.onClickBound) b.bindOnClick();
            b.addEventListener('click', this._onClick.bind(this));
        }
    }

    /**
     * Whether the exclusive state is inverted.
     * @public
     * @readonly
     * @type {boolean}
     */
    get inverted() { return this._invert; }

    /**
     * The managed buttons.
     * @public
     * @readonly
     * @type {UISelectableButtonElement[]}
     */
    get buttons() { return [...this._buttons]; }

    /**
     * The active button.
     * @public
     * @readonly
     * @type {UISelectableButtonElement}
     */
    get active() { return this._buttons[this._active]; }

    /**
     * Invoked when this UI element's buttons' `click` events are received.
     * @protected
     * @param {CustomEvent<ButtonClickedEventData>} e
     * @returns {void}
     * @fires UIElement#ChangeEvent
     * @listens UIButtonElement#ClickedEvent
     * @throws {ReferenceError}
     */
    _onClick(e) {
        for (const b of this._buttons) {
            if (b.name === e.detail.name) {
                const i = this._buttons.indexOf(b);
                if (i === -1) throw new ReferenceError(`Recieved a click event from a button not registered in this state.`);
                if (i !== this._active) {
                    this._buttons[this._active].write(this._invert);
                    this._buttons[i].write(!this._invert);
                    this._active = i;
                    this.dispatchEvent(new CustomEvent('change', { detail: { event: e, value: this._buttons[this._active].name } }));
                }
                break;
            }
        }
    }

}

// ================================================== //

/**
 * The projection matrix UI.
 * @typedef {{ fov: UINumberElement, near: UINumberElement, far: UINumberElement }} ProjectionUI
 * @type {ProjectionUI}
 */
const projection = {
    fov: new UINumberElement('#projection-fov', 'fov', 1, 179, 45),
    near: new UINumberElement('#projection-near', 'near', 0.001, Number.POSITIVE_INFINITY, 0.01),
    far: new UINumberElement('#projection-far', 'far', 0.001, Number.POSITIVE_INFINITY, 100)
};

const viewOrbit = new UISelectableButtonElement('#view-orbit', 'orbit', true);
const viewManual = new UISelectableButtonElement(`#view-manual`, 'manual', false);
/**
 * The view matrix UI.
 * @typedef {{ state: UIExclusiveButtonState, position: { x: UINumberElement, y: UINumberElement, z: UINumberElement }, rotation: { pitch: UINumberElement, yaw: UINumberElement, roll: UINumberElement } }} ViewUI
 * @type {ViewUI}
 */
const view = {
    state: new UIExclusiveButtonState(false, viewOrbit, viewManual),
    position: {
        x: new UINumberElement('#view-pos-x', 'pos-x', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 9),
        y: new UINumberElement('#view-pos-y', 'pos-y', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 12),
        z: new UINumberElement('#view-pos-z', 'pos-z', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 36)
    },
    rotation: {
        pitch: new UINumberElement('#view-pitch', 'pitch', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 17.9),
        yaw: new UINumberElement('#view-yaw', 'yaw', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, -14.04),
        roll: new UINumberElement('#view-roll', 'roll', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, -4.4)
    }
};

/**
 * The boids UI.
 * @typedef {{ environment: { count: UINumberElement, accuracy: UINumberElement, drag: UINumberElement, randomness: UINumberElement, bounds: { min: { x: UINumberElement, y: UINumberElement, z: UINumberElement }, max: { x: UINumberElement, y: UINumberElement, z: UINumberElement } } }, interaction: { radius: UINumberElement, alignment: { force: UINumberElement, bias: UINumberElement }, cohesion: UINumberElement, separation: UINumberElement, steering: UINumberElement, speed: { min: UINumberElement, max: UINumberElement } } }} BoidsUI
 * @type {BoidsUI}
 */
const boids = {
    environment: {
        count: new UINumberElement('#boids-count', 'count', 1, Number.POSITIVE_INFINITY, 512),
        accuracy: new UINumberElement('#boids-accuracy', 'accuracy', -1, Number.POSITIVE_INFINITY, 8),
        drag: new UINumberElement('#boids-drag', 'drag', 0, Number.POSITIVE_INFINITY, 0.005),
        randomness: new UINumberElement('#boids-randomness', 'randomness', 0, Number.POSITIVE_INFINITY, 1),
        bounds: {
            min: {
                x: new UINumberElement('#boids-min-x', 'min-x', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, -5),
                y: new UINumberElement('#boids-min-y', 'min-y', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, -5),
                z: new UINumberElement('#boids-min-z', 'min-z', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, -5)
            },
            max: {
                x: new UINumberElement('#boids-max-x', 'max-x', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 5),
                y: new UINumberElement('#boids-max-y', 'max-y', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 5),
                z: new UINumberElement('#boids-max-z', 'max-z', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 5)
            }
        }
    },
    interaction: {
        radius: new UINumberElement('#boids-interaction-radius', 'interaction-radius', 0, Number.POSITIVE_INFINITY, 0.5),
        alignment: {
            force: new UINumberElement('#boids-alignment-force', 'alignment-force', 0, Number.POSITIVE_INFINITY, 1),
            bias: new UINumberElement('#boids-alignment-bias', 'alignment-bias', 0, Number.POSITIVE_INFINITY, 1.5)
        },
        cohesion: new UINumberElement('#boids-cohesion-force', 'cohesion', 0, Number.POSITIVE_INFINITY, 1),
        separation: new UINumberElement('#boids-separation-force', 'separation', 0, Number.POSITIVE_INFINITY, 1.25),
        steering: new UINumberElement('#boids-steering-force', 'steering', 0, Number.POSITIVE_INFINITY, 1),
        speed: {
            min: new UINumberElement('#boids-min-speed', 'min-speed', 0, Number.POSITIVE_INFINITY, 1),
            max: new UINumberElement('#boids-max-speed', 'max-speed', 0, Number.POSITIVE_INFINITY, 4)
        }
    }
};

const simulationStart = new UISelectableButtonElement('#sim-start', 'sim-start', true);
const simulationStop = new UISelectableButtonElement('#sim-stop', 'sim-stop', false);
/**
 * The simulation UI.
 * @typedef {{ input: { state: UIExclusiveButtonState, autoUpdate: UICheckboxElement, update: UIButtonElement }, output: { state: UITextElement, elapsed: UITextElement, tps: UITextElement } }} SimulationUI
 * @type {SimulationUI}
 */
const simulation = {
    input: {
        state: new UIExclusiveButtonState(true, simulationStart, simulationStop),
        autoUpdate: new UICheckboxElement('#auto-apply', 'auto-apply', true),
        update: new UIButtonElement('#settings-apply', 'settings-apply')
    },
    output: {
        state: new UITextElement('#sim-state', 'sim-state', 'Paused'),
        elapsed: new UITextElement('#sim-elapsed', 'sim-elapsed', '0:00:00'),
        tps: new UITextElement('#sim-tps', 'sim-tps', '0')
    }
};

/**
 * The rendering UI.
 * @typedef {{ boidScale: UINumberElement, boidRendering: UISelectElement, renderInteractionRadius: UICheckboxElement, renderBounds: UICheckboxElement, renderTree: UICheckboxElement boidColor: { min: UIColorElement, max: UIColorElement }, boundsColor: { color: UIColorElement, alpha: UINumberElement }, treeColor: { color: UIColorElement, alpha: UINumberElement }, radiusColor: { color: UIColorElement, alpha: UINumberElement } }} RenderingUI
 * @type {RenderingUI}
 */
const rendering = {
    boidScale: new UINumberElement('#boid-scale', 'boid-scale', 0, Number.POSITIVE_INFINITY, 0.1),
    boidRendering: new UISelectElement('#boid-rendering', 'boid-rendering', 0),
    renderInteractionRadius: new UICheckboxElement('#render-interaction-radius', 'render-interaction-radius', false),
    renderBounds: new UICheckboxElement('#render-bounds', 'render-bounds', true),
    renderTree: new UICheckboxElement('#render-tree', 'render-tree', false),
    boidColor: {
        min: new UIColorElement('#boid-color-min', 'boid-color-min', vec3(255, 63, 63)),
        max: new UIColorElement('#boid-color-max', 'boid-color-max', vec3(63, 255, 63))
    },
    boundsColor: {
        color: new UIColorElement('#bounds-color', 'bounds-color', vec3(255, 255, 255)),
        alpha: new UINumberElement('#bounds-alpha', 'bounds-alpha', 0, 1, 0.4)
    },
    treeColor: {
        color: new UIColorElement('#tree-color', 'tree-color', vec3(63, 63, 255)),
        alpha: new UINumberElement('#tree-alpha', 'tree-alpha', 0, 1, 0.2)
    },
    radiusColor: {
        color: new UIColorElement('#radius-color', 'radius-color', vec3(255, 63, 255)),
        alpha: new UINumberElement('#radius-alpha', 'radius-alpha', 0, 1, 0.125)
    }
};

/**
 * The global simulation UI.
 * @type {{ projection: ProjectionUI, view: ViewUI, boids: BoidsUI, simulation: SimulationUI, rendering: RenderingUI }}
 */
const UI = {
    projection: projection,
    view: view,
    boids: boids,
    simulation: simulation,
    rendering: rendering
};

export default UI;