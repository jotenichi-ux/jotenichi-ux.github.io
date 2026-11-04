/* About v2：左栏那叠照片。点最上面那张、往旁边甩、点小圆点或按方向键，都能翻 */
(function () {
  var pile = document.getElementById("pile");
  if (!pile) return;

  var cards = Array.prototype.slice.call(pile.querySelectorAll(".pile-card"));
  var dots = Array.prototype.slice.call(document.querySelectorAll("#pileDots button"));
  var count = document.getElementById("pileCount");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var FLY_MS = reduce ? 0 : 340;   /* 飞出去多久再塞回最底下 */
  var FLING_PX = 80;               /* 拖过这么远才算甩出去 */

  /* order[0] 是最上面那张，存的是卡片在 cards 里的下标 */
  var order = cards.map(function (_, i) { return i; });
  var busy = false;

  function render() {
    order.forEach(function (ci, depth) {
      var c = cards[ci];
      c.style.zIndex = String(cards.length - depth);
      c.classList.toggle("is-top", depth === 0);
      c.classList.toggle("is-deep", depth >= 2);
      c.setAttribute("tabindex", depth === 0 ? "0" : "-1");
      if (depth === 0) {
        c.setAttribute("role", "button");
        c.setAttribute("aria-label", "翻到下一张照片");
        c.removeAttribute("aria-hidden");
      } else {
        c.removeAttribute("role");
        c.removeAttribute("aria-label");
        c.setAttribute("aria-hidden", "true");
      }
    });
    var top = order[0];
    dots.forEach(function (d, i) {
      if (i === top) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
    if (count) count.textContent = "第 " + (top + 1) + " / " + cards.length + " 张";
  }

  function setMove(card, x, y, r) {
    card.style.setProperty("--mx", x + "px");
    card.style.setProperty("--my", y + "px");
    card.style.setProperty("--mr", r + "deg");
  }
  function clearMove(card) {
    card.style.removeProperty("--mx");
    card.style.removeProperty("--my");
    card.style.removeProperty("--mr");
  }

  /* 最上面那张往 dir 方向（1 右 / -1 左）飞出去，再滑回来塞到最底下 */
  function next(dir, then) {
    if (busy) return;
    busy = true;
    var card = cards[order[0]];
    var hadFocus = document.activeElement === card;
    dir = dir || 1;
    card.classList.remove("is-dragging");
    card.classList.add("is-flying");
    setMove(card, dir * 260, -30, dir * 22);

    setTimeout(function () {
      order.push(order.shift());
      render();                    /* 先压到最底下，再让它滑回原位 */
      card.classList.remove("is-flying");
      clearMove(card);
      if (hadFocus) cards[order[0]].focus({ preventScroll: true });
      busy = false;
      if (then) then();
    }, FLY_MS);
  }

  /* 把最底下那张抽回最上面：先放到旁边，再滑进来 */
  function prev() {
    if (busy) return;
    busy = true;
    var hadFocus = document.activeElement === cards[order[0]];
    var card = cards[order[order.length - 1]];
    card.style.transition = "none";
    setMove(card, -260, -30, -22);
    card.classList.add("is-flying");
    order.unshift(order.pop());
    render();
    void card.offsetWidth;          /* 让上面的起始位置先生效 */
    card.style.transition = "";
    card.classList.remove("is-flying");
    clearMove(card);
    if (hadFocus) card.focus({ preventScroll: true });
    setTimeout(function () { busy = false; }, FLY_MS);
  }

  /* 小圆点：一张一张快速翻到目标那张 */
  function goTo(target) {
    if (order[0] === target || busy) return;
    next(1, function () {
      if (order[0] !== target) goTo(target);
    });
  }

  /* ---------- 拖着甩 ---------- */
  var drag = null;

  pile.addEventListener("pointerdown", function (e) {
    var card = e.target.closest(".pile-card");
    if (!card || card !== cards[order[0]] || busy) return;
    if (e.button !== undefined && e.button !== 0) return;
    drag = { card: card, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false };
    card.setPointerCapture(e.pointerId);
  });

  pile.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x0;
    drag.dy = e.clientY - drag.y0;
    if (!drag.moved && Math.abs(drag.dx) + Math.abs(drag.dy) > 5) {
      drag.moved = true;
      drag.card.classList.add("is-dragging");
    }
    if (drag.moved) setMove(drag.card, drag.dx, drag.dy * 0.6, drag.dx / 12);
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    if (!d.moved) {                 /* 没怎么动，就当是点了一下 */
      next(1);
      return;
    }
    if (Math.abs(d.dx) > FLING_PX) {
      next(d.dx > 0 ? 1 : -1);
    } else {                         /* 甩得不够远，弹回去 */
      d.card.classList.remove("is-dragging");
      clearMove(d.card);
    }
  }
  pile.addEventListener("pointerup", endDrag);
  pile.addEventListener("pointercancel", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.card.classList.remove("is-dragging");
    clearMove(drag.card);
    drag = null;
  });

  /* ---------- 键盘 ---------- */
  pile.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
      e.preventDefault();
      next(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  });

  dots.forEach(function (d, i) {
    d.addEventListener("click", function () { goTo(i); });
  });

  render();
})();

