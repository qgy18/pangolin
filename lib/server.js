'use strict';

var mixin = require('node-mixin');

var net = require('net');
var http = require('http');
var url = require('url');
var http2 = require('./node-http2');
var removeDeprecatedHeaders = require('./header').removeDeprecatedHeaders;

var httpServers = {};

function createHTTPServer(remoteSock, httpServerID, port) {
  
  //用 httpServers[port] 缓存 httpServer
  //必须要这么做，因为HTTP 1.1有keep-alive
  //因此client断开连接后用同一端口重连，会导致依然使用同一个httpServe

  var server = httpServers[port] || http.createServer(function(req, res) {

    var u = url.parse(req.url);
    var headers = removeDeprecatedHeaders(req.headers);

    headers['x-real-ip'] = req.connection.remoteAddress;

    var pReq = http2.raw.request({
      id      : server._id,
      plain   : true,
      socket  : server.remoteSock,
      //port    : u.port || 443,
      path    : u.path,       
      method  : req.method,
      headers : headers
    }, function(pRes) {
      res.writeHead(pRes.statusCode, pRes.headers);
      pRes.pipe(res);
    });

    pReq.on('error', function(e) {
      res.writeHead(200);
      res.write('something was wrong.');
      res.end();
      return;
    });

    req.pipe(pReq);
  });

  server.remoteSock = remoteSock;
  server._id = httpServerID;

  server.listen(port, '0.0.0.0', function() {
    console.log('HTTPServer is running at port', port, '...');
  });

  return server;
}

function createTCPServer(options) {
  var httpServerID = 0;
  options = mixin(options,{port: 10000, httpConnects: 99});

  var tcpPort = options.port;
  var count = options.httpConnects;

  if(count <= 0){
    count = 1;
  }

  var ports = [];
  for(var i = 0; i < count; i++){
    ports.push(tcpPort + i + 1);
  }

  var server = net.createServer(function(sock) {
    var port = ports.shift();

    sock.on('data', function(data){
      data = data.toString('utf-8');

      if(data && data === 'port?'){
        sock.write('port:' + port); 
      }else if(data && data === 'start server'){
        httpServers[port] = createHTTPServer(sock, httpServerID++, port);
        
        sock.on('close', function() {
          
          httpServers[port] && httpServers[port].close(function(){
            console.log('HTTP connection closed.');
            delete httpServers[port];
          });

          ports.unshift(port);
          console.log('Client disconnected!');
        });
        console.log('Client connected...');
      }
    });
  });

  server.listen(tcpPort, '0.0.0.0', function() {
    console.log('TCPServer is running at port', tcpPort, 
      ', accept', count, 'http clients');
  });

  server.on('error', function(e) {
    console.log('Can not start server! ' + e.errno);
  });
}

module.exports = createTCPServer;