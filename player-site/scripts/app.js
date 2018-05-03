const VECTOR_ZERO = new THREE.Vector3();

const dndTable = {
  schema: {
    legs: { type: 'array', default: [] },
    tableCenter: { type: 'selector' },
  },
  init: function() {
    this.legElements = this.data.legs.map(legSelector => document.querySelector(legSelector));
    this.registerButton = document.getElementById('registerTableButton');
    this.registering = false;
    this.registerButton.addEventListener('click', () => {
      this.registering = !this.registering;
    });
  },
  tick: function() {
    const visibleLegElements = this.legElements.filter(leg => leg.getAttribute('visible'));
    if (this.registering)  {
      const center = visibleLegElements
        .reduce((acc, curr) => acc.add(curr.object3D.position), new THREE.Vector3() )
        .divideScalar(visibleLegElements.length);
      const tableRotation = visibleLegElements
      .reduce((acc, curr) => acc.add(curr.object3D.position), new THREE.Quaternion() )
      visibleLegElements.map(leg => {
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
    }
    const visibleAndSupportedLegElements = visibleLegElements.filter(leg => {
      const tableLeg = leg.getAttribute('table-leg');
      return tableLeg && tableLeg.tableCenterOffset;
    });
    const averagePosition = visibleAndSupportedLegElements
        .reduce((acc, curr) => acc
          .add(curr.object3D.position)
          .add(curr.getAttribute('table-leg').tableCenterOffset),
        new THREE.Vector3() )
        .divideScalar(visibleAndSupportedLegElements.length);
    
    this.data.tableCenter.object3D.position.copy(averagePosition);
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
    this.markerOffsetFromTable
      .copy(markerPosition)
      .sub(tablePosition)
      .negate()
      .multiply(new THREE.Vector3(1, 0, 1))
      .floor();
    this.el.object3D.position.copy(this.markerOffsetFromTable)
  },
}
AFRAME.registerComponent('table-piece', tablePiece);

const tableLeg = {
  schema: {
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
