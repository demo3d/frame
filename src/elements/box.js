const THREE = require('three');
const Base = require('./base');

class Box extends Base {
  constructor (element) {
    super(element);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, this.parseMaterial());
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.add(mesh);

    this.apply();
  }
}

module.exports = Box;
