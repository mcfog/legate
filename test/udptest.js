var legate = require('../udp');
var dgram = require('dgram');

describe('udp', function() {

    var remote = {
        host: 'localhost',
        port: 23123,
        cmd: 'test'
    };
    var test = require('../udp/client').bind(null, remote);

    var remote2 = {
        host: 'localhost',
        port: 23123,
        cmd: 'test2'
    };
    var test2 = require('../udp/client').bind(null, remote2);
    var socket;


    beforeEach(function() {
        socket = dgram.createSocket('udp4');
        var legateServer = require('../udp/server')(socket);

        legate().define
            .name('测试接口')
            .desc('演示API用的测试接口')
            .cmd('test')
            .param
                .int('num', '一个数字', [3, 100])
                .string('str', '字符串', [2, 5])
                .regex('reg', '有追求的字符串', /a.+b/)
            .endParam
            .logic(function(param) {
                return {
                    result: 'from remote',
                    param: param
                };
            })
        .endDefine
        .mount(legateServer);

        legate().define
            .name('测试接口')
            .desc('演示API用的测试接口')
            .cmd('test2')
            .param
                .int('num', '一个数字', [50, 200])
                .string('str', '字符串', [2, 5])
                .regex('reg', '有追求的字符串', /a.+b/)
            .endParam
            .logic(function(param) {
                return {
                    result: 'from remote2',
                    param: param
                };
            })
        .endDefine
        .mount(legateServer);

        socket.bind(23123);
    });

    afterEach(function() {
        socket.close();
    });

    it('works', function(done) {
        test({
            num: 3,
            str: 'asd',
            reg: 'axxxb'
        })
            .then(function(r) {
                console.log(r);

                return test2({
                    num: 180,
                    str: 'asd',
                    reg: 'azzzb'                    
                });
            })
            .then(function(r) {
                console.log(r);

                done();
            })
            .done();
    });

    
});
