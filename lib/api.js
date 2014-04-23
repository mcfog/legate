/**
 * Created by McFog on 2014/4/15.
 */
/**
 * Created by McFog on 2014/4/14.
 *
 * Api Builder
 */
var Promise = require('bluebird');
var Builder = require('./builder.js');
var Param = require('./param.js');

var Api = (function () {
    function Api() {
        this.define = new this.Builder(this, this.property);
        this.config = {};
    }

    Api.prototype.property = {
        name: 'unnamed api',
        desc: 'no description',
        uri: '/',
        method: 'all',
        logic: function() {
            throw new Error("not implemented");
        },
        error: function(response, error) {
            response.json(error.statusCode || 500, {
                err: error,
                status: response.statusCode
            });
        },
        output: function (response, result) {
            response.json({result: result});
        }
    };

    Api.prototype.Builder = Builder;
    Api.prototype.Param = Param;

    Api.prototype.mount = function (app) {
        var uri = this.property.uri;
        app[this.property.method](uri, this.handleRequest.bind(this));
    };

    Api.prototype.SkipLogic = function() {};

    Api.prototype.handleRequest = function (req, res, next) {
        var api = this;

        Promise.cast(api.param.parse(req))
            .then(function (param) {
                return api.property.logic.call(api, param);
            })
            .then(function(result) {
                return api.property.output.call(api, res, result);
            })
            .catch(function(e) {
                return e instanceof api.SkipLogic;
            }, function() {
                return next();
            })
            .catch(function (e) {
                return api.property.error.call(api, res, e);
            })
            .done();
    };

    return Api;
})();

module.exports = Api;