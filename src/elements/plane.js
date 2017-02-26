const THREE = require('three');
const Base = require('./base');

class Plane extends Base {
  constructor (element) {
    super(element);

    var geometry = new THREE.PlaneGeometry(1, 1);

    const mesh = new THREE.Mesh(geometry, this.parseMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.add(mesh);

    this.apply();
  }
}

module.exports = Plane;
