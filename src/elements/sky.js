const THREE = require('three');
const Base = require('./base');

class Sky extends Base {
  constructor (element) {
    super(element);

    const texture = this.parseTexture();
    const color = this.parseColor();

    var geometry = new THREE.SphereGeometry(512, 64, 20);
    var material;

    if (texture) {
      material = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        map: texture
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: color
      });
    }

    this.add(new THREE.Mesh(geometry, material));

    this.apply();
  }

  parseScale () {
    this.scale.set(-1, 1, 1);
  }
}

module.exports = Sky;
