/* globals Audio AudioContext URL */

const THREE = require('three');
const Base = require('./base');
// const toonMaterial = require('../lib/toon-shader');
const SimplePeer = require('simple-peer');
const OBJLoader = require('../vendor/obj-loader');

// const OUTLINE = 0.05;

const loader = new OBJLoader();

const CONFIG = {
  'iceServers': [
    {
      urls: ['stun:23.21.150.121']
    },
    {
      urls: ['turn:numb.viagenie.ca'],
      credential: 'post',
      username: 'bnolan@gmai.com'
    }
  ]
};

class Avatar extends Base {
  constructor (element) {
    super(element);

    this.generate();
    this.apply();
  }

  startSending (stream) {
    this.sendingPeer = new SimplePeer({ config: CONFIG, initiator: true, stream: stream, trickle: false });

    this.sendingPeer.on('signal', (data) => {
      this.connector.send('signal', {
        other: this.uuid,
        signal: data,
        initiator: true
      });
    });
  }

  onSignal (packet) {
    console.log('#signal');
    console.log(packet);

    if (packet.initiator) {
      if (!this.recievingPeer) {
        this.recievingPeer = new SimplePeer({ config: CONFIG, initiator: false, trickle: false});

        this.recievingPeer.on('signal', (data) => {
          this.connector.send('signal', {
            other: this.uuid,
            signal: data,
            initiator: false
          });
        });

        this.recievingPeer.on('stream', (stream) => {
          console.log('#stream!');
          this.onStream(stream);
        });

        this.recievingPeer.on('close', () => {
          console.log('recievingPeer#close');
        });

        this.recievingPeer.on('error', () => {
          console.log('recievingPeer#error');
        });
      }

      this.recievingPeer.signal(packet.signal);
    } else {
      this.sendingPeer.signal(packet.signal);
    }
  }

  onStream (stream) {
    window.stream = stream;

    stream.onended = () => {
      console.log('#onended');
    };

    stream.oninactive = () => {
      console.log('#oninactive');
    };

    // Hack for chrome to process streams correctly
    var audio = new Audio();
    audio.muted = true;
    audio.src = URL.createObjectURL(stream);

    var context = this.connector.audioContext;
    var gain = context.createGain();
    gain.gain.value = 1.2;

    var panner = context.createPanner();
    panner.panningModel = 'HRTF';
    panner.refDistance = 10;
    panner.connect(context.destination);

    // Mouth is 10cm from top of head
    panner.setPosition(0, 1.7, 0);

    gain.connect(panner);

    var source = context.createMediaStreamSource(stream);

    try {
      audio.play();
      source.connect(gain);
    } catch (e) {
      console.log('waiting for click');

      // cannot play on mobile, have to click first
      document.body.addEventListener('click', () => {
        audio.play();
        source.connect(gain);
      });
    }

    // var oscillator =  context.createOscillator();
    // oscillator.type = 'square';
    // oscillator.frequency.value = 100 + (Math.cos(context.currentTime) * 100);
    // oscillator.connect(gain);
    // oscillator.start(0);
    // oscillator.stop(audioContext.currentTime+0.1);
  }

