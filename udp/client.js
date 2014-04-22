var Promise = require('bluebird');
var dgram = require('dgram');


module.exports = function(remote, param) {
    var client = dgram.createSocket('udp4');
    var send = Promise.promisify(client.send.bind(client));
    var token = Math.random().toString(36).slice(2, 8);

    var buf = new Buffer(JSON.stringify({
        _: remote.cmd,
        $: param,
        r: token
    }));

    return new Promise(function(resolve, reject) {
        client.on("message", function(response) {
            response = response.toString();
            var obj = JSON.parse(response);
            if (obj._ !== 0) {
                reject({
                    name: 'RemoteError',
                    message: 'remote server respond an error',
                    code: obj._,
                    detail: obj.$,
                    response: response
                });
            }

            if(obj.r !== token) {
                reject({
                    name: 'RemoteTokenError',
                    message: 'error token in respond',
                    expect: token,
                    remote: obj.r,
                    response: response
                });
            }

            resolve(obj.$);
        });

        client.on("error", function(e) {
           reject({
               name: 'UdpError',
               message: e.message,
               err: e
           });
        });

        send(buf, 0, buf.length, remote.port, remote.host).done();
    });
};
