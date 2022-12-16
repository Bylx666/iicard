/**
 * fill zeros
 * 补全零头
 * @param {String} sr 源字符串
 * @param {Number} le 总长度
 * @returns {String}
 */
function fill0(sr, le) {

  if(sr.length>=le) return sr;
  else return fill0("0"+sr, le);

};

/**
 * 参数写个req，header就能填好
 * @param { http.IncomingMessage } req 请求
 * @returns 完整的头信息，省去记忆麻烦
 */
function fillHeader(req) {

  return [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    "Access-Control-Allow-Origin: *",
    "Sec-WebSocket-Accept: "+require("crypto").createHash("sha1").update(req.headers['sec-websocket-key']+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64")
  ].join("\n")+"\n\n";

}

/**
 * Create a text Frame for ws
 * 创建websocket帧
 * @param { String | ArrayBuffer } m - content of frame 文本帧内容
 * @param {String} o - opcode with hex string 指定16进制字符串的操作码
 * - 0x0   means a fragment          表示一个延续帧
 * - 0x1   means a TEXT frame        表示这是一个文本帧
 * - 0x2   a BINARY frame            表示这是一个二进制帧（frame）
 * - 0x3-7 reserved code             保留的操作代码
 * - 0x8   means disconnecting       表示连接断开
 * - 0x9   means a `ping` operation  表示这是一个ping操作
 * - 0xA   means a `pong` operation  表示这是一个pong操作
 * - 0xB-F reserved code             保留的操作代码
 * @returns {Buffer} binary frame buffer 二进制帧
 */
function createFrame(m, o) {
  
  var l = Buffer.byteLength(m);

  var b = null;
  if(l>65535) {

    b = Buffer.alloc(10+l);
    b[1] = 127;
    b.writeUInt32BE(l ,6);
    b.write(m, 10);

  }else if(l>125) {

    b = Buffer.alloc(4+l);
    b[1] = 126;
    b.writeUInt16BE(l, 2);
    b.write(m, 4);

  }else {

    b = Buffer.alloc(2+l);
    b.writeUInt8(l, 1);
    b.write(m, 2);

  }

  b[0] = 129;
  if(o) {

    const dn = parseInt(o, 16);
    if(dn&&dn<15) b[0] = parseInt("1000"+fill0(dn.toString(2), 4), 2);

  };

  return b;

}

/**
 * Parse frame from client
 * 解析客户端发送来的帧
 * @param {Buffer} source client buffer Source
 */
function parseFrameMeta(source) {

  var s = Buffer.from(source);
  var m = fill0(s.readUint16BE(0).toString(2), 16);

  var l7 = parseInt(m.slice(9, 16), 2);
  var l = 0;
  var n = parseInt(m[8]);
  var o = n?4:0;
  var ol = 0;
  var k = null;
  if(l7===127) {

    l = s.readUInt32BE(6);
    ol = 10;

  }else if(l7===126) {

    l = s.readUInt16BE(2);
    ol = 4;

  }else {

    l = l7;
    ol = 2;

  }

  k = n?s.subarray(ol, ol+o):null;

  var r = {
    fin: parseInt(m[0]),
    rsv1: parseInt(m[1]),
    rsv2: parseInt(m[2]),
    rsv3: parseInt(m[3]),
    opcode: parseInt(m.slice(4, 8), 2).toString(16).toUpperCase(),
    mask: n,
    maskKey: k,
    len7: l7,
    len: l,
    lenM: ol+o
  };

  return r;

}

/**
 * ws inverse mask
 * 反掩码
 * @param {String} data 源数据
 * @param {Buffer|Array} key 4位数掩码键
 * @returns {String}
 */
function imask(data, key) {

  var d = Buffer.from(data);
  for(let i = 0; i < d.length; ++i) d[i] = d[i] ^ key[i % 4];
  return d.toString("utf-8");

}

var frameFormat = `
0                   1                   2                   3
0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
`;

module.exports = { fillHeader, createFrame, frameFormat, parseFrameMeta, fill0, imask };
