/**
 * Created by cmj on 16/4/10.
 */
var util = require('util')

var TError = function (msg, constr) {
    Error.captureStackTrace(this, constr || this)
    this.message = msg || 'Error'
}
util.inherits(TError, Error);
TError.prototype.name = 'ORM Error';

module.exports = TError;