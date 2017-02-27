const EventEmitter = require('events');

var KEY_W = 87;
var KEY_A = 65;
var KEY_S = 83;
var KEY_D = 68;

var KEY_UP = 38;
var KEY_LEFT = 37;
var KEY_DOWN = 40;
var KEY_RIGHT = 39;

var KEY_E = 69;
var KEY_C = 67;

var KEY_SPACE = 32;

module.exports = class KeyboardControls extends EventEmitter {
  constructor (client) {
    super();

    this.client = client;
    this.canvas = client.renderer.domElement;
    this.keys = {};

    this.addEventHandlers();
  }

  get active () {
    // return false on mobile?
    return true;
  }

  addEventHandlers () {
    this.canvas.tabIndex = 1;

    this.canvas.addEventListener('keydown', (e) => {
      this.keys[e.keyCode] = true;
    });

    this.canvas.addEventListener('keyup', (e) => {
      this.keys[e.keyCode] = false;
    });

    this.canvas.addEventListener('blur', (e) => {
      this.clearKeys();
    });

    window.addEventListener('blur', (e) => {
      this.clearKeys();
    });
  }

  clearKeys () {
    this.keys = {};
  }

  move (v, speed) {
    if (this.keys[KEY_W] || this.keys[KEY_UP]) {
      v.z = -speed;
    }

    if (this.keys[KEY_A] || this.keys[KEY_LEFT]) {
      v.x = -speed;
    }

    if (this.keys[KEY_S] || this.keys[KEY_DOWN]) {
      v.z = speed;
    }

    if (this.keys[KEY_D] || this.keys[KEY_RIGHT]) {
      v.x = speed;
    }

    if (this.keys[KEY_E] || this.keys[KEY_SPACE]) {
      v.y = speed;
    }

    if (this.keys[KEY_C]) {
      v.y = -speed;
    }
  }
};
