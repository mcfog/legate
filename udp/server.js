var Promise = require('bluebird');
var util = require('util');
var events = require('events');

var Conversation = (function () {
    function Conversation(socket, request, rinfo) {
        this._socket = socket;
        this._rinfo = rinfo;
        this.body = request.$;
        this.cmd = request._;
    }

    Conversation.prototype.respond = function (obj) {
        var buffer = new Buffer(JSON.stringify(obj));
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


var Server = (function() {
    function Server(socket) {
        var svr = this;
        svr.socket = socket;
        svr.apis = [];

        socket.on("message", function (msg, rinfo) {
            Promise.cast(svr.parseMessage(msg, rinfo))
                .then(function(conversation) {
                    function recurse(idx) {
                        if(!svr.apis[idx]) {
                            return Promise.reject({
                                name: "UnhandledRequestError",
                                message: "unhandled request"
                            });
                        }

                        return svr.apis[idx].handle(conversation, function() {
                            return recurse(idx + 1);
                        });
                    }

                    return recurse(0);
                })
                .catch(function(e) {
                    svr.emit('error', e);
                })
                .done()
            ;
        });
    }
    util.inherits(Server, events.EventEmitter);

    Server.prototype.Conversation = Conversation;
    Server.prototype.parseMessage = function (msg, rinfo) {
        var request = JSON.parse(msg.toString());
        return new this.Conversation(this.socket, request, rinfo);
    };

    return Server;
})();


module.exports = function(socket) {
    return new Server(socket);
};