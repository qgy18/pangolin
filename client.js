/*** config start ***/
var REMOTE_HOST = '127.0.0.1';  //Server 端 IP
var REMOTE_PORT = 10001;        //Server 端 TCP Server 端口，即上面的 TCP_PORT

var LOCAL_HOST  = '127.0.0.1';  //本地 WEB 应用所在 IP，一般不需要修改
var LOCAL_PORT  = 9999;         //本地 WEB 应用所在端口

var SHOW_ACCESS_LOG = true;     //是否显示请求日志
/*** config end ***/

var net = require('net');
var http = require('http');
var url = require('url');
var http2 = require('./node-http2');
var removeDeprecatedHeaders = require('./header').removeDeprecatedHeaders;
var format = require('util').format;

var client = new net.Socket();
client.setKeepAlive(true);

client.connect(REMOTE_PORT, REMOTE_HOST, function() {
  console.log('Connected to remote server...');

  var options = {
    plain : true,
    createServer : function(start) {
      start(client);
      return client;
    }
  };

  http2.raw.createServer(options, function(req, res) {
    var u = url.parse(req.url);

    req.headers.host = req.headers._host;
    delete req.headers._host;

    var options = {
      hostname : LOCAL_HOST, 
      port     : LOCAL_PORT,
      path     : u.path,       
      method   : req.method,
      headers  : req.headers
    };

    if(SHOW_ACCESS_LOG) {
      var d = new Date;
      var ua = req.headers['user-agent'];
      var time = [d.getHours(), d.getMinutes(), d.getSeconds()].join(':');
      var realIp = req.headers['x-real-ip'];

      console.log(format('[%s] "%s %s" %s - %s', time, req.method, u.path, ua, realIp));
    }
    
    var pReq = http.request(options, function(pRes) {
      var headers = removeDeprecatedHeaders(pRes.headers);
      res.writeHead(pRes.statusCode, headers);
      pRes.pipe(res);
    }).on('error', function(e) {
      res.writeHead(200);
      res.write('Can not reach the local service!');
      res.end();
      return;
    });

    req.pipe(pReq);
  });
});

client.on('error', function(e) {
  console.log('Can not connect remote server! ' + e.errno);
});

client.on('close', function() {
  console.log('Remote server shutdown!');
  process.exit(0);
});