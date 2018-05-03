const VECTOR_ZERO = new THREE.Vector3();

const getRelativeVectorOfObject = (sourceObject, targetVector) => (
  new THREE.Vector3()
    .copy(sourceObject.position)
    .sub(targetVector)
    .applyQuaternion(
      new THREE.Quaternion()
        .copy(sourceObject.quaternion)
        .inverse()
    )
    .negate()
);

const averageVectorsFromElements = elements => (
  elements.reduce((acc, cur) => acc.add(cur.object3D.position), new THREE.Vector3()).divideScalar(elements.length)
);

const averageVectors = vectors => (
  vectors.reduce((acc, cur) => acc.add(cur), new THREE.Vector3()).divideScalar(vectors.length)
);

const getPositionVectorFromObject = object3D => object3D.position;

const dndTable = {
  schema: {
    legs: { type: 'array', default: [] },
    tableCenter: { type: 'selector' },
  },
  init: function() {
    this.data.initalCenter = new THREE.Vector3();
    this.data.registerSamples = [];
    this.data.supportingLegs = [];
    this.data.registering = false;
    this.addSample = AFRAME.utils.throttle(this.addSample, 200, this);

    this.data.legElements = this.data.legs.map(legSelector => document.querySelector(legSelector));
    this.data.registerButton = document.getElementById('registerTableButton');
    this.data.registerButton.addEventListener('click', () => this.toggleRegistering());

    this.data.toggleAnimationButton = document.getElementById('toggleAnimationButton');
    this.data.toggleAnimationButton.addEventListener('click', () => this.changeAnimation());

    this.currentAnimationIndex = 0;
    this.knight = document.querySelector('#knight');
    this.undead = document.querySelector('#undead');
    this.animations = [
      'clip: Bip001.001|Take 001|BaseLayer; crossFadeDuration: .3;',
      'clip: Bip001.001|Take 001|BaseLayer.002; crossFadeDuration: .3;',
    ];
  },

  changeAnimation: function() {
    this.currentAnimationIndex = (this.currentAnimationIndex+1)%2;
    var nextData = this.animations[this.currentAnimationIndex];
    this.knight.setAttribute('animation-mixer', nextData);
    this.undead.setAttribute('animation-mixer', nextData);
  },

  toggleRegistering: function() {
    this.data.registering = !this.data.registering;
    if (this.data.registering) {
      this.data.registerSamples = [];
      this.data.supportingLegs = [];
      this.data.registerButton.innerText = 'Click to Stop Registering Table';
      this.data.supportingLegs = this.data.legElements.filter(leg => leg && leg.getAttribute('visible'));
    } else {
      this.data.registerButton.innerText = 'Click To Start Registering Table';
      this.data.supportingLegs.forEach(leg => {
        const legId = leg.getAttribute('id');
        const existingSamples = this.data.registerSamples
          .map(sample => sample[legId])
          .filter(Boolean);
        const averagePosition = averageVectors(existingSamples);
        leg.setAttribute('table-leg', 'tableCenterOffset', averagePosition);
      });
    }
  },
  addSample: function() {
    this.data.supportingLegs = this.data.legElements.filter(leg => leg && leg.getAttribute('visible'));
    this.data.center = averageVectorsFromElements(this.data.supportingLegs);
    this.data.registerSamples.push(
      this.data.supportingLegs.reduce((acc, cur) => {
        if (!cur.getAttribute('visible') || cur.object3D.position.equals(VECTOR_ZERO)) {
          return acc;
        }
        return ({
          ...acc,
          [cur.getAttribute('id')]: getRelativeVectorOfObject(cur.object3D, this.data.center)
        });
      }, {})
    );
  },
  tick: function() {
    if (this.data.registering)  {
      this.addSample();
      /*
      const center = this.supportingLegs
        .reduce((acc, curr) => acc.add(curr.object3D.position), new THREE.Vector3() )
        .divideScalar(this.supportingLegs.length);

        this.supportingLegs.map(leg => {
        const quaternion = new THREE.Quaternion()
          .copy(leg.object3D.quaternion)
          .inverse();

        const relativeToCenter = new THREE.Vector3()
          .copy(leg.object3D.position)
          .sub(center)
          .applyQuaternion(quaternion)
          .negate();
        leg.setAttribute(
          'table-leg',
          'tableCenterOffset',
          relativeToCenter
        );
      });
      */
    }

    const visibleAndSupportedLegElements = this.data.supportingLegs.filter(leg => {
      const tableLeg = leg.getAttribute('table-leg');
      return tableLeg && tableLeg.tableCenterOffset;
    });
    const averagePosition = visibleAndSupportedLegElements
        .reduce((acc, curr) => acc
          .add(curr.object3D.position)
          .add(curr.getAttribute('table-leg').tableCenterOffset),
        new THREE.Vector3())
        .divideScalar(visibleAndSupportedLegElements.length);

    this.data.tableCenter.object3D.position.copy(averagePosition);
    if(this.data.supportingLegs.length > 0) {
      this.data.tableCenter.object3D.quaternion.copy(this.data.supportingLegs[0].object3D.quaternion);
    }
  }
};
AFRAME.registerComponent('dnd-table', dndTable);

const tablePiece = {
  schema: {
    marker: { type: 'selector' },
    table: { type: 'selector' },
  },
  init: function () {
    this.markerOffsetFromTable = new THREE.Vector3();
  },
  tick: function () {
    const tablePosition = this.data.table.object3D.position;
    const markerPosition = this.data.marker.object3D.position;
    const quaternion = new THREE.Quaternion()
          .copy(this.data.table.object3D.quaternion)
          .inverse();
    this.markerOffsetFromTable
      .copy(tablePosition)
      .sub(markerPosition)
      .applyQuaternion(quaternion)
      .multiply(new THREE.Vector3(1, 0, 1))
      .negate();
    this.el.object3D.position.copy(this.markerOffsetFromTable)
  },
}
AFRAME.registerComponent('table-piece', tablePiece);

const tableLeg = {
  schema: {
    id: { style: 'string' },
    tableCenterOffset: { type: 'vec3', default: null },
  },
  init: function() {
    this.childTableCenter = document.createElement('a-entity');
    this.childTableCenter.setAttribute('geometry', { primitive: 'box', height: 0.5, width: 0.5, depth: 0.5 });
    this.childTableCenter.setAttribute('color', 'red');
    this.el.appendChild(this.childTableCenter);
  },
  update: function() {
    this.childTableCenter.object3D.position.copy(this.data.tableCenterOffset);
  },
  remove: function() {
    this.el.removeChild(this.childTableCenter);
  },
};
AFRAME.registerComponent('table-leg', tableLeg);
