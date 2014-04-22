var Promise = require('bluebird');


var Spec = (function() {
    function Spec(key, desc) {
        this.key = key;
        this.desc = desc;
        this.constraints = [];
    }

    Spec.prototype.doc = function() {
        var spec = this;
        return {
            required: this.required,
            key: this.key,
            desc: this.desc,
            constraints: this.constraints.map(function(c) {
                return c.doc();
            })
        };
    };

    Spec.prototype.required = true;

    Spec.prototype.makeConstraints = function(desc, check) {
        this.constraints.push(new this.Constraints(desc, check));

        return this;
    };

    Spec.prototype.Constraints = (function() {
        function Constraints(desc, check) {
            this.desc = desc;
            this.check = check;
        }

        Constraints.prototype.doc = function() {
            return this.desc;
        };

        Constraints.prototype.toJSON = function() {
            return this.doc();
        };

        return Constraints;
    })();

    return Spec;
})();


var Param = (function () {
    function Param(builder) {
        this.builder = builder;
        this._specs = [];
    }

    Param.prototype.Spec = Spec;//expose Spec

    Param.prototype.push = function(spec) {
        if(this._optional) {
            spec.required = false;
            delete this._optional;
        }
        this._specs.push(spec);
        return this;
    };

    Object.defineProperty(Param.prototype, 'optional', {
        enumerable: false,
        configurable: false,
        get: function () {
            this._optional = true;
            return this;
        }
    });

    Param.prototype.string = function(key, desc, length) {
        var spec = new this.Spec(key, desc);
        if(length) {
            spec.makeConstraints({type: 'string', length: length}, function(s) {
                if(!length) {
                    return true;
                }

                var len = s.length;

                if((typeof length[0] === 'number') && len < length[0]) {
                    return false;
                }

                if((typeof length[1] === 'number') && len > length[1]) {
                    return false;
                }

                return true;
            });
        }
        return this.push(spec);
    };
    Param.prototype.int = function(key, desc, range) {
        var spec = new this.Spec(key, desc);
        spec.makeConstraints({type: 'int', range: range}, function(i) {
            var num = parseInt(i);
            if(num.toString() !== i.toString()) {
                return false;
            }
            if(!range) {
                return true;
            }
            if(typeof range[0] === 'number' && num < range[0]) {
                return false;
            }
            if(typeof range[1] === 'number' && num > range[1]) {
                return false;
            }

            return true;
        });
        return this.push(spec);
    };
    Param.prototype.regex = function(key, desc, re) {
        var spec = new this.Spec(key, desc);
        spec.makeConstraints({type: 'regex', re: re.toString()}, function(s) {
            return s.match(re);
        });
        return this.push(spec);
    };

    Param.prototype._getTarget = function(req) {
        return req.body;
    }

    Param.prototype.mixin = function(obj) {
        var param = this;
        Object.keys(obj).forEach(function(k) {
            param[k] = obj[k];
        });

        return this;
    }

    Param.prototype.expose = function() {
        var param = this;

        var exposed = {
            parse: function (req) {
                var paramValues = {};
                var targetPromise = Promise.cast(param._getTarget(req));

                return Promise.all(param._specs.map(runSpec)).return(paramValues);

                function runSpec(spec) {
                    return targetPromise.then(function(target) {
                        if (typeof target[spec.key] === 'undefined' || target[spec.key] === '') {
                            if (spec.required) {
                                return Promise.reject({
                                    name: 'SpecError',
                                    spec: spec,
                                    target: target,
                                    message: 'miss required param',
                                    statusCode: 400
                                });
                            } else {
                                return;
                            }
                        }

                        var val = target[spec.key];
                        return Promise.all(spec.constraints.map(function (cons) {
                            return Promise.cast(cons.check(val)).then(function(ok) {
                                if(!ok) {
                                    return Promise.reject({
                                        name: 'SpecError',
                                        spec: spec,
                                        target: target,
                                        violation: cons,
                                        message: 'constraints violation',
                                        statusCode: 400
                                    });
                                }
                            });
                        })).return(val);
                    }).then(function (val) {
                        paramValues[spec.key] = val;
                    });
                }
            }
        };
        Object.defineProperty(exposed, 'doc', {
            get: function() {
                return param._specs.map(function (spec) {
                    return spec.doc();
                });
            }
        });

        return exposed;
    };

    Object.defineProperty(Param.prototype, 'endParam', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this.builder;
        }
    });

    return Param;
})();

module.exports = Param;
