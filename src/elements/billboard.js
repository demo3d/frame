const THREE = require('three');
const Base = require('./base');
const htmlToCanvas = require('../vendor/html-to-canvas');
const _ = require('lodash');

const RESOLUTION = 1024;
const SUPER_SAMPLING = 2;

var requestIdleCallback = window['requestIdleCallback'];

if (!requestIdleCallback) {
  requestIdleCallback = function (func) {
    setTimeout(func, 1000 / 60);
  };
}

class Billboard extends Base {
  constructor (element) {
    super(element);

    this.apply();

    this.div = document.createElement('div');
    this.div.style.cssText = `
      position: absolute; 
      left: 0; 
      top: -4096px; 
      width: ${RESOLUTION / SUPER_SAMPLING}px !important; 
      height: ${RESOLUTION / SUPER_SAMPLING}px !important;
      margin: 0;
      padding: 0;
      font-size: 24px;
      box-sizing: border-box;
      background: white;
    `;

    this.div.innerHTML = element.innerHTML.replace(/^....\[CDATA\[/, '').replace(/]](>|&gt;)$/, '');

    // Array.from(this.div.querySelectorAll('img')).forEach((img) => {
    //   img.setAttribute('crossOrigin', 'anonymous');
    // });

    document.body.appendChild(this.div);

    const imgs = Array.from(this.div.querySelectorAll('img'));

    const onload = _.after(imgs.length, () => {
      requestIdleCallback(() => {
        const canvas = htmlToCanvas(this.div, SUPER_SAMPLING);
        const texture = new THREE.Texture(canvas);

        var geometry = new THREE.BoxGeometry(1, 1, 1);
        var material = new THREE.MeshLambertMaterial({
          map: texture
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = false;

        this.add(mesh);
        texture.needsUpdate = true;

        // document.body.removeChild(this.div);
      });
    });

    if (imgs.length === 0) {
      onload();
    }

    imgs.forEach((img) => {
      if (img.complete) {
        onload();
      } else {
        img.addEventListener('load', onload);
      }
    });
  }
}

module.exports = Billboard;
