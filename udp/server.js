var Promise = require('bluebird');
var events = require('events');

var Server = (function() {
    function Server(socket) {
        var svr = this;
        svr.socket = socket;
        svr.apis = [];

        socket.on("message", function (msg, rinfo) {
            Promise
                .try(function() {
                    function recurse(idx) {
                        if(!svr.apis[idx]) {
                            return Promise.reject({
                                name: "UnhandledRequestError",
                                message: "unhandled request"
                            });
                        }

                        return svr.apis[idx].handle(socket, msg, rinfo, function() {
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
    Server.prototype = Object.create(events.EventEmitter.prototype);

    return Server;
})();


module.exports = function(socket) {
    return new Server(socket);
};

module.exports.Server = Server;