/* 「小事」：点着抽一条。六条随机不重复，抽完还藏着三条，看完再从头来 */
(function () {
  var box = document.getElementById("draw");
  var btn = document.getElementById("drawBtn");
  var count = document.getElementById("drawCount");
  var psst = document.getElementById("drawPsst");
  if (!box || !btn) return;

  var items = Array.prototype.slice.call(box.querySelectorAll(".draw-item"));
  var mains = [], extras = [];
  items.forEach(function (el, i) {
    (el.getAttribute("data-kind") === "extra" ? extras : mains).push(i);
  });

  var current = -1;
  var left = [];       /* 还没抽过的主条目 */
  var drawn = 0;       /* 已经看过几条主条目 */
  var extraAt = -1;    /* 正在看第几条隐藏款，-1 表示还没开始 */

  function show(i) {
    if (current >= 0 && current !== i) {
      var old = items[current];
      old.classList.remove("is-on");
      old.classList.add("is-leaving");
      setTimeout(function () { old.classList.remove("is-leaving"); }, 240);
    }
    items[i].classList.add("is-on");
    current = i;
  }

  function reset() {
    left = mains.slice(1);   /* 第一条固定是沫沫，正好呼应天黑开关 */
    drawn = 1;
    extraAt = -1;
    show(mains[0]);
    psst.hidden = true;
    btn.textContent = "再抽一条 ↻";
    count.textContent = drawn + " / " + mains.length;
  }

  function step() {
    if (left.length) {
      var k = Math.floor(Math.random() * left.length);
      show(left.splice(k, 1)[0]);
      drawn++;
      count.textContent = drawn + " / " + mains.length;
      if (!left.length) {               /* 六条抽完了，露出彩蛋入口 */
        psst.hidden = false;
        btn.textContent = "再透露一点点 ✨";
      }
      return;
    }
    if (extraAt < extras.length - 1) {
      extraAt++;
      show(extras[extraAt]);
      psst.hidden = true;
      count.textContent = "隐藏款 " + (extraAt + 1) + " / " + extras.length;
      btn.textContent = extraAt === extras.length - 1 ? "好啦，先说到这里 ↑" : "再透露一点点 ✨";
      return;
    }
    reset();
  }

  box.classList.add("is-ready");
  reset();
  btn.addEventListener("click", step);
})();
/* 夜间日记：一组一组进屏幕时轻轻淡入。白天这一块是隐藏的，切到夜里才会被看见、才会触发 */
(function () {
  var diary = document.getElementById("diary");
  if (!diary || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var paras = diary.querySelectorAll(":scope > .diary-group, :scope > .diary-end");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      }
    });
  }, { rootMargin: "0px 0px -12% 0px" });

  diary.classList.add("is-ready");
  Array.prototype.forEach.call(paras, function (p) { io.observe(p); });
})();
