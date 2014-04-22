var api = require('../lib/api');
var util = require('util');
var Promise = require('bluebird');

var UdpApi = (function(parent) {
    function UdpApi() {
        parent.apply(this, arguments);
    }
    util.inherits(UdpApi, parent);

    UdpApi.prototype.property = {
        name: 'unnamed api',
        desc: 'no description',
        cmd: '',
        logic: function () {
            throw new Error("not implemented");
        },
        error: function (conversation, error) {
            return conversation.error(error);
        },
        output: function (conversation, result) {
            return conversation.success(result);
        }
    };
    UdpApi.prototype.mount = function (server) {
        server.apis.push(this);

        return this;
    };
    UdpApi.prototype.handle = function (conversation, next) {
        var api = this;

        if(conversation.cmd !== api.property.cmd) {
            return next();
        }

        return Promise.cast(api.param.parse(conversation))
            .then(function(param) {
                return api.property.logic.call(api, param);
            })
            .then(function (result) {
                return api.property.output.call(api, conversation, result);
            })
            .catch(function (e) {
                return e instanceof api.SkipLogic;
            }, function () {
                return next();
            })
            .catch(function (e) {
                return api.property.error.call(api, conversation, e);
            })
        ;
    };

    return UdpApi;
})(api);


module.exports = function() {
    return new UdpApi();
};