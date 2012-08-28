var fs = require('fs'),
    path = require('path'),
    Kls = require('./kls.js');
var fsRFS = function (p) {
  return fs.readFileSync(p, 'utf8');
};
var wrapperCode = fsRFS(__dirname + '/wrapper.js');

function isDir(p) {
  return fs.statSync(p).isDirectory();
}
function isFile(p) {
  return fs.statSync(p).isFile();
}
//var CodeArray = Kls.derive(function(code){
//
//});
var Ctrler = Kls.derive(function (gcpath, options) {
  this.basepath = path.resolve(gcpath);
  var type = Ctrler.check(this.basepath), self = this;
  if (!gcpath || !type) {
    throw new Error('not satisfy');
  }
  this.type = type;
  this._default(options || {});
  this._setting();
  if (this.src === this.basepath) {
    this._include(fs.readdirSync(this.src).map(function (f) {
      return self._resolve(f);
    }));
  } else {
    this._include(this.src);
  }
});
Ctrler.statics({
  check: function (bpath) {
    if (fs.existsSync(bpath + '/g.json')) {
      return 'mod';
    }
    if (fs.existsSync(bpath + '/package.json')) {
      return 'pkg';
    }
    return '';
  },
  ignoreList: {
    'g.json': true,
    'package.json': true
  },
  readCodeArray: function (pth) {
    return fsRFS(pth).split(/\r\n|\n/);
  }
});
Ctrler.mixin({
  _default: function (options) {
    this.options = options;
    if (!options.hasOwnProperty('space')) {
      options.space = '  ';
    }
    if (!options.hasOwnProperty('lf')) {
      options.lf = '\n';
    }
    this.files = [];
    this.packages = [];
    this.gDir = this._resolve('.global');
    this.main = this._resolve('index.js');
    this.src = this.basepath;
  },
  _setting: function () {
    var json;
    if (fs.existsSync(this.gDir) && isDir(this.gDir)) {
      var _rslv = path.resolve.bind(path, this.basepath, this.gDir);

      this.globals = fs.readdirSync(this.gDir).map(_rslv, this).filter(isFile);
    }
    if (this.type === 'pkg') {
      json = JSON.parse(fsRFS(this._resolve('package.json')));
      if(json.main){
        this.main = this._resolve(json.main);
      }
    }
  },
  _resolve: function (dir) {
    return path.resolve(this.basepath, dir);
  },
  _include: function (filepath) {
    if (!filepath) return this;

    var paths = (Array.isArray(filepath) ? filepath : [filepath]);
    paths.forEach(function (p) {
      //exclude File or Directory startWith . (ex .git)
      if (/^\./.test(path.basename(p))) {return;}
      if (isDir(p)) { //dir
        if (Ctrler.check(p)) {
          this.packages.push(p);
        } else {
          this._include(fs.readdirSync(p).map(path.resolve.bind(path, p)));
        }
      } else {// file
        if (Ctrler.ignoreList[path.basename(p)]) {return;}
        //exclude main
        if (this.main === p) { return; }
        this.files.push(p);
      }
    }, this);
    return this;
  },
  toCode: function () {
    var name = path.basename(this.basepath);
    var array = [
      '"' + name + '", function (module, exports, require, register) {',
      this.render(),
      '}'
    ];
    var str = this.array2code(array);
    var wc = wrapperCode.split(/\$CodePlaceHolder\$/);
    return wc[0] + str + wc[1];
    //    console.log(str);
  },

  _loader: function (filepath) {

    var ext = path.extname(filepath);
    if (ext !== '.js' && ext !== '.json') {
      return [];
    } else {
      var source = Ctrler.readCodeArray(filepath);
      if (this.basepath === filepath.substr(0, this.basepath.length)) {
        filepath = filepath.substr(this.basepath.length + 1);
        // if windows
        if (path.sep === '\\') {
          filepath = filepath.replace(/\\/, '/')
        }
      } else {
        throw new Error('where u r lookin?');
      }
      if (ext === '.js') {
        return [
          'register("' + filepath + '", function (module, exports, require) { ',
          source,
          ' });'
        ];

      }
      if (ext === '.json') {
        return [
          'register("' + filepath + '", ',
          JSON.stringify(JSON.parse(source)),
          ');'
        ];
      }
    }
  },
  render: function () {
    var codeArray = [];
    // for .global
    if (this.globals) {
      this.globals.forEach(function (p) {
        codeArray = codeArray.concat(Ctrler.readCodeArray(p));
      });
    }
    // for package
    this.packages.forEach(function (p) {
      var ctrler = new Ctrler(p, this.options);
      codeArray = codeArray.concat(ctrler.toArray());
    }, this);
    // for files
    this.files.forEach(function (p) {
      codeArray = codeArray.concat(this._loader(p));
    }, this);
    var base = path.relative(this.basepath, this.main);
    if (base === path.basename(this.main)) {
      codeArray = codeArray.concat([
        'register(null , function () {',
        Ctrler.readCodeArray(this.main),
        ' });'
      ]);
    } else {
      // if windows
      if (path.sep === '\\') {
        base = base.replace(/\\/, '/')
      }
      codeArray.concat(this._loader(this.main));
      codeArray = codeArray.concat([
        'register(null , function () {',
        ['module.exports = require("./' + base + '");'],
        ' });'
      ]);
    }
    return codeArray;
  },
  toArray: function () {
    var n = path.basename(this.basepath);
    return [
      'register("/' + n + '", function (module, exports, require, register) {',
      this.render(),
      '});'
    ]
  },
  // array to code with indent
  array2code: function (array) {
    var space = this.options.space,
        lf = this.options.lf;

    function array2string(array, space) {
      return array.reduce(function (str, arr) {
        var code = Array.isArray(arr) ?
                   array2string(arr, space + space) :
                   space + arr + lf;
        return str + code;
      }, '');
    }

    return array2string(array, space);
  }
});
function build(p, options) {
  return new Ctrler(p, options).toCode();
}
exports.build = build;
