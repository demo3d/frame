const THREE = require('three');

const materialDefinitions = {
  phongDiffuse: {
    uniforms: {
      uDirLightPos: { type: 'v3', value: new THREE.Vector3() },
      uDirLightColor: { type: 'c', value: new THREE.Color(0xffffff) },
      uMaterialColor: { type: 'c', value: new THREE.Color(0xffffff) },
      uKd: {
        type: 'f',
        value: 1.0
      },
      uBorder: {
        type: 'f',
        value: 0.5
      }
    },

    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        vNormal = normalize( normalMatrix * normal );
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        vViewPosition = -mvPosition.xyz;
      }
    `,

    fragmentShader: `
      uniform vec3 uMaterialColor;

      uniform vec3 uDirLightPos;
      uniform vec3 uDirLightColor;

      uniform float uKd;
      uniform float uBorder;

      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {

        // compute direction to light
        vec4 lDirection = viewMatrix * vec4( uDirLightPos, 0.0 );
        vec3 lVector = normalize( lDirection.xyz );

        // diffuse: N * L. Normal must be normalized, since it's interpolated.
        vec3 normal = normalize( vNormal );

        //was: float diffuse = max( dot( normal, lVector ), 0.0);
        // solution
        float diffuse = dot( normal, lVector );
        if ( diffuse > 0.6 ) { 
          diffuse = 1.0; 
        } else if ( diffuse > -0.2 ) { 
          diffuse = 0.7; 
        }
        else { diffuse = 0.3; }

        gl_FragColor = vec4( uKd * uMaterialColor * uDirLightColor * diffuse, 1.0 );

      }
    `
  }
};

// Global light
const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(200, 200, 200);

// materials
const materialColor = new THREE.Color();
materialColor.setRGB(1.0, 1.0, 1.0);

function createShaderMaterial (id, light) {
  var shader = materialDefinitions[id];
  var u = THREE.UniformsUtils.clone(shader.uniforms);
  var vs = shader.vertexShader;
  var fs = shader.fragmentShader;
  var material = new THREE.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs });

  material.uniforms.uDirLightPos.value = light.position;
  material.uniforms.uDirLightColor.value = light.color;

  return material;
}

module.exports = function () {
  const phongMaterial = createShaderMaterial('phongDiffuse', light);
  phongMaterial.uniforms.uMaterialColor.value.copy(materialColor);
  phongMaterial.side = THREE.DoubleSide;
  return phongMaterial;
};
