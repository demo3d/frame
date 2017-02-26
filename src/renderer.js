/* globals MutationObserver, requestAnimationFrame*/

const THREE = require('three');
const CANNON = require('cannon');
const GamepadControls = require('./gamepad-controls');
const KeyboardControls = require('./keyboard-controls');
const VREffect = require('./vendor/vr-effect');

// For client apps
window.THREE = THREE;

// Elements
const Entity = require('./elements/entity');
const Box = require('./elements/box');
const Plane = require('./elements/plane');
const Avatar = require('./elements/avatar');
const Sky = require('./elements/sky');
const Billboard = require('./elements/billboard');
const ObjModel = require('./elements/obj-model');
const StlModel = require('./elements/stl-model');

const ROTATION_SPEED = Math.PI / 60;
const MOVEMENT_SPEED = 4.0 / 60;

class Renderer {
  constructor (connector) {
    this.connector = connector;

    // 1 shit, 2 ok, 3 good
    window.gpuPerformance = 2; // localStorage.getItem('gpu-quality') ? parseInt(localStorage.getItem('gpu-quality'), 10) : 1;

    this.initialize();
    this.observe();

    navigator.getVRDisplays().then((displays) => {
      this.vrDisplay = displays[0];
    });

    // Go full screen on click
    this.domElement.addEventListener('click', () => {
      if (this.requestPointerLock) {
        this.requestPointerLock();
      }
    });
  }

  enterVR () {
    this.effect.requestPresent();

    // For Carmel
    // setTimeout(() => {
    // }, 100);
  }

  get parentElement () {
    return this.connector.domElement;
  }

  get domElement () {
    return this.renderer.domElement;
  }

  get requestPointerLock () {
    var func = this.domElement.requestPointerLock || this.domElement.mozRequestPointerLock;

    if (func) {
      return func.bind(this.domElement);
    } else {
      return null;
    }
  }

  get exitPointerLock () {
    var func = document.exitPointerLock || document.mozExitPointerLock;

    if (func) {
      return func.bind(document);
    } else {
      return null;
    }
  }

