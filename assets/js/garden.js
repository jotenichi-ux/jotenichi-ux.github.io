/* ==========================================================================
   花园：点草地直接种花，点花看留言。
   ----------------------------------------------------------------------
   存在哪：garden-config.js 里填了 Supabase 的地址和 anon key，就存到网上，
          所有人都看得到；没填就退回到只存在本机浏览器（localStorage）。
   画花的那几个函数是从 site.js 原样搬过来的，没改。
   ========================================================================== */
(function garden() {
  var meadow = document.getElementById("meadow");
  if (!meadow) return;

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LOCAL_KEY = "beata.garden.v1";      /* 本机模式存花的地方（沿用旧 key，以前种的花还在） */
  var MINE_KEY = "beata.garden.mine";     /* 记住哪几朵是这个浏览器种的 */
  var LAST_KEY = "beata.garden.last";     /* 上一次种花的时间，30 秒内不能再种 */
  var COOL_MS = 30 * 1000;
  var MAX_SHOW = 80;

  /* 花的种类：每一种都单独画，形状不一样，才像真的花 */
  var TYPES = {
    sunflower: { name: "向日葵" },
    gardenia: { name: "栀子" },
    rose: { name: "玫瑰" },
    tulip: { name: "郁金香" },
    lavender: { name: "薰衣草" },
    hydrangea: { name: "绣球" },
    daisy: { name: "雏菊" },
    jasmine: { name: "夜来香" }
  };

  /* 旧版本存下来的花名，换一张脸继续开 */
  var ALIAS = { blue: "hydrangea", grass: "daisy", peach: "tulip" };

  /* 一圈花瓣 */
  function ring(cx, cy, n, rx, ry, dist, fill, opacity, offset, stroke) {
    var out = "";
    for (var i = 0; i < n; i++) {
      var a = (360 / n) * i + (offset || 0);
      var rad = (a * Math.PI) / 180;
      var px = cx + Math.cos(rad) * dist;
      var py = cy + Math.sin(rad) * dist;
      out +=
        '<ellipse cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) +
        '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' +
        (opacity ? ' opacity="' + opacity + '"' : "") +
        (stroke ? ' stroke="' + stroke + '" stroke-width="0.9"' : "") +
        ' transform="rotate(' + (a + 90).toFixed(1) + " " + px.toFixed(1) + " " + py.toFixed(1) + ')"/>';
    }
    return out;
  }

  function stem(top, color) {
    return '<path d="M30 100 C30.6 84 29.4 66 30 ' + top + '" stroke="' + (color || "#7FB86A") +
      '" stroke-width="2.8" stroke-linecap="round" fill="none"/>';
  }

  /* 花头：每种花各自的样子 */
  function bloom(type) {
    switch (type) {
      case "sunflower":
        return (
          ring(30, 32, 14, 4.8, 10, 12, "#FFC93C") +
          ring(30, 32, 14, 3.8, 7, 7.6, "#FFD75E", 0.95, 12.8) +
          '<circle cx="30" cy="32" r="9.2" fill="#7A5230"/>' +
          '<circle cx="30" cy="32" r="6.4" fill="#9A6A3F"/>' +
          '<g fill="#5C3D22" opacity=".5">' +
          '<circle cx="27" cy="29" r="1.1"/><circle cx="32.6" cy="30" r="1.1"/>' +
          '<circle cx="29" cy="34.2" r="1.1"/><circle cx="33.2" cy="35.6" r="1"/>' +
          '<circle cx="25.8" cy="33" r="1"/><circle cx="30" cy="37.6" r="1"/>' +
          "</g>"
        );
      case "gardenia":
        return (
          ring(30, 32, 6, 6.6, 12, 6.2, "#FFFDF8", 1, 0, "#E8DBC4") +
          ring(30, 32, 6, 5.6, 9.4, 3.2, "#FFF8EA", 1, 30, "#EFE3CE") +
          ring(30, 32, 6, 3.4, 5.4, 1.4, "#FFFFFF", 1, 15, "#F1E7D4") +
          '<circle cx="30" cy="32" r="2.6" fill="#FFE9A8"/>' +
          '<circle cx="27.4" cy="30.6" r="1" fill="#FFC93C"/>' +
          '<circle cx="31.8" cy="30.2" r="1" fill="#FFC93C"/>' +
          '<circle cx="29.4" cy="33.4" r="1" fill="#FFC93C"/>'
        );
      case "rose":
        return (
          ring(30, 33, 5, 6.4, 8.8, 7.8, "#FF8F98", 1, -18, "#F26C7E") +
          ring(30, 33, 5, 4.8, 6.6, 4.2, "#FF7583", 1, 18, "#EA5C6E") +
          '<circle cx="30" cy="33" r="4.4" fill="#F05F71"/>' +
          '<path d="M30 29.8 C32.8 29.8 34.4 32 33.4 34.2 C32.4 36.4 29.2 36.6 27.8 35 C26.6 33.6 27.2 31.6 29 31.2" ' +
          'stroke="#D9495C" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
        );
      case "tulip":
        return (
          '<path d="M19 45 C17.4 34 21 23.6 30 20 C39 23.6 42.6 34 41 45 C35.6 48.6 24.4 48.6 19 45 Z" fill="#FF9F43"/>' +
          '<path d="M30 20 C25.4 28 25.4 39.4 30 46.4 C34.6 39.4 34.6 28 30 20 Z" fill="#EE8A32" opacity=".55"/>' +
          '<path d="M19 45 C21.6 39 21.8 30 20.4 24.4 C18.4 30 17.8 39 19 45 Z" fill="#FFC08A" opacity=".8"/>' +
          '<path d="M41 45 C38.4 39 38.2 30 39.6 24.4 C41.6 30 42.2 39 41 45 Z" fill="#FFC08A" opacity=".55"/>' +
          '<path d="M19 45 C25.6 47.8 34.4 47.8 41 45" stroke="#E8802F" stroke-width="1" fill="none" opacity=".5"/>'
        );
      case "lavender": {
        var s = "";
        for (var i = 0; i < 7; i++) {
          var y = 24 + i * 5.2;
          var w = 4.2 - i * 0.42;
          var h = 3.6 - i * 0.34;
          var dir = i % 2 ? 1 : -1;
          s += '<ellipse cx="' + (30 + dir * 3.4) + '" cy="' + y.toFixed(1) + '" rx="' + w.toFixed(1) + '" ry="' + h.toFixed(1) +
            '" fill="' + (i % 2 ? "#C6A8FF" : "#B492F5") + '" transform="rotate(' + (dir * 30) + " " + (30 + dir * 3.4) + " " + y.toFixed(1) + ')"/>';
          if (i < 5) {
            s += '<ellipse cx="' + (30 - dir * 2.4) + '" cy="' + (y + 2.4).toFixed(1) + '" rx="' + (w * 0.72).toFixed(1) +
              '" ry="' + (h * 0.72).toFixed(1) + '" fill="#C6A8FF" opacity=".8" transform="rotate(' + (-dir * 26) + " " + (30 - dir * 2.4) + " " + (y + 2.4).toFixed(1) + ')"/>';
          }
        }
        return s + '<ellipse cx="30" cy="18.6" rx="3" ry="4.8" fill="#D3BBFF"/>';
      }
      case "hydrangea": {
        var spots = [[30, 21], [19, 26], [41, 26], [14, 35], [46, 35], [22, 44], [38, 44], [30, 33]];
        var cols = ["#8EC9FF", "#A6D6FF", "#C6A8FF", "#9CCBFF"];
        var out = "";
        spots.forEach(function (p, idx) {
          var c = cols[idx % cols.length];
          out += ring(p[0], p[1], 4, 3.1, 3.6, 3.1, c, 0.95, idx % 2 ? 45 : 0);
          out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.5" fill="#FFFDF8" opacity=".8"/>';
        });
        return out;
      }
      case "jasmine":
        return (
          '<circle cx="30" cy="32" r="17" fill="#FFE9A8" opacity=".16"/>' +
          ring(30, 32, 5, 5, 12.6, 7, "#FFFDF8", 1, 0, "#E8DCFF") +
          '<circle cx="30" cy="32" r="3.6" fill="#FFE9A8"/>'
        );
      default:
        return (
          ring(30, 32, 12, 3.4, 11, 8.6, "#FFFFFF", 1, 0, "#F3E7D2") +
          '<circle cx="30" cy="32" r="6" fill="#FFC93C"/>' +
          '<circle cx="30" cy="32" r="3.4" fill="#F2B32C" opacity=".65"/>'
        );
    }
  }

  /* 叶子：不同花配不同的叶型 */
  function leaves(type) {
    switch (type) {
      case "sunflower":
      case "rose":
        return (
          '<path d="M30 78 C20 72 12 76 10 86 C20 90 28 86 30 78 Z" fill="#8FD08E"/>' +
          '<path d="M30 88 C40 82 48 86 50 96 C40 100 32 96 30 88 Z" fill="#9BE3A0"/>'
        );
      case "gardenia":
        return (
          '<path d="M30 74 C18 66 8 70 6 82 C18 88 28 82 30 74 Z" fill="#5E9B6B"/>' +
          '<path d="M30 84 C42 76 52 80 54 92 C42 98 32 92 30 84 Z" fill="#6FAA79"/>'
        );
      case "lavender":
        return (
          '<path d="M30 92 C24 86 20 78 19 70" stroke="#6FAE6C" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
          '<path d="M30 86 C36 81 40 74 41 66" stroke="#7FBF74" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
          '<path d="M30 96 C26 92 23 87 22 82" stroke="#7FBF74" stroke-width="2" fill="none" stroke-linecap="round"/>'
        );
      case "hydrangea":
        return (
          '<path d="M30 76 C19 70 10 74 8 84 C19 89 28 85 30 76 Z" fill="#7FBF74"/>' +
          '<path d="M30 86 C41 80 50 84 52 94 C41 99 31 95 30 86 Z" fill="#8FD08E"/>'
        );
      default:
        return (
          '<path d="M30 76 C21 71 13 75 11 84 C21 88 28 84 30 76 Z" fill="#9BE3A0"/>' +
          '<path d="M30 86 C39 81 47 85 49 94 C39 98 31 94 30 86 Z" fill="#8FD08E"/>'
        );
    }
  }

  function flowerSVG(type) {
    var k = ALIAS[type] || type;
    if (!TYPES[k]) k = "daisy";
    var top = k === "lavender" ? 30 : 46;
    return (
      '<svg viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      stem(top) +
      leaves(k) +
      bloom(k) +
      "</svg>"
    );
  }

  /* ---------- 小工具 ---------- */
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  var toastTimer;
  function toast(text) {
    var el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    requestAnimationFrame(function () { el.classList.add("is-on"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 2600);
  }

  /* 第一次来、而且还没接数据库时，草地上先有两朵花，是家里人留的 */
  var SEEDS = [
    { id: "seed1", type: "sunflower", x: 0.22, y: 0.78, msg: "喵。今天也在这儿晒太阳。", nick: "沫沫（留了个爪印）", d: "2026-09-30" },
    { id: "seed2", type: "gardenia", x: 0.76, y: 0.86, msg: "你说「先去看看再说」的样子，我一直记得。", nick: "Edward", d: "2026-10-12" }
  ];

  /* ==========================================================================
     存取：list() 拿到所有花，add() 种一朵。两种实现，接口一样。
     ========================================================================== */
  var cfg = window.GARDEN_SUPABASE || {};
  var online = !!(cfg.url && cfg.anonKey);

  /* 访客能读到的几列（owner_token 那一列访客读不到，所以每次都点名要这几列） */
  var COLS = "id,type,x,y,msg,nick,created_at";

  /* 种花时浏览器自己生成的一串随机暗号，以后靠它认出「这朵是我种的」 */
  function newToken() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (n) { return (n + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  var store = online ? (function () {
    /* 地址里多带了 /rest/v1/ 也没关系，先去掉再拼 */
    var api = cfg.url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "") + "/rest/v1";
    var base = api + "/flowers";
    var headers = {
      apikey: cfg.anonKey,
      "Content-Type": "application/json"
    };
    /* 旧式 anon key 是一串 JWT（eyJ 开头），要同时放进 Authorization；
       新式 sb_publishable_ key 只放 apikey，放进 Authorization 反而会被拒 */
    if (/^eyJ/.test(cfg.anonKey)) headers.Authorization = "Bearer " + cfg.anonKey;
    function fromRow(r) {
      return { id: String(r.id), type: r.type, x: Number(r.x), y: Number(r.y), msg: r.msg || "", nick: r.nick || "", d: String(r.created_at || "").slice(0, 10) };
    }
    function rpc(name, args) {
      return fetch(api + "/rpc/" + name, { method: "POST", headers: headers, body: JSON.stringify(args) })
        .then(function (res) {
          if (!res.ok) throw new Error(name + " " + res.status);
          return res.json();
        })
        .then(function (ok) { return ok === true; });
    }
    function post(body) {
      return fetch(base + "?select=" + COLS, {
        method: "POST",
        headers: Object.assign({ Prefer: "return=representation" }, headers),
        body: JSON.stringify(body)
      });
    }
    return {
      list: function () {
        return fetch(base + "?select=" + COLS + "&order=created_at.desc&limit=" + MAX_SHOW, { headers: headers })
          .then(function (res) {
            if (!res.ok) throw new Error("load " + res.status);
            return res.json();
          })
          .then(function (rows) { return rows.reverse().map(fromRow); });   /* 旧的先画，新的压在上面 */
      },
      /* 返回种好的花；带上暗号存的，saved.token 就是那串暗号 */
      add: function (f) {
        var body = { type: f.type, x: f.x, y: f.y, msg: f.msg, nick: f.nick, owner_token: f.token };
        return post(body)
          .then(function (res) {
            if (res.ok) return res;
            /* 数据库还没加 owner_token 那一列（删除那段 SQL 还没跑）：不带暗号再种一次 */
            delete body.owner_token;
            f.token = null;
            return post(body).then(function (r2) {
              if (!r2.ok) throw new Error("add " + r2.status);
              return r2;
            });
          })
          .then(function (res) { return res.json(); })
          .then(function (rows) {
            var saved = fromRow(rows[0]);
            saved.token = f.token;
            return saved;
          });
      },
      /* 拔花：主人用密码，访客用暗号；成功返回 true */
      remove: function (id, token, pass) {
        return pass
          ? rpc("remove_flower_as_owner", { fid: id, pass: pass })
          : rpc("remove_my_flower", { fid: id, token: token });
      },
      checkOwner: function (pass) {
        return rpc("check_owner", { pass: pass });
      }
    };
  })() : {
    list: function () {
      return Promise.resolve(readJSON(LOCAL_KEY, SEEDS.slice()));
    },
    add: function (f) {
      var list = readJSON(LOCAL_KEY, SEEDS.slice());
      var saved = { id: "f" + Date.now(), type: f.type, x: f.x, y: f.y, msg: f.msg, nick: f.nick, d: new Date().toISOString().slice(0, 10) };
      list.push(saved);
      writeJSON(LOCAL_KEY, list);
      saved = Object.assign({ token: f.token }, saved);
      return Promise.resolve(saved);
    },
    remove: function (id) {
      var list = readJSON(LOCAL_KEY, SEEDS.slice());
      writeJSON(LOCAL_KEY, list.filter(function (x) { return x.id !== id; }));
      return Promise.resolve(true);
    },
    /* 本机模式没有密码可核对，主人模式直接放行，方便本地调试 */
    checkOwner: function () { return Promise.resolve(true); }
  };

  /* ==========================================================================
     画草地上的花
     ========================================================================== */
  var flowers = [];
  /* 这个浏览器种过的花：{ 花的 id: 暗号 }。旧版本存的是 id 列表，转一下 */
  var mine = readJSON(MINE_KEY, {});
  if (Array.isArray(mine)) {
    var converted = {};
    mine.forEach(function (id) { converted[id] = null; });
    mine = converted;
  }
  function isMine(id) { return Object.prototype.hasOwnProperty.call(mine, id); }

  /* ---------- 主人模式：garden.html?owner=1 输一次管理密码，这个标签页里就能拔任何一朵 ---------- */
  var OWNER_KEY = "beata.garden.ownerpass";
  var ownerPass = null;
  try { ownerPass = sessionStorage.getItem(OWNER_KEY); } catch (e) {}
  var ownerParam = new URLSearchParams(location.search).get("owner");
  if (ownerParam === "0") {
    ownerPass = null;
    try { sessionStorage.removeItem(OWNER_KEY); } catch (e) {}
    toast("已经退出主人模式啦。");
  } else if (ownerParam === "1" && !ownerPass) {
    var typed = window.prompt("主人模式：输入花园的管理密码");
    if (typed) {
      store.checkOwner(typed)
        .then(function (ok) {
          if (!ok) { toast("密码不对，先按普通访客来～"); return; }
          ownerPass = typed;
          try { sessionStorage.setItem(OWNER_KEY, typed); } catch (e) {}
          toast("主人模式：可以拔任何一朵花，也不限次数种 ✿");
        })
        .then(null, function () { toast("核对密码的时候没连上，等一下再试试？"); });
    }
  } else if (ownerPass) {
    toast("主人模式：可以拔任何一朵花，也不限次数种 ✿");
  }
  var hintBtn = document.getElementById("meadowHint");
  var countEl = document.getElementById("flowerCount");
  var localNote = document.getElementById("gardenLocalNote");
  if (localNote) localNote.hidden = online;

  function render(animateId) {
    meadow.querySelectorAll(".flower").forEach(function (n) { n.remove(); });
    var isNight = root.getAttribute("data-theme") === "night";
    var shown = 0;

    flowers.forEach(function (f) {
      if (f.type === "jasmine" && !isNight) return;   /* 夜来香只在夜里开 */
      shown++;
      var el = document.createElement("button");
      el.type = "button";
      el.className = "flower";
      el.setAttribute("data-id", f.id);
      el.setAttribute("aria-label", (TYPES[ALIAS[f.type] || f.type] || TYPES.daisy).name + "，" + (f.nick || "一个路过的朋友") + "留的话");
      el.style.left = f.x * 100 + "%";
      el.style.top = f.y * 100 + "%";
      el.style.zIndex = String(3 + Math.round(f.y * 10));
      var fw = 50 + f.y * 54;                          /* 远处的花小一点，像种在草地深处 */
      el.style.width = fw.toFixed(0) + "px";
      el.style.height = (fw * 1.66).toFixed(0) + "px";
      el.innerHTML = flowerSVG(f.type) +
        '<span class="flower-tip" aria-hidden="true"><span>' + escapeHTML(f.msg) + "</span><b>" +
        escapeHTML(f.nick || "一个路过的朋友") + " · " + escapeHTML(f.d) + "</b></span>";

      if (animateId === "all" || animateId === f.id) {
        meadow.appendChild(el);
        requestAnimationFrame(function () { el.classList.add("is-grown"); });
      } else {
        el.classList.add("is-grown");
        meadow.appendChild(el);
      }
    });

    if (countEl) countEl.textContent = String(flowers.length);
    if (hintBtn) hintBtn.classList.toggle("has-flowers", shown > 0);
  }

  /* 种下那一刻，花上方飘一句话 */
  function thank(f) {
    var el = document.createElement("span");
    el.className = "garden-thank";
    el.textContent = "谢谢你来过 ✿";
    el.style.left = f.x * 100 + "%";
    el.style.top = f.y * 100 + "%";
    meadow.appendChild(el);
    setTimeout(function () { el.remove(); }, reduceMotion ? 1400 : 1900);
  }

  /* ==========================================================================
     点花 → 小纸条（手机也能看）
     ========================================================================== */
  var note = document.getElementById("flowerNote");
  var removeBtn = note ? note.querySelector(".flower-note-remove") : null;
  var noteFor = null;
  var armTimer = null;

  function disarm() {
    clearTimeout(armTimer);
    if (removeBtn) {
      removeBtn.classList.remove("is-armed");
      removeBtn.textContent = "拔掉这朵";
      removeBtn.disabled = false;
    }
  }

  function closeNote() {
    if (!note) return;
    note.hidden = true;
    noteFor = null;
    disarm();
  }

  function openNote(btn) {
    var f = flowers.filter(function (x) { return x.id === btn.getAttribute("data-id"); })[0];
    if (!f || !note) return;
    if (noteFor === f.id) { closeNote(); return; }
    disarm();
    note.querySelector(".flower-note-msg").textContent = f.msg;
    note.querySelector(".flower-note-who").textContent = (f.nick || "一个路过的朋友") + " · " + f.d;
    note.querySelector(".flower-note-mine").hidden = !isMine(f.id);
    /* 自己种的、或者主人模式，才看得到「拔掉这朵」；接了数据库但当时没存下暗号的，自己也拔不了 */
    if (removeBtn) removeBtn.hidden = !(ownerPass || (isMine(f.id) && (!online || mine[f.id])));
    note.hidden = false;
    var r = btn.getBoundingClientRect();
    var w = note.offsetWidth, h = note.offsetHeight;
    var left = Math.min(window.innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
    var top = r.top - h - 10;
    if (top < 12) top = r.bottom + 10;                 /* 上面放不下就放到花下面 */
    note.style.left = left + "px";
    note.style.top = top + "px";
    noteFor = f.id;
  }

  /* 拔花：第一下只是「确认一下」，3 秒内再点才真的拔 */
  function pull() {
    if (!noteFor || !removeBtn) return;
    if (!removeBtn.classList.contains("is-armed")) {
      removeBtn.classList.add("is-armed");
      removeBtn.textContent = "真的要拔掉吗？再点一下";
      armTimer = setTimeout(disarm, 3000);
      return;
    }
    clearTimeout(armTimer);
    var id = noteFor;
    removeBtn.disabled = true;
    store.remove(id, mine[id], ownerPass)
      .then(function (ok) {
        if (!ok) throw new Error("not removed");
        closeNote();
        delete mine[id];
        writeJSON(MINE_KEY, mine);
        var el = meadow.querySelector('.flower[data-id="' + id + '"]');
        if (el) el.classList.add("is-pulling");
        setTimeout(function () {
          flowers = flowers.filter(function (x) { return x.id !== id; });
          render(null);
        }, reduceMotion ? 0 : 420);
        toast("拔掉啦。");
      })
      .then(null, function () {
        disarm();
        toast("没拔动……等一下再试试？");
      });
  }
  if (removeBtn) removeBtn.addEventListener("click", pull);

  /* ==========================================================================
     点草地 → 冒一棵小芽，弹出种花卡片
     ========================================================================== */
  var sheet = document.getElementById("plantSheet");
  var sprout = document.getElementById("plantSprout");
  var picker = document.getElementById("flowerPicker");
  var msgInput = document.getElementById("msgInput");
  var nickInput = document.getElementById("nickInput");
  var counter = document.getElementById("counter");
  var plantBtn = document.getElementById("plantBtn");
  var cancelBtn = document.getElementById("plantCancel");
  var picked = "sunflower";
  var spot = null;            /* 这次要种在哪儿：{x, y}，都是 0–1 */
  var lastFocus = null;
  var busy = false;

  /* 八种花的小按钮 */
  if (picker) {
    Object.keys(TYPES).forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "flower-opt" + (k === picked ? " is-picked" : "");
      b.setAttribute("data-type", k);
      b.setAttribute("aria-pressed", k === picked ? "true" : "false");
      b.setAttribute("aria-label", TYPES[k].name);
      b.innerHTML = flowerSVG(k) + '<span class="flower-name">' + TYPES[k].name + "</span>";
      b.addEventListener("click", function () {
        picked = k;
        picker.querySelectorAll(".flower-opt").forEach(function (o) {
          var on = o === b;
          o.classList.toggle("is-picked", on);
          o.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
      picker.appendChild(b);
    });
  }

  if (msgInput && counter) {
    msgInput.addEventListener("input", function () {
      if (msgInput.value.length > 50) msgInput.value = msgInput.value.slice(0, 50);
      counter.textContent = msgInput.value.length + " / 50";
    });
  }

  /* 还要等几秒才能再种；0 表示现在就能种。主人模式不受限制 */
  function coolLeft() {
    if (ownerPass) return 0;
    var last = Number(readJSON(LAST_KEY, 0)) || 0;
    return Math.max(0, Math.ceil((COOL_MS - (Date.now() - last)) / 1000));
  }

  /* 和已有的花错开一点，别完全叠在一起 */
  function nudge(x, y) {
    flowers.forEach(function (f) {
      if (Math.abs(f.x - x) < 0.05 && Math.abs(f.y - y) < 0.05) x = Math.min(0.94, x + 0.07);
    });
    return { x: x, y: y };
  }

  function openSheet(x, y) {
    if (!sheet) return;
    if (flowers.length >= MAX_SHOW && !online) {
      toast("花园有点挤了，等我拓宽一下再说～");
      return;
    }
    var wait = coolLeft();
    if (wait > 0) {
      toast("刚种下一朵啦，等 " + wait + " 秒再种下一朵吧 ✿");
      return;
    }
    closeNote();
    spot = nudge(Math.min(0.94, Math.max(0.06, x)), Math.min(0.93, Math.max(0.55, y)));
    lastFocus = document.activeElement;

    if (sprout) {
      sprout.style.left = spot.x * 100 + "%";
      sprout.style.top = spot.y * 100 + "%";
      sprout.hidden = false;
    }

    sheet.hidden = false;
    /* 宽屏：卡片贴在小芽旁边；窄屏交给 CSS 变成底部抽屉 */
    if (window.innerWidth > 640) {
      var r = meadow.getBoundingClientRect();
      var px = r.left + spot.x * r.width;
      var py = r.top + spot.y * r.height;
      var w = sheet.offsetWidth, h = sheet.offsetHeight;
      var left = px + 24;
      if (left + w > window.innerWidth - 12) left = px - w - 24;   /* 右边放不下就放左边 */
      left = Math.max(12, left);
      var top = Math.min(window.innerHeight - h - 12, Math.max(12, py - h / 2));
      sheet.style.left = left + "px";
      sheet.style.top = top + "px";
    } else {
      sheet.style.left = "";
      sheet.style.top = "";
    }
    requestAnimationFrame(function () { sheet.classList.add("is-open"); });
    if (msgInput) msgInput.focus({ preventScroll: true });
  }

  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove("is-open");
    sheet.hidden = true;
    if (sprout) sprout.hidden = true;
    spot = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function plant() {
    if (!spot || busy) return;
    busy = true;
    if (plantBtn) plantBtn.disabled = true;
    var f = {
      type: picked,
      x: Number(spot.x.toFixed(4)),
      y: Number(spot.y.toFixed(4)),
      msg: (msgInput && msgInput.value.trim()) || "（没有留言，只是路过）",
      nick: ((nickInput && nickInput.value.trim()) || "").slice(0, 16),
      token: newToken()
    };
    store.add(f)
      .then(function (saved) {
        mine[saved.id] = saved.token || null;
        delete saved.token;                  /* 暗号只记在本机，不挂在花身上 */
        flowers.push(saved);
        writeJSON(MINE_KEY, mine);
        writeJSON(LAST_KEY, Date.now());
        closeSheet();
        render(saved.id);
        thank(saved);
        if (msgInput) msgInput.value = "";
        if (counter) counter.textContent = "0 / 50";
        if (saved.type === "jasmine" && root.getAttribute("data-theme") !== "night") {
          toast("夜来香种好啦，天黑以后它才会开。");
        } else if (!ownerPass) {
          toast("种好啦！想再种一朵的话，等 30 秒哦");
        }
      })
      .then(null, function () {
        toast("哎呀，没种上……网络好像不太顺，等一下再试试？");
      })
      .then(function () {
        busy = false;
        if (plantBtn) plantBtn.disabled = false;
      });
  }

  if (plantBtn) plantBtn.addEventListener("click", plant);
  if (cancelBtn) cancelBtn.addEventListener("click", closeSheet);

  /* 草地上的点击：点到花就看纸条，点到空草地就种花 */
  meadow.addEventListener("click", function (e) {
    var fl = e.target.closest(".flower");
    if (fl) { openNote(fl); return; }
    if (e.target.closest("#meadowHint")) return;
    var r = meadow.getBoundingClientRect();
    var y = (e.clientY - r.top) / r.height;
    if (y < 0.5) return;                               /* 天上不能种花 */
    openSheet((e.clientX - r.left) / r.width, y);
  });

  /* 角落的小提示也是个按钮：键盘用户按回车，在一块空地上种 */
  if (hintBtn) {
    hintBtn.addEventListener("click", function () {
      var x = 0.15 + Math.random() * 0.7;
      var y = 0.62 + Math.random() * 0.26;
      openSheet(x, y);
    });
  }

  /* 点卡片和纸条外面、按 Esc：收起 */
  document.addEventListener("click", function (e) {
    if (note && !note.hidden && !e.target.closest("#flowerNote") && !e.target.closest(".flower")) closeNote();
    if (sheet && !sheet.hidden && !e.target.closest("#plantSheet") && !e.target.closest("#meadow")) closeSheet();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeNote();
    closeSheet();
  });
  window.addEventListener("resize", function () { closeNote(); });
  window.addEventListener("scroll", function () { closeNote(); }, { passive: true });

  /* ---------- 开张 ---------- */
  store.list()
    .then(function (list) {
      flowers = list || [];
      render("all");
    })
    .then(null, function () {
      flowers = [];
      render("all");
      toast("花园暂时没连上，过一会儿刷新试试～");
    });

  /* 切换日夜时，夜来香要重新判断显示 */
  if ("MutationObserver" in window) {
    new MutationObserver(function () { render(null); })
      .observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }
})();
