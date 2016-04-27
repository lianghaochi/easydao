/*!
 * EasyDAO
 * Copyright(c) 2016
 * @version 0.1
 * @author CheMingjun <chemingjun@126.com>
 */
'use strict';
let TError = require('./err'), util = require('./util'), fs = require("fs"), path = require("path"), dsReg = {}, toPojo = (_rows, _mp)=> {
    let rtn = [];
    if (_rows && _rows.length > 0) {
        _rows.forEach(row=> {
            let pj = {}, tm, tv;
            for (let nm in row) {
                for (let k in _mp) {
                    tm = _mp[k];
                    if (tm) {
                        if (typeof(tm) == 'object') {
                            if (typeof(tm.name) == 'string') {
                                if (typeof tm.value === 'function') {
                                    pj[k] = tm.value(row[tm.name]);
                                } else {
                                    pj[k] = row[tm.name];
                                }
                            } else if (util.is.array(tm.name)) {
                                let tva = [];
                                tm.name.forEach(nm=> {
                                    tva.push(row[nm]);
                                })
                                if (typeof tm.value === 'function') {
                                    pj[k] = tm.value.apply(this, tva);
                                } else {
                                    pj[k] = tva.join();
                                }
                            } else {
                                throw new Error('Dao Mapping error[' + _mp + ']');
                            }
                        } else if (typeof(tm) == 'string') {
                            pj[k] = row[tm];
                        } else {
                            throw new Error('Dao Mapping error[' + _mp + ']');
                        }
                    } else {
                        pj[k] = null;
                    }
                }
            }
            rtn.push(pj);
        })
        return rtn;
    }
    return null;
}, ds = function (_ds) {
    this.mysqlPool = null;
    if (typeof(_ds) === 'object') {
        if (typeof(_ds.db) === 'string' && _ds.db.toUpperCase(_ds.db) === 'MYSQL') {
            var mysql = require('mysql');
            try {
                this.mysqlPool = mysql.createPool({
                    host: _ds.host,
                    user: _ds.user,
                    password: _ds.password,
                    port: _ds.port,
                    database: _ds.database
                });
                util.log.info('[Toybricks-web] The database start finished.');
            } catch (err) {
                throw new TError("[Toybricks-web] init database's connection pool error.")
            }
        }
    }
}, getDao = function (_ds, _mapping) {
    let pe = function (_err, _sql) {
        _sql ? util.log.error('Dao error:sql[' + _sql + ']') : null;
        this.con.release();
        throw _err;
    }, nd = function (_cb, _rtn) {
        let r = _rtn;
        if (typeof(_cb) == 'function') {
            r = _cb(_rtn);//return key value
        }
    }, rdao = {
        query: function (_sql) {
            util.log.debug('[DAO Exe sql] ' + _sql);
            return _cb=> {
                try {
                    this.con.query(_sql, (err, _rtn, fields)=> {
                        if (err) {
                            pe.call(this, err, _sql);
                        } else {
                            let tary = _sql.split(/\s/g);
                            nd(_cb, /,|\(/g.test(tary[1]) || !_mapping ? _rtn : toPojo(_rtn, _mapping));
                        }
                    });
                } catch (_err) {
                    pe.call(this, _err);
                }
            }
        }, add: function (_sql) {
            util.log.debug('[DAO Exe sql] ' + _sql);
            return _cb=> {
                try {
                    this.con.query(_sql, (err, _rtn, fields)=> {
                        if (err) {
                            pe.call(this, err, _sql);
                        } else {
                            nd(_cb, _rtn.insertId);
                        }
                    });
                } catch (_err) {
                    pe.call(this, _err);
                }
            }
        }, update: function (_sql) {
            util.log.debug('[DAO Exe sql] ' + _sql);
            return _cb=> {
                try {
                    this.con.query(_sql, (err, _rtn, fields)=> {
                        if (err) {
                            pe.call(this, err, _sql);
                        } else {
                            nd(_cb, _rtn.affectedRows);
                        }
                    });
                } catch (_err) {
                    pe.call(this, _err);
                }
            }
        }, del: function (_sql) {
            util.log.debug('[DAO Exe sql] ' + _sql);
            return _cb=> {
                try {
                    this.con.query(_sql, (err, _rtn, fields)=> {
                        if (err) {
                            pe.call(this, err, _sql);
                        } else {
                            nd(_cb, _rtn.affectedRows);
                        }
                    });
                } catch (_err) {
                    pe.call(this, _err);
                }
            }
        }
    };
    let ndao = {};
    for (let nm in rdao) {
        (function (_nm) {
            ndao[_nm] = function (_sql) {
                return function (_cb) {
                    _ds.mysqlPool.getConnection(function (err, _con) {
                        if (err) {
                            throw err;
                        }
                        rdao[_nm].call({con: _con}, _sql)(function (_rtn) {
                            _con.release();
                            _cb ? _cb(_rtn) : null;
                        });
                    });
                }
            }
        })(nm);
    }
    return ndao;
}
//--------------------------------------------------------------------------------------------
module.exports = {
    init: (appReg)=> {
        if (!appReg) {
            var efp = (function () {
                let pt = module.parent, rtn = pt ? pt.filename : __filename;
                while (pt != null) {
                    rtn = pt ? pt.filename : __filename;
                    pt = pt.parent;
                }
                if (!rtn) {
                    throw new Error('easydao init error.');
                }
                return rtn;
            })();
            var _mPath = util.path.modulePath(efp);
            var pckPath = path.join(_mPath, 'package.json');
            if (fs.existsSync(pckPath)) {
                try {
                    var pckJson = require(pckPath);
                    var json = pckJson['easydao'];
                    var nm = pckJson['name'];
                    if (json && nm) {
                        appReg = {};
                        appReg[nm] = json;
                    }
                } catch (err) {
                    throw err;
                }
            }
        }
        for (let mn in appReg) {
            let opt = appReg[mn];
            if (typeof opt.ds === 'object') {
                dsReg[mn + (opt.ds.name || '')] = new ds(opt.ds);
            }
        }
    }, dao: function (_mn, _dsName) {
        return this.daoProxy2(_mn, _dsName);
    }, daoProxy2: function(_mn, _dsName, _mapping, _proxy) {//return thunk
        let ds = dsReg[_mn + (_dsName || '')], dao = null;
        if (_proxy) {
            dao = _proxy(getDao.call(null, ds, _mapping));
            if (dao && typeof dao === 'object') {
                let ndao = {}, genExe = function (gen, _cb) {
                    let nt = _d=> {
                        let rst = gen.next(_d);
                        if (!rst.done) {//assign it's a thunk
                            rst.value(_dt=> {
                                nt(_dt);
                            });
                        } else {
                            _cb && _cb(rst.value);
                        }
                    };
                    nt();
                };
                for (let nm in dao) {
                    let mgen = dao[nm];
                    ndao[nm] = function () {
                        let args = Array.prototype.slice.call(arguments);
                        return function (_cb) {//translate to thunk
                            genExe(mgen.apply(ndao, args), _cb);//use ndao as it's context
                        }
                    }
                }
                dao = ndao;
            } else {
                throw new Error("The proxed dao is not a object[name : generator].");
            }
        } else {
            dao = getDao.call(null, ds)
        }
        return dao;
    }, daoProxy: function(_mapping, _proxy) {//return thunk
        var _mn ,_dsName;
        var efp = (function () {
            let pt = module.parent, rtn = pt ? pt.filename : __filename;
            while (pt != null) {
                rtn = pt ? pt.filename : __filename;
                pt = pt.parent;
            }
            if (!rtn) {
                throw new Error('easydao get daoProxy error.');
            }
            return rtn;
        })();
        var _mPath = util.path.modulePath(efp);
        var pckPath = path.join(_mPath, 'package.json');
        if (fs.existsSync(pckPath)) {
            try {
                var pckJson = require(pckPath);
                var json = pckJson['easydao'];
                var nm = pckJson['name'];
                if (json && nm) {
                    _mn = nm;
                    _dsName = json.ds.name || '';
                    return this.daoProxy2(_mn, _dsName,_mapping,_proxy);
                }
            } catch (err) {
                throw err;
            }
        }
        throw new Error('easydao get daoProxy error.');
    }
};