  generate () {
    this.faceMaterial = new THREE.MeshPhongMaterial({
      color: '#00aaff',
      specular: 0xffffff,
      side: THREE.DoubleSide
    });

    loader.load('/models/poly-head.obj', (object) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = this.faceMaterial;
        }
      });

      object.position.y += 1.5;

      this.add(object);
    });

    // const outlineMaterial = new THREE.MeshBasicMaterial({
    //   color: '#333333'
    // });

    // const phongMaterial = toonMaterial();
    // const bodyMaterial = phongMaterial;
    // const headMaterial = phongMaterial;

    // var cone = new THREE.CylinderGeometry(0.02, 0.5, 1.3, 20);
    // var body = new THREE.Mesh(cone, bodyMaterial);
    // body.castShadow = true;
    // body.recieveShadow = true;
    // body.position.y = 0.7;

    // var sphere = new THREE.SphereGeometry(0.3, 20, 20);
    // var head = new THREE.Mesh(sphere, headMaterial);
    // head.position.y = 1.3;
    // head.rotation.y = Math.PI / 2;
    // head.castShadow = true;
    // head.recieveShadow = true;

    // this.add(head);
    // this.add(body);
    // this.head = head;

    // var headOutline = new THREE.Mesh(sphere, outlineMaterial);
    // headOutline.scale.multiplyScalar(1 + OUTLINE).x = (-1.0 - OUTLINE);
    // headOutline.position.y = 1.3;
    // this.add(headOutline);

    // var bodyOutline = new THREE.Mesh(cone, outlineMaterial);
    // bodyOutline.scale.multiplyScalar(1 + OUTLINE).x = (-1.0 - OUTLINE);
    // bodyOutline.position.y = 0.7;
    // this.add(bodyOutline);

    // var circle = new THREE.CircleGeometry(0.53, 32);
    // var baseOutline = new THREE.Mesh(circle, outlineMaterial);
    // baseOutline.scale.multiplyScalar(1);
    // baseOutline.position.y = 0.01;
    // baseOutline.rotation.x = -Math.PI / 2;
    // this.add(baseOutline);

    if (this.getName()) {
      this.generateLabel(this.getName());
    }

    this.generateLaser();
    // if (el.attr('name')) {
    //   obj.add(Player.createLabel(el));
    // }
  }

  getName () {
    return this.getAttribute('name');
  }

  // parseRotation () {
  //   if (this.hasAttribute('rotation')) {
  //     const q = this.createQuaternion(this.getAttribute('rotation'));
  //     this.head.quaternion.copy(q);
  //   }
  // }

  apply () {
    super.apply();

    const name = this.getAttribute('name');

    if (name && this.oldAttributes.name !== name) {
      this.setName(name);
    }

    const color = this.getAttribute('color');

    if (color && this.oldAttributes.color !== color) {
      this.setColor(color);
    }
  }

  setName (n) {
    if (this.nameSprite) {
      this.remove(this.nameSprite);
    }

    this.generateLabel(n);

    this.oldAttributes.name = n;
  }

  setColor (c) {
    this.faceMaterial.setValues({
      color: c
    });

    this.oldAttributes.color = c;
  }

  generateLaser () {
    /*
    // const originY = 1.25;
    const length = 2;
    const height = (1.85 - 1.5) / 2;

    var geometry = new THREE.CylinderBufferGeometry(0.02, 0.02, length, 16);

    this.laserMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00aa
    });

    var cylinder = new THREE.Mesh(geometry, this.laserMaterial);
    this.head.add(cylinder);

    cylinder.rotation.z = Math.PI / 2;
    cylinder.rotation.y = Math.PI / 2;
    cylinder.position.y = height;
    cylinder.position.z = -length / 2;

    var outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000
    });

    var outlineCylinder = new THREE.Mesh(geometry, outlineMaterial);
    outlineCylinder.scale.set(
      -1.4, -1.01, -1.4
    );
    this.head.add(outlineCylinder);

    outlineCylinder.rotation.z = Math.PI / 2;
    outlineCylinder.rotation.y = Math.PI / 2;
    outlineCylinder.position.y = height;
    outlineCylinder.position.z = -length / 2;
    */
  }

  generateLabel (name) {
    function roundRect (ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    var fontface = 'sans-serif';
    var fontsize = 42;
    var backgroundColor = { r: 0, g: 0, b: 0, a: 0.5 };
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width = 256;
    canvas.height = 64;
    context.font = 'bold ' + fontsize + 'px ' + fontface;

    // get size data (height depends only on font size)
    var metrics = context.measureText(name);
    var textWidth = Math.ceil(metrics.width);

    // background color
    context.fillStyle = 'rgba(' + backgroundColor.r + ',' + backgroundColor.g + ',' + backgroundColor.b + ',' + backgroundColor.a + ')';
    context.strokeStyle = 'rgba(0, 0, 0, 0)';
    context.lineWidth = 0;
    roundRect(context, 128 - 10 - textWidth / 2, 0, textWidth + 20, fontsize * 1.4, fontsize * 0.7);

    // text color
    context.fillStyle = 'rgba(255, 255, 255, 1.0)';
    context.strokeStyle = 'rgba(255, 255, 255, 1.0)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold ' + fontsize + 'px ' + fontface;
    context.fillText(name, 128, 30);

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    var sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1.0, 0.25, 1.0);
    sprite.position.set(0, 2.25, 0);

    this.add(sprite);

    this.nameSprite = sprite;
  }
}

module.exports = Avatar;