  initialize () {
    this.scene = new THREE.Scene();
    this.sceneElement.object3D = this.scene;

    const width = this.parentElement.clientWidth;
    const height = this.parentElement.clientHeight;

    // Add camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 15;
    this.camera.position.y = 1.85;
    this.scene.add(this.camera);

    // Add reticule
    var geometry = new THREE.CircleBufferGeometry(0.002, 32);
    var material = new THREE.MeshBasicMaterial({ color: 0xff00aa });
    var circle = new THREE.Mesh(geometry, material);
    circle.position.set(0, 0, -0.2);
    // this.camera.add(circle);

    geometry = new THREE.CircleBufferGeometry(0.0025, 32);
    material = new THREE.MeshBasicMaterial({ color: 0x333333 });
    circle = new THREE.Mesh(geometry, material);
    circle.position.set(0, 0, -0.21);
    // this.camera.add(circle);

    // Add lights
    this.addLights();

    // Add renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: window.gpuPerformance > 2
    });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0xffffff);
    this.renderer.shadowMap.enabled = window.gpuPerformance > 1;
    this.renderer.shadowMap.type = window.gpuPerformance > 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

    this.parentElement.innerHTML = '';
    this.parentElement.appendChild(this.renderer.domElement);
    this.parentElement.style.cssText = 'margin: 0; padding: 0; overflow: hidden';

    // Create Effect
    this.effect = new VREffect(this.renderer);
    this.effect.setSize(width, height);

    // Add resize watcher
    window.addEventListener('resize', this.onWindowResize.bind(this), false);

    // Listen for enter VR mode
    // window.addEventListener('vrdisplaypresentchange', this.onVRDisplayPresentChange.bind(this));

    // Add controls
    this.addControls();

    // Add physics model
    this.addPhysics();

    // Start rendering
    this.tick();
  }

  onWindowResize () {
    this.renderer.domElement.style.display = 'none';

    const width = this.parentElement.clientWidth;
    const height = this.parentElement.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.domElement.style.width = width;
    this.renderer.domElement.style.height = height;
    this.renderer.domElement.style.display = 'block';
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.effect.setSize(width, height);
  }

  addPhysics () {
    // Physics model
    var world = new CANNON.World();
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;
    this.world = world;

    // Solver
    var solver = new CANNON.GSSolver();
    world.defaultContactMaterial.friction = 0.5;
    world.defaultContactMaterial.restitution = 0.1;
    solver.iterations = 7;
    solver.tolerance = 0.01;
    world.solver = solver;

    // Gravity
    world.gravity.set(0, -20, 0);
    world.broadphase = new CANNON.NaiveBroadphase();

    // Create a sphere
    const mass = 50;
    const sphereShape = new CANNON.Sphere(0.70);
    this.playerBody = new CANNON.Body({ mass: mass });
    this.playerBody.addShape(sphereShape, new CANNON.Vec3(0, 0, 0));
    this.playerBody.position.set(0, 2, 4);
    this.world.add(this.playerBody);

    // Add floor
    const mesh = new CANNON.Box(new CANNON.Vec3(2560, 0.5, 2560));
    this.floorBody = new CANNON.Body({ mass: 0, allowSleep: true });
    this.floorBody.addShape(mesh, new CANNON.Vec3(0, -0.5, 0));
    this.world.add(this.floorBody);

    // Visual debugging
    // this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world);
  }

  addControls () {
    this.controls = [];
    this.controls.push(new KeyboardControls(this));
    this.controls.push(new GamepadControls(this));
  }

  addLights () {
    var directionalLight = new THREE.SpotLight(0xffffff, 1.2);
    directionalLight.position.set(1, 1, 1).multiplyScalar(100);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(25, 1, 10, 500));
    directionalLight.shadow.bias = -0.00001;

    var resolution;

    switch (window.gpuPerformance) {
      case 1:
        resolution = 1;
        break;
      case 2:
        resolution = 1024;
        break;
      case 3:
        resolution = 2048;
        break;
    }

    directionalLight.shadow.mapSize.width = resolution;
    directionalLight.shadow.mapSize.height = resolution;
    this.scene.add(directionalLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(-1, 1, -1);
    this.scene.add(directionalLight);

    var light = new THREE.AmbientLight(0x505050);
    this.scene.add(light);
  }

  observe () {
    function findAncestor (el, nodeName) {
      while ((el = el.parentElement) && (el.nodeName !== nodeName));
      return el;
    }

    function addChild (node, target) {
      var child;

      if (findAncestor(node, 'A-BILLBOARD')) {
        return;
      }

      if (node.nodeType === 1) {
        switch (node.nodeName) {
          case 'A-BOX':
            child = new Box(node);
            break;
          case 'A-ENTITY':
            child = new Entity(node);
            break;
          case 'A-AVATAR':
            child = new Avatar(node);
            break;
          case 'A-PLANE':
            child = new Plane(node);
            break;
          case 'A-SKY':
            child = new Sky(node);
            break;
          case 'A-BILLBOARD':
            child = new Billboard(node);
            break;
          case 'A-OBJ-MODEL':
            child = new ObjModel(node);
            break;
          case 'A-STL-MODEL':
            child = new StlModel(node);
            break;
          default:
            console.error('Unknown entity', node.nodeName);
            return;
        }

        // Set object3d
        node.object3D = child;

        // Add to parent
        target.object3D.add(child);

        Array.from(node.childNodes).forEach((childNode) => {
          addChild(childNode, node);
        });
      }
    }

    function removeChild (node, target) {
      target.object3D.remove(node.object3D);
    }

    var observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const target = mutation.target;

        if (mutation.type === 'childList') {
          Array.from(mutation.addedNodes).forEach((node) => {
            addChild(node, target);
          });

          Array.from(mutation.removedNodes).forEach((node) => {
            removeChild(node, target);
          });
        } else if (mutation.type === 'attributes') {
          if (!target.object3D) {
            console.log('Trying to set attributes on target with no object3D', target);
          } else {
            target.object3D.apply();
          }
        }
      });
    });

    var config = { attributes: true, childList: true, characterData: true, subtree: true };
    observer.observe(this.sceneElement, config);

    var target = this.sceneElement;

    Array.from(target.childNodes).forEach((node) => {
      addChild(node, target);
    });
  }

  get sceneElement () {
    return this.connector.scene;
  }

  move (v) {
    var forward = new THREE.Vector3(v.x, 0, v.z);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = v.y;

    this.playerBody.velocity.x = forward.x * 40;
    this.playerBody.velocity.z = forward.z * 40;
  }

  orient () {
    if (this.vrDisplay) {
      var pose = this.vrDisplay.getPose();

      if (!pose.orientation) {
        return;
      }

      var q = new THREE.Quaternion().fromArray(pose.orientation);

      if (true) { // !this.getControl(GamepadControls).active) {
        this.camera.quaternion.copy(q);
      }

      if (pose.position) {
        this.camera.position.fromArray(pose.position);
      }
    }
  }

  // orient (e) {
  //   var current = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
  //   current.x += e.x;
  //   current.y += e.y;
  //   current.z += e.z;

  //   var q = new THREE.Quaternion().setFromEuler(current, 'YXZ');
  //   this.camera.quaternion.copy(q);
  // }

  tick () {
    // Todo - maintain an active list
    this.scene.traverse((child) => {
      if (child.tick) {
        child.tick(1.0 / 60);
      }
    });

    // Move around
    var v = new THREE.Vector3();
    var e = new THREE.Euler();

    this.controls.forEach((c) => {
      c.move(v, MOVEMENT_SPEED, e, ROTATION_SPEED);
    });

    this.move(v);
    this.orient(e);

    // Physics
    const dt = 1.0 / 60;
    this.world.step(dt);
    this.camera.position.set(this.playerBody.position.x, this.playerBody.position.y, this.playerBody.position.z);

    const pose = this.vrDisplay && this.vrDisplay.getPose();
    if (pose && pose.position) {
      const v = new THREE.Vector3().fromArray(pose.position);
      this.camera.position.add(v);
    } else {
      this.camera.position.y += 0.85;
    }

    // Render
    this.effect.render(this.scene, this.camera);

    // Move audio listener
    this.poseAudioListener();

    // Do at the end to prevent console spam
    requestAnimationFrame(() => this.tick());
  }

  poseAudioListener () {
    const context = this.connector.audioContext;

    if (!context) {
      return;
    }

    const pos = this.camera.position;
    context.listener.setPosition(pos.x, pos.y, pos.z);

    // fixme less GC
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    context.listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
  }
}

module.exports = Renderer;
