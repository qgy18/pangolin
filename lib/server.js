'use strict';

var mixin = require('node-mixin');

var net = require('net');
var http = require('http');
var url = require('url');
var http2 = require('./node-http2');
var removeDeprecatedHeaders = require('./header').removeDeprecatedHeaders;

var httpServers = {};

function createHTTPServer(remoteSock, httpServerID, port) {
  
  //Use httpServers[port] to cache httpServer
  //We must do this, because HTTP 1.1 might keep-alive
  //When keep-alive, it reuses http connections with a single port after TCP socket reconnected.

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
  var timeout = options.timeout * 1000;

  if(count <= 0){
    count = 1;
  }

  var ports = [];
  for(var i = 0; i < count; i++){
    ports.push(tcpPort + i + 1);
  }

  var server = net.createServer(function(sock) {
    var port = ports.shift();
    if(!port){
      var err = 'Cannot start http server, not valid ports.';
      console.error(err);
      sock.write('error!' + err);
      sock.end();
      return;
    }

    sock.setTimeout(timeout, function(){
      var err = 'Connection timeout.';
      console.error(err);
      sock.write('error!' + err);
      sock.end();
    });

    sock.on('data', function(data){
      data = data.toString('utf-8');

      if(data && data === 'port?'){
        sock.write('port:' + port); 
      }else if(data && data === 'start server'){
        httpServers[port] = createHTTPServer(sock, httpServerID++, port);
        httpServers[port].on('close', function(){
          console.log('HTTP connection closed.');
          if(ports.indexOf(port) < 0){
            ports.unshift(port);
          }
          delete httpServers[port];
        });

        sock.on('close', function() {
          ports.unshift(port);

          httpServers[port] && httpServers[port].close();

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
    console.error('Can not start server! ' + e.errno);
  });
}

module.exports = createTCPServer;