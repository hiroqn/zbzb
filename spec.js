var zbzb = require('./lib/builder.js'),
    str = zbzb.build(__dirname + '/example'
//        , {  // if windows
//          lf: '\r\n'
//        }
    );
console.log(str);
