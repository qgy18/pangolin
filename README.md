# 说明

pangolin，中文意思是「穿山甲]。

这是我为了验证一个想法，用几十行 Node.js 代码实现的一个公网到内网的 HTTP/1.1 代理。这是用来测试的实验品，**并不推荐实际使用**。如果有类似需求，可以使用 [ngrok](https://github.com/inconshreveable/ngrok/) 这个项目，我之前写的介绍：[搭建 ngrok 服务实现内网穿透](https://imququ.com/post/self-hosted-ngrokd.html)。

## 简单原理

**公网浏览器** -------HTTP/1.1-------> **公网客户端**-------HTTP/2-------> **内网客户端** -------HTTP/1.1-------> **内网 WEB 应用**

可以看到，公网上的浏览器没办法直接访问内网 WEB 应用。我通过运行在公网上的客户端开启一个 TCP Server，让内网客户端去连，再基于这条 socket 连接，在内网创建了一个 HTTP Server 用来转发请求。

HTTP/2 的 Server 和 Client 直接用的 [node-http2](https://github.com/molnarg/node-http2) 模块。但我做了一些修改，使之可以基于已有 socket 创建 HTTP Server 和发送 HTTP Request。

我用了 node-http2 的 h2c（HTTP2 cleartext），所以公网客户端和内网客户端之间的传输是明文，当然由于是 HTTP/2，流量是以二进制 frame 传输的。要加上 TLS 也简单，但现在这样测试更方便。

## 测试说明

首先从 git 获取所有代码，服务端和本地都需要放一份；然后根据实际情况修改配置；最后分别在服务端运行 `server.js`，客户端运行 `client.js`，通过浏览器访问公网地址，即可转发到本地。

配置说明：

### 服务端（server.js）

```js
var TCP_PORT  = 10001; 			//TCP Server 端口
var HTTP_PORT = 10000; 			//HTTP Server 端口，浏览器访问时用这个端口
```

### 客户端（client.js）

```js
var REMOTE_HOST = '127.0.0.1'; 	//Server 端 IP
var REMOTE_PORT = 10001; 		//Server 端 TCP Server 端口，即上面的 TCP_PORT

var LOCAL_HOST = '127.0.0.1'; 	//本地 WEB 应用所在 IP，一般不需要修改
var LOCAL_PORT = 9999; 			//本地 WEB 应用所在端口

var SHOW_ACCESS_LOG = true; 	//是否显示请求日志
```


