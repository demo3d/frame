const THREE = require('three');
const Base = require('./base');
const STLLoader = require('../vendor/stl-loader');

const manager = new THREE.LoadingManager();

manager.onProgress = function (item, loaded, total) {
  console.log(item, loaded, total);
};

const loader = new STLLoader(manager);

function onProgress () {
  console.log(arguments);
}

function onError (err) {
  console.error(err);
}

class StlModel extends Base {
  constructor (element) {
    super(element);

    this.apply();
  }

  apply () {
    super.apply();

    const material = new THREE.MeshPhongMaterial({
      specular: 0xffffff,
      color: '#00aaff',
      shininess: 200
    });

    if (this.hasAttribute('src')) {
      this.empty();

      loader.load(this.getAttribute('src'), (geometry) => {
        console.log('added!');
        console.log(geometry);

        const mesh = new THREE.Mesh(geometry, material);

        mesh.castShadow = true;

        this.add(mesh);
      }, onProgress, onError);
    }
  }
}

module.exports = StlModel;
