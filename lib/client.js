/*** config start ***/
//var REMOTE_HOST = '123.59.74.81';  //Server 端 IP
/*** config end ***/

var mixin = require('node-mixin');

var net = require('net');
var http = require('http');
var url = require('url');
var http2 = require('./node-http2');
var removeDeprecatedHeaders = require('./header').removeDeprecatedHeaders;
var format = require('util').format;

var formatDate = function(e) {function t(e){return("0"+e).slice(-2)}var n=e.getFullYear()+"-"+t(e.getMonth()+1)+"-"+t(e.getDate()),r=t(e.getHours())+":"+t(e.getMinutes())+":"+t(e.getSeconds());return n+" "+r};

function connect(options){
  var options = mixin(options, {
    remoteHost : '127.0.0.1',  //Server IP address
    remotePort : 10000,        //Server TCP port
    localHost  : '127.0.0.1',  //Local web app IP address
    localPort  : 8360,         //Local web app port
    showAccessLog : true       //Display logs or not   
  });

  var client = new net.Socket();
  client.setKeepAlive(true);

  client.connect(options.remotePort, options.remoteHost, function() {
    //console.log('Connected to remote server...');

    var serverOpts = {
      plain : true,
      createServer : function(start) {
        start(client);
        return client;
      }
    };

    client.write('port?', 'utf-8');

    client.on('data', function(data){
      data = data.toString('utf-8');

      if(/^port:/.test(data)){
        console.log('Connected to ' + options.remoteHost, data.slice(5));
        console.log('Proxy pass to', options.localHost, options.localPort);
        //client.removeAllListeners('data');
        client.write('start server', 'utf-8');
        http2.raw.createServer(serverOpts, function(req, res) {
          var u = url.parse(req.url);

          req.headers.host = req.headers._host;
          delete req.headers._host;

          var httpOpts = {
            hostname : options.localHost, 
            port     : options.localPort,
            path     : u.path,       
            method   : req.method,
            headers  : req.headers
          };

          if(options.showAccessLog) {
            var d = new Date;
            var ua = req.headers['user-agent'];
            var realIp = req.headers['x-real-ip'];

            console.log(format('[%s] - %s "%s %s" %s', formatDate(d), realIp, req.method, u.path, ua));
          }
          
          var pReq = http.request(httpOpts, function(pRes) {
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
      }else if(/^error!/.test(data)){
        console.error(data.slice(6));
      }
    });
  });

  client.on('error', function(e) {
    console.error('Can not connect remote server! ' + e.errno);
  });

  client.on('close', function(e) {
    console.log('Remote server shutdown!');
    process.exit(0);
  });
}

module.exports = connect;