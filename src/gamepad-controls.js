const EventEmitter = require('events');
const OBJLoader = require('./vendor/obj-loader');
const THREE = require('three');

// const buttonMappings = {
//   0: 'click',
//   2: 'right-click'
// };

function dead (input) {
  return (Math.abs(input) < 0.2) ? 0 : input;
}

const loader = new OBJLoader();

class TrackedController {
  constructor (gamepad) {
    this.gamepad = gamepad;

    const material = new THREE.MeshLambertMaterial({ color: '#ff00aa' });

    this.object3D = new THREE.Object3D();
    this.object3D.name = 'vive-controller';

    loader.load('/models/vive-controller.obj', (object) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });

      this.object3D.add(object);
    });

    // var geometry = new THREE.BoxGeometry(1, 1, 1);
    // this.object3D.add(new THREE.Mesh(geometry, material));
  }

  update () {
    this.object3D.position.fromArray(this.gamepad.pose.position);
    this.object3D.quaternion.fromArray(this.gamepad.pose.orientation);
  }
}

class GamepadControls extends EventEmitter {
  constructor (renderer) {
    super();

    this.renderer = renderer;
    this.connected = false;
    this.getGamepads();
    this.buttons = {};
    this.controllers = [];
  }

  getGamepads () {
    if (navigator.getGamepads) {
      return navigator.getGamepads();
    } else if (navigator.webkitGetGamepads) {
      return navigator.navigator.webkitGetGamepads();
    } else {
      return [];
    }
  }

  get active () {
    return this.connected;
  }

  get scene () {
    return this.renderer.scene;
  }

  drawTrackedControllers (controllers) {
    var i;

    for (i = 0; i < controllers.length; i++) {
      if (!this.controllers[i]) {
        let t = new TrackedController(controllers[i]);
        this.controllers.push(t);
        this.scene.add(t.object3D);
        console.log('Added tracked controller');
      }
    }

    this.controllers.forEach((t) => {
      t.update();
    });
  }

  move (v, speed, o, rotationSpeed) {
    var gamepads = this.getGamepads();

    if (!gamepads) {
      return;
    }

    gamepads = Array.from(gamepads);

    // Gamepad controllers!
    var controllers = gamepads.filter((g) => g && g.pose);
    if (controllers.length > 0) {
      this.drawTrackedControllers(controllers);
    }

    // Controllers ignored from here on...
    gamepads = gamepads.filter((g) => g && !g.pose);

    var gamepad = gamepads[0];

    if (!gamepad) {
      this.connected = false;
      return;
    }

    if (!this.connected) {
      console.log('Gamepad connected');
      this.connected = true;
    }

    v.x = dead(gamepad.axes[0]) * speed;
    v.z = dead(gamepad.axes[1]) * speed;

    o.x = -dead(gamepad.axes[3]) * rotationSpeed;
    o.y = -dead(gamepad.axes[2]) * rotationSpeed;

    // Object.keys(buttonMappings).forEach((index) => {
    //   if (gamepad.buttons[index].pressed) {
    //     if (this.buttons[index]) {
    //       // nothing
    //     } else {
    //       // Emit click / right-click / etc
    //       // this.client.emit(buttonMappings[index]);
    //     }

    //     this.buttons[index] = true;
    //   } else {
    //     this.buttons[index] = false;
    //   }
    // });
  }
}

module.exports = GamepadControls;
