// ---FRAMES
var $ = (e)=> document.getElementById(e);
var $c = (e)=> document.createElement(e);

function req() {

  var x = new XMLHttpRequest();
  x.open("get", arguments[0]);
  x.responseType = "text";
  x.send();
  x.onload = ()=> arguments[1](x.response);

}


// ---ws SERVER
var user = "";

const SERVER = "ws://localhost:500";
var ws = new WebSocket(SERVER);
var wsend = (o)=> ws.send(JSON.stringify(o));

function wsMes(e) {

  var d = JSON.parse(e.data);
  if(!d) return 0;
  if(d.login) return loginData(d.login);
  if(d.message) return messageData(d.message);
  if(d.online) return $("message-online").querySelector("i").textContent = d.online;

}
ws.onmessage = wsMes;

ws.onerror = function wsErr() {

  tip("无法连接至服务器", true);

  function reconn(t) {

    ws = new WebSocket(SERVER);
    ws.onopen = ()=> {

      loginEnter();
      tip("服务器重新连接成功");
      ws.onerror = wsErr;
      ws.onmessage = wsMes

    };

    if(t>0) ws.onerror = ()=> setTimeout(()=> {

      tip("尝试重连 "+t, true);
      reconn(--t);

    }, 2000);
    else tip("服务器崩了吧这", true);

  }
  reconn(3);

};


// ---background
document.addEventListener("mousemove", (e)=> {

  var dw = document.documentElement.clientWidth/2;
  var dh = document.documentElement.clientHeight/2;

  $("bg").style.cssText = `filter: blur(${4*Math.max(
    Math.abs(e.clientX - dw) / dw,
    Math.abs(e.clientY - dh) / dh
  )}px); transform: translate(${60*(dw - e.clientX)/dw}px, ${60*(dh - e.clientY)/dh}px) scale(1.2)`;

});


// ---tip
function tip(m, w) {

  var s = $c("span");
  $("tip").append(s);
  s.textContent = m;

  if(w) s.className = "warn";

  setTimeout(()=> s.remove() ,5000);

}


// ---login
function loginEnter() {
  
  var v = $("login-name").value;
  if(!v) return 0;
  wsend({
    login: v
  });
  
}
$("login-name").onkeydown = (e)=> {

  if(e.code==="Enter") loginEnter();

};
$("login-enter").onclick = loginEnter;
function loginData(d) {

  if(typeof d==="object"&&d.err) return tip(d.err, true);
  user = d;
  tip("欢迎回来 "+d);
  $("login").style.display = "none";

}


// ---message
function messageSend() {

  var v = $("message-input").value;
  if(!v) return 0;
  wsend({
    message: v
  });
  $("message-input").value = "";

}
$("message-input").onkeydown = (e)=> {

  if(e.code==="Enter") messageSend();

};
$("message-submit").onclick = messageSend;

var messageFile = $c("input");
messageFile.type = "file";
messageFile.accept = "image/*";
messageFile.onchange = ()=> {

  var f = messageFile.files[0];
  if(!f) return tip("不要捉弄可爱的按钮");
  
  if(f.size>5242880) return tip("图片不要超5mb", true);

  var r = new FileReader();
  r.onload = ()=> wsend({
    message: r.result
  });
  r.readAsDataURL(f);

  messageFile.files[0] = undefined;

};
$("message-photo").onclick = ()=> messageFile.click();

function messageData(d) {

  var ml = $("message-list");
  var st = (ml.scrollHeight - ml.clientHeight - ml.scrollTop) < 100;

  function sc() {
    if(st) ml.scrollTop = ml.scrollHeight - ml.clientHeight;
  }

  var div = $c("div");
  if(d.n===user) div.className = "self";
  ml.append(div);
  var q = $c("q");
  div.append(q);
  q.textContent = d.n;
  if(d.d.startsWith("data:image/")) {

    const i = $c("img");
    div.append(i);
    i.src = d.d;
    i.onload = sc;

  }else {
    
    const p = $c("p");
    div.append(p);
    p.textContent = d.d;
    sc();

  }

}

