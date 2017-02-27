const THREE = require('three');
const assert = require('assert');

function createVector2 (string) {
  const v = new THREE.Vector2();
  v.fromArray(string.split(' ').map(parseFloat));
  return v;
}

function createVector3 (string) {
  const v = new THREE.Vector3();
  v.fromArray(string.split(' ').map(parseFloat));
  return v;
}

function createQuaternion (string) {
  const e = new THREE.Euler();
  e.fromArray(string.split(' ').map(parseFloat));
  e.x *= Math.PI / 180;
  e.y *= Math.PI / 180;
  e.z *= Math.PI / 180;

  const q = new THREE.Quaternion();
  q.setFromEuler(e);

  return q;
}

const loader = new THREE.TextureLoader();

class Base extends THREE.Object3D {
  constructor (element) {
    super();

    assert(element);
    this.userData = element;
    this.oldAttributes = {};
  }

  get uuid () {
    return this.userData.getAttribute('data-uuid');
  }

  set uuid (x) {
    // ignored
  }

  empty () {
    while (this.children[0]) {
      this.remove(this.children[0]);
    }
  }

  apply () {
    this.parsePosition();
    this.parseRotation();
    this.parseScale();
    this.parseVisible();
  }

  hasAttribute (name) {
    return this.userData.hasAttribute(name);
  }

  getAttribute (name) {
    return this.userData.getAttribute(name);
  }

  parseColor () {
    if (this.hasAttribute('color')) {
      return this.getAttribute('color');
    }
  }

  parseRepeat () {
    if (this.hasAttribute('repeat')) {
      return createVector2(this.getAttribute('repeat'));
    }
  }

  parseTexture () {
    if (this.hasAttribute('texture')) {
      const texture = loader.load(this.getAttribute('texture'));

      const repeat = this.parseRepeat();
      if (repeat) {
        if (window.gpuPerformance === 3) {
          texture.anisotropy = 16;
        }

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat.x, repeat.y);
      }

      return texture;
    }
  }

  parseMaterial () {
    const texture = this.parseTexture();
    const color = this.parseColor();

    var material;

    if (texture) {
      material = new THREE.MeshLambertMaterial({ map: texture });
    } else if (color) {
      material = new THREE.MeshLambertMaterial({ color: color });
    }

    if (this.hasAttribute('opacity')) {
      material.setValues({
        opacity: parseFloat(this.getAttribute('opacity')),
        transparent: true
      });
    }

    return material;
  }

  parseVisible () {
    this.visible = this.getAttribute('visible') !== 'false';

    // This is only visible to me (head model)
    if (this.myself === true) {
      this.visible = false;
    }
  }

  _tick (dt) {
    this.lastUpdate += dt;

    if (this.lastUpdate < 1.0 / this.frequency) {
      if (this.oldPosition && this.newPosition) {
        this.position.copy(this.oldPosition).lerp(this.newPosition, 1.0 * this.frequency * this.lastUpdate);
      }
      if (this.oldQuaternion && this.newQuaternion) {
        this.quaternion.copy(this.oldQuaternion).slerp(this.newQuaternion, 1.0 * this.frequency * this.lastUpdate);
      }
    } else {
      this.tick = null;
      this.position.copy(this.newPosition);
      this.quaternion.copy(this.newQuaternion);
    }
  }

  parsePosition () {
    if (this.hasAttribute('position')) {
      const v = createVector3(this.getAttribute('position'));

      if (this.newPosition) {
        this.lastUpdate = 0;
        this.oldPosition = this.position.clone();
        this.newPosition = v;

        this.tick = this._tick.bind(this);
      } else {
        this.newPosition = v;
        this.position.copy(v);
      }
    }
  }

  // oops should have been a member
  createQuaternion (q) {
    return createQuaternion(q);
  }

  parseRotation () {
    if (this.hasAttribute('rotation')) {
      const q = createQuaternion(this.getAttribute('rotation'));

      // fixme - potential race condition where position and rotation are
      // set in messages that aren't 200ms apart
      if (this.newQuaternion) {
        this.lastUpdate = 0;
        this.oldQuaternion = this.quaternion.clone();
        this.newQuaternion = q;

        this.tick = this._tick.bind(this);
      } else {
        this.newQuaternion = q;
        this.quaternion.copy(q);
      }
    }
  }

  parseScale () {
    if (this.hasAttribute('scale')) {
      const v = createVector3(this.getAttribute('scale'));
      this.scale.copy(v);
    }
  }

  get connector () {
    return window.connector;
  }

  get frequency () {
    return window.connector.frequency;
  }
}

module.exports = Base;
