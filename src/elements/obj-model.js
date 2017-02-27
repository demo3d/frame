const THREE = require('three');
const Base = require('./base');
const OBJLoader = require('../vendor/obj-loader');

const manager = new THREE.LoadingManager();

manager.onProgress = function (item, loaded, total) {
  // console.log(item, loaded, total);
};

const loader = new OBJLoader(manager);

function onProgress () {
  // console.log(arguments);
}

function onError (err) {
  console.error(err);
}

class ObjModel extends Base {
  constructor (element) {
    super(element);

    this.apply();
  }

  apply () {
    super.apply();

    const material = this.parseMaterial(); // new THREE.MeshLambertMaterial({ color: '#00aaff' });

    if (this.hasAttribute('src')) {
      this.empty();

      loader.load(this.getAttribute('src'), (object) => {
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
            child.castShadow = true;
            child.receiveShadow = false;
          }
        });

        this.add(object);
      }, onProgress, onError);
    }
  }
}

module.exports = ObjModel;
