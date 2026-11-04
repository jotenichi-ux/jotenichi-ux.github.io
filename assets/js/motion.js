/* ==========================================================================
   Beata · 世界正在展开  —  动效层脚本（motion.js）
   --------------------------------------------------------------------------
   配合 motion.css 使用，只做四件事：
     A. 翻页时那张纸（顺便把目标页提前下载好）
     B. 文章页的阅读进度线
     C. 卡片跟着鼠标轻轻歪一下
     D. 关键词色块 / 图片的入场

   原则和 site.js 一样：动效可以没有，内容必须有。
   所以所有「先隐藏」的样式都挂在 html.motion 上，而这个类在本文件最后
   才加 —— 万一脚本半路出错，页面仍然是完整可见的。
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* 告诉 CSS：这一层活着。CSS 里所有「先藏起来再显现」都挂在这个类上，
     脚本没跑起来时页面就是完整可见的。 */
  if (!reduceMotion) root.classList.add("motion");

  /* ======================================================================
     A. 翻页时那张纸
     ====================================================================== */

  (function pageSheet() {
    if (reduceMotion) return;

    var veil = document.createElement("div");
    veil.className = "page-veil";
    veil.setAttribute("aria-hidden", "true");
    document.body.appendChild(veil);

    var leaving = false;

    /* 哪些链接不该拦截：锚点、外站、新窗口、下载、文件、原地跳转 */
    function notForUs(a) {
      var href = a.getAttribute("href");
      if (!href) return true;
      if (href.charAt(0) === "#") return true;
      if (a.target && a.target !== "_self") return true;
      if (a.hasAttribute("download")) return true;

      var url;
      try {
        url = new URL(a.href, location.href);
      } catch (e) {
        return true;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return true;
      if (url.origin !== location.origin) return true;
      if (/\.(pdf|zip|png|jpe?g|gif|webp|avif|svg|mp4|mp3)$/i.test(url.pathname)) return true;
      /* 同一页里的锚点跳转，交给浏览器自己滚 */
      if (
        url.pathname === location.pathname &&
        url.search === location.search &&
        url.hash
      )
        return true;

      return false;
    }

    function linkOf(el) {
      return el && el.closest ? el.closest("a[href]") : null;
    }

    document.addEventListener("click", function (e) {
      if (leaving || e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      var a = linkOf(e.target);
      if (!a || notForUs(a)) return;

      var url = new URL(a.href, location.href);
      e.preventDefault();
      leaving = true;
      veil.classList.add("is-covering");

      /* 等纸盖满再走（和 CSS 里 0.3s 对齐） */
      setTimeout(function () {
        location.href = url.href;
      }, 320);
    });

    /* 鼠标碰到链接就先悄悄下一份，点下去几乎不用等 */
    var saveData =
      navigator.connection && navigator.connection.saveData === true;
    var fetched = {};

    function prefetch(a) {
      if (saveData || notForUs(a)) return;
      var url;
      try {
        url = new URL(a.href, location.href).href;
      } catch (e) {
        return;
      }
      if (fetched[url]) return;
      fetched[url] = 1;

      var link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      document.head.appendChild(link);
    }

    document.addEventListener(
      "pointerover",
      function (e) {
        var a = linkOf(e.target);
        if (a) prefetch(a);
      },
      { passive: true }
    );

    document.addEventListener("focusin", function (e) {
      var a = linkOf(e.target);
      if (a) prefetch(a);
    });

    /* 从浏览器缓存里回来（后退 / 前进）时，把纸收起来 */
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      leaving = false;
      veil.classList.remove("is-covering");
    });
  })();

  /* ======================================================================
     B. 文章页的阅读进度线
     ====================================================================== */

  (function readingBar() {
    var body = document.querySelector(".article-body");
    if (!body) return;

    var bar = document.createElement("div");
    bar.className = "read-bar";
    bar.setAttribute("aria-hidden", "true");
    bar.appendChild(document.createElement("span"));
    document.body.appendChild(bar);

    var fill = bar.firstChild;
    var ticking = false;

    function draw() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      p = Math.max(0, Math.min(1, p));
      fill.style.transform = "scaleX(" + p.toFixed(4) + ")";
      bar.classList.toggle("is-on", window.scrollY > 160);
    }

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(draw);
      },
      { passive: true }
    );
    window.addEventListener("resize", draw);
    draw();
  })();

  /* ======================================================================
     C. 卡片跟着鼠标轻轻歪一下
     ----------------------------------------------------------------------
     用 requestAnimationFrame 一点点追过去，所以手停下来卡片也不会「卡」
     在某个角度；离开时自己慢慢躺平。
     ====================================================================== */

  (function cardTilt() {
    if (!canHover || reduceMotion) return;
    if (window.innerWidth < 900) return;

    var MAX = 3.4; /* 最多歪 3.4 度，再多就晕了 */
    var EASE = 0.18;

    Array.prototype.forEach.call(
      document.querySelectorAll(".card"),
      function (card) {
        var raf = null;
        var tX = 0,
          tY = 0,
          tP = 0;
        var cX = 0,
          cY = 0,
          cP = 0;

        function tick() {
          cX += (tX - cX) * EASE;
          cY += (tY - cY) * EASE;
          cP += (tP - cP) * EASE;

          if (Math.abs(tX - cX) < 0.02) cX = tX;
          if (Math.abs(tY - cY) < 0.02) cY = tY;
          if (Math.abs(tP - cP) < 0.01) cP = tP;

          /* 完全躺平了就把行内样式还回去，让 CSS 重新接管 */
          if (cX === 0 && cY === 0 && cP === 0) {
            card.style.transform = "";
            raf = null;
            return;
          }

          card.style.transform =
            "perspective(880px) rotateX(" +
            cY.toFixed(3) +
            "deg) rotateY(" +
            cX.toFixed(3) +
            "deg) translateY(" +
            (-5 * cP).toFixed(2) +
            "px) scale(" +
            (1 + 0.004 * cP).toFixed(4) +
            ")";

          raf = requestAnimationFrame(tick);
        }

        function start() {
          if (!raf) raf = requestAnimationFrame(tick);
        }

        card.addEventListener(
          "pointermove",
          function (e) {
            if (e.pointerType !== "mouse") return;
            var r = card.getBoundingClientRect();
            if (!r.width || !r.height) return;

            var px = (e.clientX - r.left) / r.width;
            var py = (e.clientY - r.top) / r.height;

            tX = (px - 0.5) * MAX * 2;
            tY = (0.5 - py) * MAX * 2;
            tP = 1;

            card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
            card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
            start();
          },
          { passive: true }
        );

        card.addEventListener("pointerenter", function (e) {
          if (e.pointerType !== "mouse") return;
          card.classList.add("is-tilting");
        });

        card.addEventListener("pointerleave", function () {
          card.classList.remove("is-tilting");
          tX = 0;
          tY = 0;
          tP = 0;
          start();
        });
      }
    );
  })();

  /* ======================================================================
     D1. 标题关键词：滚到跟前再刷色
     ====================================================================== */

  (function inkMarks() {
    var marks = document.querySelectorAll(".mark");
    if (!marks.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(marks, function (m) {
        m.classList.add("is-inked");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add("is-inked");
          io.unobserve(en.target);
        });
      },
      { threshold: 0.65 }
    );

    Array.prototype.forEach.call(marks, function (m) {
      io.observe(m);
    });
  })();

  /* ======================================================================
     D2. 图片淡入（只处理要滚动才看到的图）
     ====================================================================== */

  (function photoFade() {
    Array.prototype.forEach.call(
      document.querySelectorAll('img[loading="lazy"]'),
      function (img) {
        if (img.complete) return; /* 已经在缓存里，就别再淡一次 */

        img.classList.add("is-fading");

        var done = function () {
          img.classList.add("is-loaded");
        };

        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });

        /* 加类的这一瞬间刚好加载完，就不会再触发 load 了 */
        if (img.complete) done();
      }
    );
  })();

  /* ======================================================================
     收尾
     ====================================================================== */
})();
