var api = require('../lib/api');
var Promise = require('bluebird');

var Conversation = (function () {
    function Conversation(socket, msg, rinfo) {
        this._socket = socket;
        this._rinfo = rinfo;

        var request = this.request = this.parseMessage(msg);
        this.token = request.r;
        this.body = request.$;
        this.cmd = request._;
    }

    Conversation.prototype.parseMessage = function(msg) {
        return JSON.parse(msg.toString());
    };
    Conversation.prototype.packMessage = function(respond) {
        return new Buffer(JSON.stringify(respond));
    };

    Conversation.prototype.respond = function (obj) {
        obj.r = this.token;
        var buffer = this.packMessage(obj);
        return Promise.promisify(this._socket.send.bind(this._socket))(buffer, 0, buffer.length, this._rinfo.port, this._rinfo.address);
    };

    Conversation.prototype.success = function (result) {
        return this.respond({
            _: 0,
            $: result
        });
    };

    Conversation.prototype.error = function (error) {
        return this.respond({
            _: -(error.code || 1),
            $: error
        });
    };

    return Conversation;
})();


var UdpApi = (function(parent) {
    function UdpApi() {
        parent.apply(this, arguments);
    }
    UdpApi.prototype = Object.create(parent.prototype);
    UdpApi.prototype.Conversation = Conversation;

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
    UdpApi.prototype.mkConversation = function(socket, msg, rinfo) {
        return new this.Conversation(socket, msg, rinfo);
    };

    UdpApi.prototype.handle = function (socket, msg, rinfo, next) {
        var api = this;
        var conversation;
        try {
            conversation = api.mkConversation(socket, msg, rinfo);
        } catch(e) {
            return Promise.reject(e);
        }

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

module.exports.UdpApi = UdpApi;
module.exports.Conversation = Conversation;
