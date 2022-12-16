const http = require("http");
const { fillHeader, createFrame, parseFrameMeta, imask } = require("./ws");

const clients = [];
function bc(c) {

  const f = createFrame(JSON.stringify(c));
  for(let cli of clients) cli.write(f);

}

var hs = http.createServer((req, res)=> {

  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*"
  });
  res.end("WebSocket Now Running...");

});
hs.listen(500);

hs.on("upgrade", (req, soc)=> {

  var wsend = (o)=> soc.write(createFrame(JSON.stringify(o)));
  soc.write(fillHeader(req));
  soc.n = null;
  clients.push(soc);
  bc({
    online: clients.length
  });
  soc.write(createFrame("", "9"));

  var da = Buffer.allocUnsafe(0);
  var td = "";
  var rdaList = [];
  function rda(l, c) {

    function _rda() {

      var d = da.subarray(0, l);
      da = da.subarray(l);
      if(typeof c==="function") c(d);

    }
    rdaList.push({
      l: l,
      f: _rda
    });

  }
  var frameEnd = true;
  function nextFrame() {

    frameEnd = false;
    var m = parseFrameMeta(da);
    rda(m.lenM, (v)=> {
      
      if(!m.fin) rda(m.len, (d)=> {

        td += imask(d, m.maskKey);
        frameEnd = true;
        
      });
      else {
  
        rda(m.len, (d)=> {

          if(m.opcode==="8") return;
          td += imask(d, m.maskKey);
          var completeData = String(td);
    
          td = "";
          frameEnd = true;

          try {
    
            var d = JSON.parse(completeData);
            if(d.login) return login(d.login);
            if(!soc.n) return;
    
            if(d.message) return message(d.message);
            
          }catch {return};

        });
        
      }

    });

  }
  soc.on("data", (c)=> {

    da = Buffer.concat([da, c]);
    if(frameEnd) {
      
      nextFrame();
      fd = true;

    }
    for(let i = 0; i < rdaList.length; ++i) {
      
      if(da.length >= rdaList[i].l) {

        rdaList[i].f();
        rdaList.splice(i, 1);
        --i;

      }else break;

    }

  });

  soc.on("end", ()=> {

    clients.splice(clients.indexOf(soc), 1);
    bc({
      online: clients.length
    });

  });

  soc.on("error", ()=> soc.destroy());


  // --- actual doing between clients
  function login(da) {
    
    if(typeof da!=="string") return;
    if(clients.find((v)=> v.n===da )) wsend({
      login: { err: "服务器里有同名的人在线喽" }
    });
    else {

      soc.n = da;
      wsend({
        login: da
      });

    }

  }

  function message(da) {

    if(typeof da!=="string") return;
    bc({
      message: {
        d: da,
        n: soc.n
      }
    });

  }
  
});
