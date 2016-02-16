[中文版](README_zh-CN.md)

# Introduction

Pangolin, as it's name, is a simple reverse proxy that creates a secure tunnel from a public endpoint to a locally running web app. 

HTTP/1.1 requests are transmitted to local by HTTP/2 proxy.

## Principle 

**Web browser** <-------HTTP/1.1-------> **Public endpoint** <-------HTTP/2-------> **Local server** <-------HTTP/1.1-------> **Local web app**

We can see that the public or other network's browsers can not  access the local network application directly. I open a TCP Server by running in the public network, let the network client to connected by socket, and then based on the connection in the network was created, a HTTP/2 Server can be used to forward each http requests.

I created both HTTP/2 server and client based on [node-http2](https://github.com/molnarg/node-http2) while I make a little change to make it use a specified socket instance to create server and send requests.

I use h2c (HTTP2 cleartext), so the transmit data from public to local are sent in the clear, the data format is binary because of HTTP/2. It is also quite easy to add TSL, but I didn't do it for a convenient testing.

## Instructions

Install pangolin on both server and local side.

```bash
sudo npm install -g pangolin --verbose
```

### Command line

* Server

```bash
pangolin server -p 10000  #Start to listen，TCP port 10000
```

* Local

```bash
pangolin client -r <public ip/domain>:<port> -l <port>
or
pangolin client -r <public ip/domain>:<port> -l <local ip/domain>:<port>
```

### Node.js API

* Server

```js
var pangolin = require('pangolin');
pangolin.createServer({
  port: 10000,        //TCP port
  httpConnects: 9     //Max http connections
});
```

* Local

```js
var pangolin = require('pangolin');
pangolin.connect({
  remoteHost : '127.0.0.1',  //Server IP address
  remotePort : 10000,        //Server TCP port
  localHost  : '127.0.0.1',  //Local web app IP address
  localPort  : 8360,         //Local web app port
  showAccessLog : false      //Display logs or not   
});
```


