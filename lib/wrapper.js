(function (topName, callback) {
  function Module(name, fn) {
    (this.pwd = name.split('/')).pop();
    if (typeof fn === 'function') {
      this.exports = {};
      this.main = fn;
    } else {// this is for json
      this.exports = fn;
      this.loaded = true;
    }
  }

  Module.prototype.loaded = false;
  Module.prototype.main = function () {console.log('no main');};
  Module.prototype.load = function (mgr) {
    var pwd = this.pwd,
        require = function (name) {
          return _require.call(mgr, pwd, name);
        };
    this.main.call(this.exports, this, this.exports, require);
  };
  var packageMap = {};

  function Manager(name, manager) {
    this.moduleMap = {};// function
    this.exports = {};
    if (name) {
      this.pwd = manager.pwd.concat(name);
      packageMap[this.pwd.join('/')] = this;
    } else {
      this.pwd = [];
    }
  }

  Manager.prototype.main = function () {console.log('no main');};
  Manager.prototype.loaded = false;
  Manager.prototype.load = function () {
    this.main.call(this.exports);
  };

  Manager.prototype.provide = function (name, fn) {
    var mgr = new Manager(name, this),
        register = function (name, cb) {// register function
          if (name === null) {
            return mgr.main = cb;
          }
          if (name.charAt(0) === '/') {
            mgr.provide(name.slice(1), cb);
          } else {
            mgr.moduleMap[name] = new Module(name, cb);
          }
        },
        require = function (name) {
          return _require.call(mgr, [], name);
        };
    fn.call(mgr.exports, mgr, mgr.exports, require, register);
    return mgr;
  };

  Manager.prototype.resolve = function (pwd, name) {
    var segs, path, i, seg;
    if ('.' === name.charAt(0)) {// this module
      segs = name.split('/');
      path = pwd.slice(0);
      for (i = 0; i < segs.length; i++) {
        seg = segs[i];
        ('..' === seg ) ? path.pop() : ('.' !== seg && path.push(seg))
      }
      return this.moduleMap[path.join('/')];
    } else {
      pwd = this.pwd.slice(0);
      pwd.push(name);
      for (i = pwd.length; i > 0; i--, pwd.splice(i - 1, 1)) {
        if (seg = packageMap[pwd.join('/')]) {// seg is pkg
          return seg;
        }
      }
    }
  };
  function _require(pwd, name) {
    var module = this.resolve(pwd, name);
    if (!module) {
      throw new Error('cant resolve ' + name + pwd.join('/'));
    }
    if (!module.loaded) {
      module.loaded = true;
      module.load(this);
    }
    return module.exports;
  }

  var root = Manager.prototype.provide.call({}, null, callback);
  root.loaded = true;
  root.load();
}).call(null, $CodePlaceHolder$);
