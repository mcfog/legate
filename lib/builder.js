/**
 * Created by McFog on 2014/4/15.
 *
 * Api Builder
 */

function Builder(api) {
    this.api = api;
    var builder = this;

    var proto = api.property || {};
    api.property = Object.create(proto);
    Object.keys(proto).forEach(function(field) {
        builder[field] = function (value) {
            api.property[field] = value;
            return this;
        };
    });

    builder.param = new api.Param(builder);
    api.param = builder.param.expose();
}

Builder.prototype.mixin = function (obj) {
    var api = this.api;
    Object.keys(obj).forEach(function (k) {
        api[k] = obj[k];
    });

    return this;
}

Builder.prototype.tap = function (func) {
    func(this);

    return this;
}


Object.defineProperty(Builder.prototype, 'endDefine', {
    enumerable: false,
    configurable: false,
    get: function() {
        this.api.define = null;
        return this.api;
    }
});

module.exports = Builder;