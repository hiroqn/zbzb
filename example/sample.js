var add = require('./math.js').add,
    map = module.exports = function () {
      return Array.prototype.slice.call(arguments).map(add);
    };
console.log(map(1, 2, 3));
require('example2/example3');
var type = require('example2').type;
console.log(type(console.log)); // Function
