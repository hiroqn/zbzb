var type = exports.type = function (obj) {
  return obj == null ?
         String(obj) :
         core_toString.call(obj).slice(8, -1);
};
console.log('this is package example2');
