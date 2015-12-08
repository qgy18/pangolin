# 说明

pangolin，中文意思是「穿山甲]，名字来自于同事的类似项目，在此表示感谢！

这是我为了验证一个想法，用几十行 Node.js 代码实现的一个公网到内网的 HTTP/1.1 代理，pangolin 服务端与客户端之间基于 HTTP/2 协议传输。

更多介绍：[基于 HTTP/2 的 WEB 内网穿透实现](https://imququ.com/post/tunnel-to-localhost-base-on-http2.html)。

## 简单原理

**浏览器** <-------HTTP/1.1-------> **公网客户端** <-------HTTP/2-------> **内网客户端** <-------HTTP/1.1-------> **内网 WEB 应用**

可以看到，公网或其它内网中的浏览器没办法直接访问内网 WEB 应用。我通过运行在公网上的服务端开启一个 TCP Server，让内网客户端去连，再基于这条 socket 连接，在内网创建了一个 HTTP/2 Server 用来转发请求。

HTTP/2 的 Server 和 Client 直接用的 [node-http2](https://github.com/molnarg/node-http2) 模块。但我做了一些修改，使之可以基于已有 socket 创建 HTTP Server 和发送 HTTP Request。

我用了 node-http2 的 h2c（HTTP2 cleartext），所以公网服务端和内网客户端之间的传输是明文，当然由于是 HTTP/2，流量是以二进制 frame 传输的。要加上 TLS 也简单，但现在这样测试更方便。

## 使用说明

首先在本地和服务器同时安装 pangolin

```bash
sudo npm install -g pangolin --verbose
```

### 命令行

* 服务器

```bash
pangolin server -p 10000  #启动服务，TCP端口为10000
```

* 本地

```bash
pangolin cline -r 远程http服务器IP地址:端口号 -l 本地http端口号
```

### Node.js API

```js
var pangolin = require('pangolin');
pangolin.connect({
  remoteHost : '127.0.0.1',  //Server 端 IP
  remotePort : 10000,        //Server 端 TCP Server 端口，即上面的 TCP_PORT
  localHost  : '127.0.0.1',  //本地 WEB 应用所在 IP，一般不需要修改
  localPort  : 8360,         //本地 WEB 应用所在端口
  showAccessLog : false     //是否显示请求日志   
});
```


