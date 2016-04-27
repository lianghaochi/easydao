/*!
 * Toybricks
 * Copyright(c) 2016
 * Author: CheMingjun <chemingjun@126.com> (http://jieweb.cn)
 */
var fs = require("fs"), path = require("path"), _logger = null, logger = function () {
    if (!_logger) {
        var lg = require('log4js');
        lg.configure({
            appenders: [
                {type: 'console'},
                {
                    type: 'dateFile',
                    filename: 'logs/log',
                    pattern: "_yyyy-MM-dd",
                    maxLogSize: 1024,
                    alwaysIncludePattern: false,
                    backups: 4,
                    category: 'logger'
                },
            ],
            replaceConsole: true
        });
        _logger = lg.getLogger('ORM');
    }
    return _logger;
}
//----------------------------------------------------------------------
module.exports = {
    is: {
        array: function (_o) {
            return Object.prototype.toString.call(_o) == '[object Array]';
        }, generator: function (_o) {
            return typeof _o == 'object' && typeof _o.next == 'function' && typeof _o.throw == 'function';
        }
    },
    log: {
        debug: function (_msg) {
            logger().debug(_msg);
        },
        info: function (_msg) {
            logger().info(_msg);
        }, error: function (_msg) {
            logger().error(_msg);
        }
    },
    path: {
        modulePath: function (_fpath) {
            var dirPath = path.dirname(_fpath);
            var ts = './', tp = path.join(dirPath, ts + 'package.json');
            while (tp != '' && !fs.existsSync(tp)) {
                ts += '../';
                tp = path.join(dirPath, ts + 'package.json')
            }
            return path.dirname(tp);
        }
    },
    json: {
        merge: function (_target, _source) {
            //var sources = [].slice.call(arguments, 1);
            if (_target && typeof _target != 'object') {
                throw new Error('merge json,target must be a object.');
            }
            _target = _target || {};
            if (typeof _source === 'object') {
                for (var p in _source) {
                    _target[p] = _source[p];
                }
            }
            return _target;
        }
    },
    string: {
        stripBOM: function (content) {
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
            }
            return content;
        }
    },
    file: {
        create: function (_path, _cb) {
            var ary = _path.split("/");
            var mode = 0755;
            _cb = _cb || function () {
                };
            if (ary[0] === "." || ary[0] === "/") {
                ary.shift();
            }
            if (ary[0] == "..") {
                ary.splice(0, 2, ary[0] + "/" + ary[1])
            }
            function inner(cur) {
                var file;
                if (ary.length > 0) {
                    if (!fs.existsSync(cur)) {
                        fs.mkdirSync(cur, mode)
                    }
                    inner(cur + "/" + ary.shift());
                } else {
                    file = fs.openSync(cur, "w");
                    _cb(file);
                }
            }

            ary.length && inner('/' + ary.shift());
        },
        remove: (function () {
            function iterator(url, dirs) {
                var stat = fs.statSync(url);
                if (stat.isDirectory()) {
                    dirs.unshift(url);
                    inner(url, dirs);
                } else if (stat.isFile()) {
                    fs.unlinkSync(url);
                }
            }

            function inner(path, dirs) {
                var arr = fs.readdirSync(path);
                for (var i = 0, el; el = arr[i++];) {
                    iterator(path + "/" + el, dirs);
                }
            }

            return function (dir, cb) {
                cb = cb || function () {
                    };
                var dirs = [];

                try {
                    iterator(dir, dirs);
                    for (var i = 0, el; el = dirs[i++];) {
                        fs.rmdirSync(el);
                    }
                    cb()
                } catch (e) {//ignore this exception
                    e.code === "ENOENT" ? cb() : cb(e);
                }
            }
        })()
    }
}