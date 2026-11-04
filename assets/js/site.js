/* ==========================================================================
   Beata · 世界正在展开  —  站点脚本
   --------------------------------------------------------------------------
   这个文件负责所有"会动的、会变的"部分：
     A. 日夜双人格（切换 + 记住 + 防闪白）
     B. 小猫开关与它的小气泡
     C. 手机端菜单
     D. 滚动显现、星星、水彩笔刷光标
     E. 项目页：筛选 + 展开
     F. 花园：种花、查看留言（数据存在你自己的浏览器里）
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* 告诉 CSS：JS 正常工作，可以用「先隐藏再显现」的动效了。
     万一脚本挂了，内容依然完整显示 —— 内容永远优先于动效。 */
  root.classList.add("js");

  /* ======================================================================
     A. 日夜双人格
     ====================================================================== */

  var THEME_KEY = "beata.theme";

  /* 白天 07:00–19:00，其余时间算夜里 */
  function themeByClock() {
    var h = new Date().getHours();
    return h >= 7 && h < 19 ? "day" : "night";
  }

  function readTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      /* 手动选择过就听手动选择的，没选过才按时钟走 */
      if (saved === "night" || saved === "day") return saved;
    } catch (e) {}
    return themeByClock();
  }

  function saveTheme(t) {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (e) {}
  }

  /* 随机气泡的语录：白天轻快，夜里碎碎念 */
  var DAY_LINES = [
    "嘿！在看什么呢？",
    "今天也要做点有意思的事！",
    "要不要去别的地方逛逛？",
    "我刚刚是不是又忘记了什么……"
  ];
  var NIGHT_LINES = [
    "怎么还没睡呀？",
    "其实我也不困……好吧，有一点。",
    "今天过得怎么样？",
    "突然想到一件事。",
    "嘘，猫已经睡着了。"
  ];

  function pickLine(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    var btn = document.getElementById("themeBtn");
    if (btn) {
      btn.setAttribute(
        "aria-label",
        t === "night" ? "切换到日间模式" : "切换到夜间模式"
      );
      btn.setAttribute(
        "title",
        t === "night" ? "早安！今天也去看看世界吧。" : "嘘，世界要睡觉啦。"
      );
    }
    var catBtn = document.getElementById("catSwitch");
    if (catBtn) {
      catBtn.setAttribute(
        "aria-label",
        t === "night" ? "戳一下小猫，切换到日间模式" : "戳一下小猫，切换到夜间模式"
      );
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "night" ? "#1a1a33" : "#fffdf8");

    var cb = document.getElementById("catBubble");
    if (cb) cb.textContent = pickLine(DAY_LINES);
    var nb = document.getElementById("nightBubble");
    if (nb) nb.textContent = pickLine(NIGHT_LINES);
  }

  // 页面一打开就恢复上次的选择（HTML 里已经有一段内联脚本先做了防闪白，
  // 这里再同步一次按钮状态）
  applyTheme(readTheme());

  function makeVeil() {
    var v = document.createElement("div");
    v.className = "veil";
    document.body.appendChild(v);
    return v;
  }

  var veil = null;

  /* 切换主题：中间垫一层水彩幕布，等它盖满屏幕再换色，眼睛不会难受 */
  function toggleTheme() {
    var next = readTheme() === "night" ? "day" : "night";

    if (reduceMotion) {
      applyTheme(next);
      saveTheme(next);
      toast(next === "night" ? "嘘，世界要睡觉啦。" : "早安！今天也去看看世界吧。");
      return;
    }

    if (!veil) veil = makeVeil();
    veil.style.background =
      next === "night"
        ? "linear-gradient(180deg,#1a1a33 0%,#1a1a33 62%,rgba(26,26,51,0) 100%)"
        : "linear-gradient(180deg,#fffdf8 0%,#fffdf8 62%,rgba(255,253,248,0) 100%)";

    veil.classList.remove("is-out");
    veil.classList.add("is-down");

    setTimeout(function () {
      applyTheme(next);
      saveTheme(next);
      toast(next === "night" ? "嘘，世界要睡觉啦。" : "早安！今天也去看看世界吧。");
      veil.classList.remove("is-down");
      veil.classList.add("is-out");
      // 退场结束后把幕布无声地挪回顶部，避免它从下往上"倒放"一次
      setTimeout(function () {
        veil.style.transition = "none";
        veil.classList.remove("is-out");
        void veil.offsetHeight;
        veil.style.transition = "";
      }, 700);
    }, 600);
  }

  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }

  /* ======================================================================
     B. 小猫开关 +「戳戳我？」气泡
     ====================================================================== */

  var HINT_KEY = "beata.catHint";
  var cat = document.getElementById("catSwitch");

  if (cat) {
    cat.addEventListener("click", function () {
      cat.classList.add("is-stretching");
      setTimeout(function () {
        cat.classList.remove("is-stretching");
      }, 820);

      var bubble = document.getElementById("catBubble");
      if (bubble) bubble.classList.remove("is-on");
      try {
        localStorage.setItem(HINT_KEY, "1");
      } catch (e) {}

      // 等小猫把懒腰伸完，再天黑
      setTimeout(toggleTheme, reduceMotion ? 0 : 380);
    });

    // 第一次来的人，小猫会自己打个招呼（只出现一次）
    try {
      if (!localStorage.getItem(HINT_KEY)) {
        var b = document.getElementById("catBubble");
        var nb0 = document.getElementById("nightBubble");
        if (b) {
          setTimeout(function () {
            b.classList.add("is-on");
          }, 1600);
          setTimeout(function () {
            b.classList.remove("is-on");
          }, 7600);
        }
        if (nb0) {
          setTimeout(function () {
            nb0.classList.add("is-on");
          }, 1600);
          setTimeout(function () {
            nb0.classList.remove("is-on");
          }, 7600);
        }
      }
    } catch (e) {}
  }

  /* 夜里的那个我也可以戳：一戳就天亮（和戳小猫是同一件事） */
  var nightMe = document.getElementById("nightCatSwitch") || document.querySelector(".hero-art > .mascot");
  if (nightMe) {
    var wakeUp = function (e) {
      if (e.type === "keydown") {
        if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
        e.preventDefault();
      }
      toggleTheme();
    };
    nightMe.addEventListener("click", wakeUp);
    nightMe.addEventListener("keydown", wakeUp);
  }

  /* 没有手动选过的话，页面开着跨过 7 点 / 19 点也会自己换一次 */
  setInterval(function () {
    var saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (e) {}
    if (saved === "night" || saved === "day") return;
    var t = themeByClock();
    if (t !== root.getAttribute("data-theme")) applyTheme(t);
  }, 10 * 60 * 1000);

  /* ======================================================================
     C. 手机端菜单
     ====================================================================== */

  var menuBtn = document.getElementById("menuBtn");
  var head = document.getElementById("siteHead");

  if (menuBtn && head) {
    menuBtn.addEventListener("click", function () {
      var open = head.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // 点了链接就收起来
    head.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        head.classList.remove("nav-open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* 页头滚过一点之后才出现分割线 */
  if (head) {
    var onScroll = function () {
      head.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ======================================================================
     D1. 滚动显现
     ====================================================================== */

  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  // 让同一组里的元素依次出现，而不是一起跳出来
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    var step = parseInt(group.getAttribute("data-stagger"), 10) || 90;
    group.querySelectorAll(":scope > .reveal").forEach(function (el, i) {
      el.style.transitionDelay = i * step + "ms";
      el.__revealDelay = i * step;
    });
  });

  /* 入场演完就把「入场用的那套样式」卸干净。
     原因：transition-delay 是写在元素内联样式上的，会一直留着；鼠标移上去时
     卡片每一帧都在改写 transform，每次都要等那 110 / 220ms 的延迟，没等到就被
     下一帧改写打断 —— 于是第二、三张卡永远「飘过不会动」。
     另外 .reveal.is-in 上的 transform: none 也压着 :hover 的位移。
     演完摘掉 reveal / is-in，让 CSS 重新当家，hover 和跟手倾斜才回得来。 */
  function settleReveal(el) {
    if (el.__revealSettled) return;
    el.__revealSettled = true;

    var done = false;

    function finish() {
      if (done) return;
      done = true;
      el.removeEventListener("transitionend", onEnd);
      el.style.transitionDelay = "";
      el.classList.remove("reveal", "is-in");
    }

    function onEnd(e) {
      if (e.target === el && e.propertyName === "transform") finish();
    }

    el.addEventListener("transitionend", onEnd);
    // 兜底：万一 transitionend 没来（标签页切走、动效被掐断）
    window.setTimeout(finish, (el.__revealDelay || 0) + 1400);
  }

  function showReveal(el) {
    el.classList.add("is-in");
    settleReveal(el);
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            showReveal(en.target);
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    revealEls.forEach(function (el) {
      io.observe(el);
    });

    // 首屏里已经在视野内的，立刻显示，别让人干等
    requestAnimationFrame(function () {
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) showReveal(el);
      });
    });
  } else {
    revealEls.forEach(function (el) {
      showReveal(el);
    });
  }

  /* ======================================================================
     D2. 星星（只有夜里看得见，交给 CSS 显隐）
     ====================================================================== */

  (function stars() {
    if (document.getElementById("stars")) return;
    var box = document.createElement("div");
    box.className = "stars";
    box.id = "stars";
    box.setAttribute("aria-hidden", "true");

    var n = window.innerWidth < 700 ? 34 : 62;
    var html = "";
    for (var i = 0; i < n; i++) {
      var x = (Math.random() * 100).toFixed(2);
      var y = (Math.random() * 78).toFixed(2);
      var s = Math.random() < 0.18 ? 3 : Math.random() < 0.5 ? 2 : 1.5;
      var d = (Math.random() * 4).toFixed(2);
      var dur = (3 + Math.random() * 4).toFixed(2);
      html +=
        '<i class="star" style="left:' +
        x +
        "%;top:" +
        y +
        "%;width:" +
        s +
        "px;height:" +
        s +
        'px;animation-delay:' +
        d +
        "s;animation-duration:" +
        dur +
        's"></i>';
    }
    box.innerHTML = html;
    document.body.appendChild(box);
  })();

  /* ======================================================================
     D3. 单点柔光光标（只在电脑端，文章正文里自动变淡）
     ====================================================================== */

  (function softCursorGlow() {
    if (!canHover || reduceMotion) return;
    if (window.innerWidth < 900) return;

    var glow = document.createElement("div");
    glow.id = "soft-cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);

    var targetX = window.innerWidth / 2;
    var targetY = window.innerHeight / 2;
    var currentX = targetX;
    var currentY = targetY;
    var running = false;
    var visible = false;

    function loop() {
      currentX += (targetX - currentX) * 0.105;
      currentY += (targetY - currentY) * 0.105;
      glow.style.transform = "translate3d(" + currentX + "px," + currentY + "px,0)";

      if (visible || Math.abs(targetX - currentX) > 0.12 || Math.abs(targetY - currentY) > 0.12) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    function start() {
      if (running) return;
      running = true;
      requestAnimationFrame(loop);
    }

    window.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse" || window.innerWidth < 900) return;
      targetX = event.clientX;
      targetY = event.clientY;
      visible = true;
      glow.classList.add("is-visible");

      var target = event.target;
      var isReading = target && target.closest && target.closest(".article-body");
      glow.classList.toggle("is-reading", !!isReading);
      start();
    }, { passive: true });

    document.documentElement.addEventListener("pointerleave", function (event) {
      if (event.pointerType && event.pointerType !== "mouse") return;
      visible = false;
      glow.classList.remove("is-visible", "is-reading");
      start();
    });

    window.addEventListener("blur", function () {
      visible = false;
      glow.classList.remove("is-visible", "is-reading");
    });

    window.addEventListener("resize", function () {
      var enabled = window.innerWidth >= 900;
      glow.hidden = !enabled;
      if (!enabled) {
        visible = false;
        glow.classList.remove("is-visible", "is-reading");
      }
    });
  })();

  /* ======================================================================
     E. 项目页：筛选 + 逐条展开
     ====================================================================== */

  (function projects() {
    var list = document.getElementById("projList");
    if (!list) return;

    // 筛选
    var btns = document.querySelectorAll(".filter-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");

        var f = btn.getAttribute("data-filter");
        list.querySelectorAll(".proj-item").forEach(function (item) {
          var cats = (item.getAttribute("data-cat") || "").split(" ");
          var show = f === "all" || cats.indexOf(f) > -1;
          item.style.display = show ? "" : "none";
        });
      });
    });

    // 展开 / 收起
    list.querySelectorAll(".proj-head").forEach(function (headBtn) {
      headBtn.addEventListener("click", function () {
        var item = headBtn.closest(".proj-item");
        var open = item.classList.toggle("is-open");
        headBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  })();

  /* ======================================================================
     小工具：底部提示条
     ====================================================================== */

  var toastTimer;
  function toast(text) {
    var el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    requestAnimationFrame(function () {
      el.classList.add("is-on");
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-on");
    }, 2600);
  }

  /* ======================================================================
     G. 首页的小发现：随机纸条 + 猫咪的秘密
     ====================================================================== */

  var HERO_NOTES = [
    "有时候走慢一点，也会遇见意想不到的风景。",
    "我还有好多好多想做的事，想想就觉得未来很有意思。",
    "今天也有在好好生活！虽然偶尔会有一点点手忙脚乱。",
    "世界那么大，我想多认识几个不同的自己。",
    "希望以后回头看，会喜欢现在的自己。"
  ];

  (function heroDiscoveries() {
    var noteTrigger = document.getElementById("heroNoteTrigger");
    var notePanel = document.getElementById("heroNotePanel");
    var noteCopy = document.getElementById("heroNoteCopy");
    var noteAgain = document.getElementById("heroNoteAgain");
    var noteClose = document.getElementById("heroNoteClose");
    var secretTrigger = document.getElementById("heroSecretTrigger");
    var secretPanel = document.getElementById("heroSecretPanel");
    var secretClose = document.getElementById("heroSecretClose");

    if (!noteTrigger || !notePanel || !secretTrigger || !secretPanel) return;

    var noteDiscovery = {
      name: "note",
      trigger: noteTrigger,
      panel: notePanel,
      shell: noteTrigger.closest("[data-hero-discovery]")
    };
    var secretDiscovery = {
      name: "secret",
      trigger: secretTrigger,
      panel: secretPanel,
      shell: secretTrigger.closest("[data-hero-discovery]")
    };
    var activeDiscovery = null;
    var lastTrigger = null;
    var lastNoteIndex = -1;

    function focusable(panel) {
      return Array.prototype.slice.call(panel.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )).filter(function (item) {
        return !item.hidden;
      });
    }

    function pickNextNote() {
      var nextIndex;
      if (HERO_NOTES.length < 2) return 0;
      do {
        nextIndex = Math.floor(Math.random() * HERO_NOTES.length);
      } while (nextIndex === lastNoteIndex);
      lastNoteIndex = nextIndex;
      return nextIndex;
    }

    function showNextNote(first) {
      if (!noteCopy) return;
      var next = HERO_NOTES[pickNextNote()];
      if (first || reduceMotion) {
        noteCopy.textContent = next;
        return;
      }
      noteCopy.classList.add("is-changing");
      setTimeout(function () {
        noteCopy.textContent = next;
        noteCopy.classList.remove("is-changing");
      }, 150);
    }

    function closeDiscovery(discovery, returnFocus) {
      if (!discovery) return;
      clearTimeout(discovery.closeTimer);
      discovery.shell.classList.remove("is-open");
      discovery.trigger.setAttribute("aria-expanded", "false");
      if (activeDiscovery === discovery) activeDiscovery = null;
      discovery.closeTimer = setTimeout(function () {
        discovery.panel.hidden = true;
      }, reduceMotion ? 0 : 220);
      if (returnFocus && lastTrigger && lastTrigger.focus) {
        lastTrigger.focus({ preventScroll: true });
      }
    }

    function openDiscovery(discovery) {
      if (activeDiscovery === discovery) {
        closeDiscovery(discovery, true);
        return;
      }
      if (activeDiscovery) closeDiscovery(activeDiscovery, false);
      clearTimeout(discovery.closeTimer);
      activeDiscovery = discovery;
      lastTrigger = discovery.trigger;
      discovery.panel.hidden = false;
      discovery.trigger.setAttribute("aria-expanded", "true");
      if (discovery === noteDiscovery) showNextNote(true);
      requestAnimationFrame(function () {
        discovery.shell.classList.add("is-open");
        var items = focusable(discovery.panel);
        (items[0] || discovery.panel).focus({ preventScroll: true });
      });
    }

    noteTrigger.addEventListener("click", function () {
      openDiscovery(noteDiscovery);
    });
    secretTrigger.addEventListener("click", function () {
      openDiscovery(secretDiscovery);
    });
    if (noteAgain) noteAgain.addEventListener("click", function () { showNextNote(false); });
    if (noteClose) noteClose.addEventListener("click", function () { closeDiscovery(noteDiscovery, true); });
    if (secretClose) secretClose.addEventListener("click", function () { closeDiscovery(secretDiscovery, true); });

    document.addEventListener("click", function (event) {
      if (!activeDiscovery || activeDiscovery.shell.contains(event.target)) return;
      closeDiscovery(activeDiscovery, true);
    });

    document.addEventListener("keydown", function (event) {
      if (!activeDiscovery) return;
      if (event.key === "Escape" || event.key === "Esc") {
        event.preventDefault();
        closeDiscovery(activeDiscovery, true);
        return;
      }
      if (event.key !== "Tab") return;
      var items = focusable(activeDiscovery.panel);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  })();

  /* ======================================================================
     H. 信封开场：第一次来，先拆一封信
     ====================================================================== */

  (function letterGate() {
    var gate = document.getElementById("letterGate");
    if (!gate) return;

    var envelope = document.getElementById("envelopeBtn");
    var card = document.getElementById("letterCard");
    var closeBtn = document.getElementById("letterClose");
    var KEY = "beata.letter.v1";
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var lastFocus = null;

    function showLetter() {
      lastFocus = document.activeElement;
      gate.hidden = false;
      document.documentElement.classList.add("is-letter-locked");
      requestAnimationFrame(function () {
        gate.classList.add("is-in");
      });
      setTimeout(function () {
        gate.focus({ preventScroll: true });
      }, reduce ? 10 : 220);
    }

    function openEnvelope() {
      if (gate.classList.contains("is-open")) return;
      gate.classList.add("is-open");
      if (card) card.setAttribute("aria-hidden", "false");
      if (card) {
        setTimeout(function () {
          card.focus({ preventScroll: true });
        }, reduce ? 10 : 380);
      }
    }

    function closeLetter() {
      gate.classList.remove("is-open");
      gate.classList.add("is-closing");
      document.documentElement.classList.remove("is-letter-locked");
      try {
        localStorage.setItem(KEY, "1");
      } catch (e) {}
      if (card) card.setAttribute("aria-hidden", "true");
      setTimeout(function () {
        gate.classList.remove("is-in", "is-closing");
        gate.hidden = true;
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      }, reduce ? 10 : 460);
    }

    if (envelope) envelope.addEventListener("click", openEnvelope);
    if (closeBtn) closeBtn.addEventListener("click", closeLetter);

    // 页脚的「那封信」：不跳转，直接把信叫回来（跳转会丢掉线上访问参数）
    document.addEventListener("click", function (e) {
      var t = e.target;
      while (t && t.nodeType === 1) {
        if (t.hasAttribute("data-letter-open")) {
          e.preventDefault();
          gate.classList.remove("is-closing");
          showLetter();
          setTimeout(openEnvelope, reduce ? 0 : 200);
          return;
        }
        t = t.parentNode;
      }
    });

    // 点空白处也能收起来
    gate.addEventListener("click", function (e) {
      if (e.target === gate) closeLetter();
    });

    document.addEventListener("keydown", function (e) {
      if (gate.hidden) return;
      if (e.key === "Escape" || e.key === "Esc") closeLetter();
    });

    var seen = false;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch (e) {}
    if (!seen || /[?&]letter=1\b/.test(location.search)) {
      setTimeout(showLetter, reduce ? 0 : 520);
    }
  })();

  /* ======================================================================
     H. 分享参数透传：线上链接带的 sharecode 要跟着站内跳转走
     ----------------------------------------------------------------------
     线上发布后，服务器要求每个地址都带访问参数，否则返回「链接不完整」。
     站内 <a> 都是相对路径，一跳转参数就没了。这里把它补回去，
     这样被转发到某一页的人、或者浏览器没存住授权的情况，也不会白屏。
     ====================================================================== */

  (function keepShareCode() {
    var m = location.search.match(/[?&]sharecode=([^&]+)/);
    if (!m) return;
    var code = m[1];

    function addCode(href) {
      if (!href) return href;
      if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return href;
      if (/^https?:\/\//i.test(href) && href.indexOf(location.origin) !== 0) return href;
      if (/[?&]sharecode=/.test(href)) return href;

      var hash = "";
      var cut = href.indexOf("#");
      if (cut > -1) {
        hash = href.slice(cut);
        href = href.slice(0, cut);
      }
      return href + (href.indexOf("?") > -1 ? "&" : "?") + "sharecode=" + code + hash;
    }

    function apply() {
      var links = document.querySelectorAll("a[href]:not([data-nocode])");
      for (var i = 0; i < links.length; i++) {
        var raw = links[i].getAttribute("href");
        var next = addCode(raw);
        if (next !== raw) links[i].setAttribute("href", next);
      }
    }

    apply();
  })();

  /* ======================================================================
     I. 联系我：点一下就把号码抄走
     ====================================================================== */

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-copy]") : null;
    if (!btn) return;
    var text = btn.getAttribute("data-copy");
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;

    copyText(text).then(
      function () {
        btn.textContent = "已复制 ✓";
        btn.classList.add("is-done");
        toast("抄好啦：" + text);
      },
      function () {
        btn.textContent = "长按复制";
        toast("这次没抄成，直接选中复制吧：" + text);
      }
    ).then(function () {
      setTimeout(function () {
        btn.textContent = btn.dataset.orig;
        btn.classList.remove("is-done");
      }, 1800);
    });
  });

  window.beataToast = toast;

  /* ======================================================================
     J. 照片点开看大图
     ----------------------------------------------------------------------
     照片墙和项目相册里的图，点一下浮上来。点空白处、点叉、按 Esc 都能收。
     图片用 DOM 现建，不用 innerHTML，避免把 alt 里的符号当成标签。
     ====================================================================== */

  (function photoZoom() {
    var imgs = document.querySelectorAll(".photo-wall img, .project-gallery img");
    if (!imgs.length) return;

    var box = null;

    function close() {
      if (!box) return;
      var current = box;
      box = null;
      current.classList.remove("is-on");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () {
        if (current.parentNode) current.parentNode.removeChild(current);
      }, 280);
    }

    function onKey(e) {
      if (e.key === "Escape" || e.key === "Esc") close();
    }

    function open(src, alt) {
      close();
      var wrap = document.createElement("div");
      wrap.className = "photo-zoom";

      var img = document.createElement("img");
      img.src = src;
      img.alt = alt || "";

      var btn = document.createElement("button");
      btn.className = "photo-zoom-x";
      btn.type = "button";
      btn.setAttribute("aria-label", "关闭");
      btn.textContent = "×";

      wrap.appendChild(img);
      wrap.appendChild(btn);
      document.body.appendChild(wrap);
      box = wrap;

      requestAnimationFrame(function () {
        wrap.classList.add("is-on");
      });

      wrap.addEventListener("click", function (e) {
        if (e.target === wrap || e.target === btn) close();
      });
      document.addEventListener("keydown", onKey);
    }

    for (var i = 0; i < imgs.length; i++) {
      imgs[i].addEventListener("click", function () {
        open(this.currentSrc || this.src, this.alt);
      });
    }
  })();

  /* ======================================================================
     K. 照片目录：短句悬停预览，点击后把这一刻留下来
     ----------------------------------------------------------------------
     电脑端共用右侧舞台；手机和触屏设备会把舞台移到当前目录项下面。
     ====================================================================== */

  (function photoDirectory() {
    var directory = document.getElementById("photoDirectory");
    var shell = document.getElementById("photoDirectoryShell");
    var stage = document.getElementById("photoStage");
    var stageHome = document.getElementById("photoStageHome");
    if (!directory || !shell || !stage || !stageHome) return;

    var items = Array.prototype.slice.call(directory.querySelectorAll(".photo-directory-item"));
    var triggers = items.map(function (item) { return item.querySelector(".photo-directory-trigger"); });
    var panels = Array.prototype.slice.call(stage.querySelectorAll("[data-photo-panel]"));
    var hint = stage.querySelector(".photo-stage-hint");
    var pinnedIndex = -1;
    var previewIndex = -1;

    function inlineMode() {
      return window.innerWidth <= 860 || !canHover;
    }

    function setItemStates(index, pinned) {
      items.forEach(function (item, itemIndex) {
        item.classList.toggle("is-preview", itemIndex === index && !pinned);
        item.classList.toggle("is-active", itemIndex === pinnedIndex);
        triggers[itemIndex].setAttribute("aria-expanded", itemIndex === pinnedIndex ? "true" : "false");
      });
    }

    function show(index, pinned) {
      previewIndex = index;
      panels.forEach(function (panel, panelIndex) {
        panel.hidden = panelIndex !== index;
        if (panelIndex === index) panel.style.setProperty("--photo-tilt", index % 2 ? ".55deg" : "-.65deg");
      });
      if (hint) hint.hidden = true;
      setItemStates(index, pinned);
    }

    function hide() {
      previewIndex = -1;
      panels.forEach(function (panel) { panel.hidden = true; });
      if (hint) hint.hidden = false;
      setItemStates(-1, false);
    }

    function returnStageHome() {
      if (stage.parentNode !== stageHome) stageHome.appendChild(stage);
    }

    function closePinned() {
      pinnedIndex = -1;
      returnStageHome();
      hide();
    }

    function pin(index) {
      if (pinnedIndex === index) {
        closePinned();
        return;
      }
      pinnedIndex = index;
      if (inlineMode()) items[index].appendChild(stage);
      else returnStageHome();
      show(index, true);
    }

    items.forEach(function (item, index) {
      var trigger = triggers[index];

      item.addEventListener("pointerenter", function (event) {
        if (!canHover || inlineMode() || event.pointerType !== "mouse") return;
        show(index, false);
      });

      item.addEventListener("pointerleave", function (event) {
        if (!canHover || inlineMode() || event.pointerType !== "mouse") return;
        if (pinnedIndex >= 0) show(pinnedIndex, true);
        else hide();
      });

      trigger.addEventListener("focus", function () {
        if (!inlineMode()) show(index, false);
      });

      trigger.addEventListener("blur", function () {
        if (inlineMode()) return;
        if (pinnedIndex >= 0) show(pinnedIndex, true);
        else hide();
      });

      trigger.addEventListener("click", function () {
        pin(index);
      });
    });

    if (!reduceMotion) {
      shell.addEventListener("pointermove", function (event) {
        if (!canHover || inlineMode() || event.pointerType !== "mouse" || previewIndex < 0) return;
        var x = (event.clientX / window.innerWidth - 0.5) * 10;
        var y = (event.clientY / window.innerHeight - 0.5) * 7;
        stage.style.setProperty("--float-x", x.toFixed(2) + "px");
        stage.style.setProperty("--float-y", y.toFixed(2) + "px");
      }, { passive: true });
    }

    window.addEventListener("resize", function () {
      if (inlineMode()) {
        if (pinnedIndex >= 0) items[pinnedIndex].appendChild(stage);
      } else {
        returnStageHome();
      }
      if (pinnedIndex >= 0) show(pinnedIndex, true);
      else hide();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && pinnedIndex >= 0) {
        var closingIndex = pinnedIndex;
        closePinned();
        if (triggers[closingIndex]) triggers[closingIndex].focus();
      }
    });

    hide();
  })();

  /* ======================================================================
     L. 赛会照片故事：桌面共用舞台，手机在目录项下展开
     ====================================================================== */

  (function eventStoryGallery() {
    var gallery = document.getElementById("eventStoryGallery");
    var stage = document.getElementById("eventStoryStage");
    var stageHome = document.getElementById("eventStoryStageHome");
    if (!gallery || !stage || !stageHome) return;

    var items = Array.prototype.slice.call(gallery.querySelectorAll(".event-story-item"));
    var triggers = items.map(function (item) { return item.querySelector(".event-story-trigger"); });
    var panels = Array.prototype.slice.call(stage.querySelectorAll("[data-event-panel]"));
    var activeIndex = 0;

    function inlineMode() {
      return window.innerWidth <= 720 || !canHover;
    }

    function returnStageHome() {
      if (stage.parentNode !== stageHome) stageHome.appendChild(stage);
    }

    function show(index) {
      activeIndex = index;
      if (inlineMode()) items[index].appendChild(stage);
      else returnStageHome();

      panels.forEach(function (panel, panelIndex) {
        panel.hidden = panelIndex !== index;
      });
      items.forEach(function (item, itemIndex) {
        var active = itemIndex === index;
        item.classList.toggle("is-active", active);
        triggers[itemIndex].setAttribute("aria-expanded", active ? "true" : "false");
      });
    }

    triggers.forEach(function (trigger, index) {
      trigger.addEventListener("click", function () { show(index); });
      trigger.addEventListener("focus", function () {
        if (!inlineMode()) show(index);
      });
    });

    items.forEach(function (item, index) {
      item.addEventListener("pointerenter", function (event) {
        if (!inlineMode() && event.pointerType === "mouse") show(index);
      });
    });

    window.addEventListener("resize", function () { show(activeIndex); });
    show(0);
  })();
})();
