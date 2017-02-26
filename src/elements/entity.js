const Base = require('./base');

class Entity extends Base {
  constructor (element) {
    super(element);
    this.apply();
  }
}

module.exports = Entity;
