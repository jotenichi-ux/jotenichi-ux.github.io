/* 碎片 v2：胶卷可以拖、可以点箭头翻；点一张弹出大图，← → 切换，Esc 关掉 */
(function () {
  var strip = document.getElementById("filmStrip");
  if (!strip) return;

  var shots = Array.prototype.slice.call(strip.querySelectorAll(".film-shot"));
  var count = document.getElementById("filmCount");
  var view = document.getElementById("filmView");
  var viewImg = document.getElementById("filmViewImg");
  var viewDate = document.getElementById("filmViewDate");
  var viewCap = document.getElementById("filmViewCap");

  /* 白天 only-night 那张是 display:none，只在看得见的照片之间算数、切换 */
  function visibleShots() {
    return shots.filter(function (s) { return s.offsetParent !== null; });
  }
  function updateCount() {
    if (count) count.textContent = String(visibleShots().length);
  }
  updateCount();
  /* 戳小猫换昼夜时 html 上的 data-theme 会变，跟着更新张数 */
  if ("MutationObserver" in window) {
    new MutationObserver(updateCount).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ---------- 箭头：一次翻大约三张 ---------- */
  function page(dir) {
    var li = strip.querySelector("li");
    var step = li ? (li.getBoundingClientRect().width + 18) * 3 : 600;
    strip.scrollBy({ left: dir * step, behavior: "smooth" });
  }
  var prevBtn = document.getElementById("filmPrev");
  var nextBtn = document.getElementById("filmNext");
  if (prevBtn) prevBtn.addEventListener("click", function () { page(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { page(1); });

  /* ---------- 鼠标按住拖（触屏本来就能滑，不管它） ---------- */
  var drag = null;
  var justDragged = false;
  strip.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag = { x0: e.clientX, left0: strip.scrollLeft, moved: false };
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true;
      strip.classList.add("is-dragging");
    }
    if (drag.moved) strip.scrollLeft = drag.left0 - dx;
  });
  window.addEventListener("pointerup", function () {
    if (!drag) return;
    justDragged = drag.moved;   /* 拖完松手那一下不算点击 */
    drag = null;
    strip.classList.remove("is-dragging");
    setTimeout(function () { justDragged = false; }, 0);
  });

  /* ---------- 大图弹窗 ---------- */
  if (!view || typeof view.showModal !== "function") return;

  var current = null;   /* 当前打开的是哪一个 .film-shot */

  function fill(shot) {
    var img = shot.querySelector("img");
    viewImg.src = img.getAttribute("src");
    viewImg.alt = img.getAttribute("alt") || "";
    viewDate.textContent = shot.getAttribute("data-date") || "";
    viewCap.textContent = shot.getAttribute("data-cap") || "";
    current = shot;
  }

  function open(shot) {
    fill(shot);
    view.showModal();
  }

  function step(dir) {
    var list = visibleShots();
    var i = list.indexOf(current);
    if (i < 0) return;
    fill(list[(i + dir + list.length) % list.length]);
  }

  shots.forEach(function (shot) {
    shot.addEventListener("click", function () {
      if (justDragged) return;
      open(shot);
    });
  });

  document.getElementById("filmClose").addEventListener("click", function () { view.close(); });
  document.getElementById("filmViewPrev").addEventListener("click", function () { step(-1); });
  document.getElementById("filmViewNext").addEventListener("click", function () { step(1); });

  view.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });

  /* 点到弹窗外面的遮罩也关掉 */
  view.addEventListener("click", function (e) {
    if (e.target !== view) return;
    var r = view.getBoundingClientRect();   /* 点在弹窗白边里不算，点出框外才关 */
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) view.close();
  });

  /* 关掉以后，焦点回到刚才那张小照片上，并把它滚进视野 */
  view.addEventListener("close", function () {
    if (current) {
      current.focus({ preventScroll: true });
      current.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });
})();
