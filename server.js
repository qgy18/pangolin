/*** config start ***/
var TCP_PORT  = 10001;          //TCP Server 端口
var HTTP_PORT = 10000;          //HTTP Server 端口，浏览器访问时用这个端口
/*** config end ***/

var net = require('net');
var http = require('http');
var url = require('url');
var http2 = require('./node-http2');
var removeDeprecatedHeaders = require('./header').removeDeprecatedHeaders;

function createHTTPServer(remoteSock, httpServerID) {
  var server = http.createServer(function(req, res) {
    var u = url.parse(req.url);
    var headers = removeDeprecatedHeaders(req.headers);

    headers['x-real-ip'] = req.connection.remoteAddress;

    var pReq = http2.raw.request({
      id      : httpServerID,
      plain   : true,
      socket  : remoteSock,
      port    : u.port || 80,
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

  server.listen(HTTP_PORT, '0.0.0.0', function() {
    console.log('HTTPServer is running at port', HTTP_PORT, '...');
  });

  return server;
}

function createTCPServer() {
  var httpServerID = 0;

  var server = net.createServer(function(sock) {
    var httpServer = createHTTPServer(sock, httpServerID++);

    sock.on('close', function() {
      httpServer.close();
      console.log('Client disconnected!');
    });

    console.log('Client connected...');
  });

  server.listen(TCP_PORT, '0.0.0.0', function() {
    console.log('TCPServer is running at port', TCP_PORT, '...');
  });
}

createTCPServer();