/* globals AudioContext, DOMParser, WebSocket */

const Renderer = require('./src/renderer');
const url = require('url');
const assert = require('assert');
const EventEmitter = require('events');
const morphdom = require('morphdom');

// WebVR polyfill doesnt detect gear vr correctly
if (!navigator.getVRDisplays) {
  require('webvr-polyfill');
}

class Connector extends EventEmitter {
  constructor (url, domElement) {
    super();

    this.scene = document.querySelector('a-scene'); // || document.createElement('a-scene');
    this.domElement = domElement || document.body;

    this.renderer = new Renderer(this);

    // if (window.AudioContext) {
    //   this.audioContext = new AudioContext();
    // }

    return;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.emit('connected');
    };

    this.socket.onmessage = (event) => {
      const firstCharacter = event.data[0];

      if (firstCharacter === '<') {
        var message;

        morphdom(this.scene, `<a-scene>${event.data}</a-scene>`);
        
        // try {
        //   message = this.parseMessage(event.data);
        // } catch (e) {
        //   console.error('Invalid xml', event.data);
        //   return;
        // }

        // this.onMessage(message);
      }

      if (firstCharacter === '{') {
        var packet;

        try {
          packet = JSON.parse(event.data);
        } catch (e) {
          console.error('Invalid json', event.data);
          return;
        }

        this.onPacket(packet);
      }
    };

    // Focus / blur - todo: maybe watch for page lost focus and blur
    // out the display to show you're not present?
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));

    setInterval(() => this.tick(), 1000 / this.frequency);
  }

  getAvatarByUUID (uuid) {
    return this.getAvatars().filter((a) => {
      return a.getAttribute('data-uuid') === uuid;
    })[0];
  }

  getAvatars () {
    return Array.from(this.scene.querySelectorAll('a-avatar'));
  }

  getOtherAvatars () {
    return this.getAvatars().filter((a) => {
      return a.getAttribute('data-uuid') !== this.uuid;
    });
  }

  startTalking () {
    console.log('#startTalking');

    if (this.audioStream) {
      this.startSending();
    } else {
      navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia;

      console.log('Requesting using media');

      // get video/voice stream
      navigator.getUserMedia({ video: false, audio: true }, (stream) => {
        console.log('Got audio stream');
        this.audioStream = stream;
        this.startSending();
      }, () => {
        console.log('Error getting audio stream');
        console.log(arguments);
      });
    }
  }

  startSending () {
    const avatars = this.getOtherAvatars();

    console.log('#startSending');
    console.log(avatars);

    avatars.forEach((avatar) => {
      const object = avatar.object3D;
      assert(object);
      object.startSending(this.audioStream);
    });
  }

  onVisibilityChange () {
    const focussed = (document.visibilityState === 'visible');

    if (focussed !== this.previousFocussed) {
      this.previousFocussed = focussed;

      this.send(focussed ? 'focus' : 'blur');
    }
  }

  tick () {
    // Round the position to 2dp
    const v = this.camera.position.clone().multiplyScalar(100).round().multiplyScalar(1.0 / 100);
    v.y -= 1.5;

    var r = this.camera.rotation.clone().toVector3();
    r.x /= Math.PI / 180;
    r.y /= Math.PI / 180;
    r.z /= Math.PI / 180;
    r = r.multiplyScalar(100).round().multiplyScalar(1.0 / 100);

    if (this.lastRotation && this.lastRotation.equals(r) && this.lastPosition && this.lastPosition.equals(v)) {
      // do nothing
    } else {
      this.lastRotation = r;
      this.lastPosition = v;

      this.send('avatarmove', {
        position: this.lastPosition.toArray(),
        rotation: this.lastRotation.toArray()
      });
    }
  }

  send (type, object) {
    this.sendRaw(
      JSON.stringify(Object.assign({}, object, {type: type}))
    );
  }

  sendRaw (packet) {
    if (this.connected) {
      this.socket.send(packet);
    }
  }

  get connected () {
    return this.socket.readyState === 1;
  }

  get frequency () {
    return 5;
  }

  onMessage (message) {
    // this.apply.onMessage(message);

    // if (message.nodeName === 'snapshot') {
    //   this.onSnapshot();
    // }

    // console.log(message);

    // this.scene.innerHTML = message;
  }

  onPacket (packet) {
    switch (packet.type) {
      case 'ready':
        this.onReady(packet);
        break;
      case 'signal':
        this.onSignal(packet);
        break;
      case 'chat':
        this.onChat(packet);
        break;
      default:
        console.log('Unhandled packet', packet);
    }
  }

  onChat (packet) {
    // lol just emit the UI can handle it
    this.emit('chat', packet.message);
  }

  onSignal (packet) {
    console.log('#signal');
    console.log(packet);

    const avatar = this.getAvatarByUUID(packet.sender);

    if (!avatar) {
      console.log('Disregarding signal from non-present avatar.');
      return;
    }

    const object = avatar.object3D;
    assert(object);

    // Send signal
    object.onSignal(packet);
  }

  onReady (packet) {
    this.uuid = packet.uuid;

    // Gross race conditions
    var avatarInterval;

    avatarInterval = setInterval(() => {
      if (this.avatar) {
        this.avatar.myself = true;
        clearInterval(avatarInterval);
      }
    }, 250);
  }

  onSnapshot () {
    // this.camera.setAttribute('position', this.avatar.getAttribute('position'));
    // this.camera.setAttribute('rotation', this.avatar.getAttribute('rotation'));
  }

  get avatar () {
    return this.avatarElement.object3D;
  }

  get camera () {
    return this.renderer.camera;
  }

  // get camera () {
  //   return this.scene.querySelector('a-camera');
  // }

  get avatarElement () {
    return this.scene.querySelector(`a-avatar[data-uuid='${this.uuid}']`);
  }

  parseMessage (html) {
    // fixme this is super error prone (use strict xml for the streaming format or
    // something else)
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/xml');
    return doc.firstChild;
  }
}

window.Connector = Connector;

window.startScene = function () {
  // const uri = url.parse('http://localhost:8080/lucy');
  // uri.protocol = uri.protocol === 'https:' ? 'wss:' : 'ws:';

  window.connector = new Connector(); // url.format(uri), document.body);
};

setTimeout(() => {
  startScene();
}, 500);
