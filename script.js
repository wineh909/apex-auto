/* APEX Auto Studio — front-end interactions (visual only, no backend) */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Header scrolled state + back-to-top + light parallax ---- */
  const header = $("#siteHeader");
  const toTop = $("#toTop");
  const heroGlow = $(".hero-glow");
  const heroMedia = $(".hero-media");
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 20);
    toTop.classList.toggle("show", y > 620);
    if (!reduceMotion && y < 900) {
      if (heroGlow) heroGlow.style.transform = "translateY(" + y * 0.18 + "px)";
      if (heroMedia) heroMedia.style.transform = "translateY(" + y * -0.05 + "px)";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* ---- Mobile menu ---- */
  const burger = $("#burger");
  const menu = $("#mobileMenu");
  const setMenu = (open) => {
    menu.classList.toggle("open", open);
    menu.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    burger.innerHTML = '<svg class="icon"><use href="#' + (open ? "i-close" : "i-menu") + '"/></svg>';
    document.body.style.overflow = open ? "hidden" : "";
  };
  if (burger) {
    burger.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
    $$("#mobileMenu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("open")) setMenu(false);
    });
  }

  /* ---- Reveal on scroll (bidirectional, staggered; scroll-based for reliability) ---- */
  const reveals = $$(".reveal");
  if (reduceMotion) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    reveals.forEach((el) => {
      const sibs = Array.prototype.filter.call(el.parentElement.children, (c) => c.classList.contains("reveal"));
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.transitionDelay = Math.min(idx * 65, 320) + "ms";
    });
    const updateReveals = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      for (const el of reveals) {
        const r = el.getBoundingClientRect();
        el.classList.toggle("in", r.top < vh * 0.92 && r.bottom > vh * 0.06);
      }
    };
    window.addEventListener("scroll", updateReveals, { passive: true });
    window.addEventListener("resize", updateReveals, { passive: true });
    window.addEventListener("load", updateReveals);
    updateReveals();
    // Safety net: re-check after fonts/layout settle (preview panes can starve events).
    [250, 800, 1600].forEach((t) => setTimeout(updateReveals, t));
  }

  /* ---- Success modal ---- */
  const modal = $("#successModal");
  const openModal = (text) => {
    if (text) $("#modalText").textContent = text;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  };
  const closeModal = () => {
    modal.hidden = true;
    document.body.style.overflow = "";
  };
  if (modal) {
    $$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  }

  /* ---- Toast ---- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg) => {
    if (msg) toast.querySelector("span").textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
  };

  /* ---- Booking: calendar + slots + form (visual only, ready for API) ---- */
  (function initBooking() {
    const grid = $("#calGrid");
    if (!grid) return;
    const title = $("#calTitle"), slotsGrid = $("#slotsGrid"), slotsDate = $("#slotsDate");
    const prevBtn = $("#calPrev"), nextBtn = $("#calNext");
    const pick = $("#bookingPick"), pickText = $("#bookingPickText");
    const nameEl = $("#bkName"), phoneEl = $("#bkPhone"), serviceEl = $("#bkService");
    const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const allSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const curMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let view = new Date(curMonth);
    let selDate = null, selTime = null;

    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
    // Deterministic "busy" slots per date — looks real, stays stable on re-render.
    const busyFor = (d) => {
      const seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
      return allSlots.filter((_, i) => ((seed >> i) & 1) === 1 && i % 2 === 0);
    };

    const updatePick = () => {
      if (selDate && selTime) {
        pickText.textContent = "Выбрано: " + fmt(selDate) + ", " + selTime;
        pick.classList.add("ready");
      } else if (selDate) {
        pickText.textContent = fmt(selDate) + " — выберите время";
        pick.classList.remove("ready");
      } else {
        pickText.textContent = "Дата и время не выбраны";
        pick.classList.remove("ready");
      }
    };

    function renderCal() {
      title.textContent = months[view.getMonth()] + " " + view.getFullYear();
      prevBtn.disabled = view.getTime() <= curMonth.getTime();
      grid.innerHTML = "";
      const startDow = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
      const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (let i = 0; i < startDow; i++) {
        const e = document.createElement("div"); e.className = "cal-day empty"; grid.appendChild(e);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(view.getFullYear(), view.getMonth(), d);
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "cal-day"; btn.textContent = d;
        if (date < today || date.getDay() === 0) btn.disabled = true;
        if (date.getTime() === today.getTime()) btn.classList.add("today");
        if (selDate && date.getTime() === selDate.getTime()) btn.classList.add("selected");
        btn.addEventListener("click", () => { selDate = date; selTime = null; renderCal(); renderSlots(); updatePick(); });
        grid.appendChild(btn);
      }
    }

    function renderSlots() {
      if (!selDate) { slotsDate.textContent = "Выберите дату слева"; slotsGrid.innerHTML = ""; return; }
      slotsDate.textContent = "Свободно на " + fmt(selDate);
      const busy = busyFor(selDate);
      slotsGrid.innerHTML = "";
      if (allSlots.every((s) => busy.includes(s))) {
        slotsGrid.innerHTML = '<p class="slots-empty">На эту дату свободных слотов нет — выберите другой день.</p>';
        return;
      }
      allSlots.forEach((s) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "slot"; b.textContent = s;
        if (busy.includes(s)) b.disabled = true;
        if (selTime === s) b.classList.add("selected");
        b.addEventListener("click", () => { selTime = s; renderSlots(); updatePick(); });
        slotsGrid.appendChild(b);
      });
    }

    prevBtn.addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
    nextBtn.addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });

    // Validation helpers
    const markErr = (el, msg) => {
      el.closest(".field").classList.add("invalid");
      const e = document.querySelector('.error[data-for="' + el.id + '"]');
      if (e) e.textContent = msg;
    };
    const clearErr = (el) => {
      el.closest(".field").classList.remove("invalid");
      const e = document.querySelector('.error[data-for="' + el.id + '"]');
      if (e) e.textContent = "";
    };
    [nameEl, phoneEl].forEach((el) => el.addEventListener("input", () => clearErr(el)));

    $("#bookConfirm").addEventListener("click", () => {
      let ok = true;
      if (nameEl.value.trim().length < 2) { markErr(nameEl, "Укажите имя"); ok = false; }
      if (phoneEl.value.replace(/\D/g, "").length < 6) { markErr(phoneEl, "Введите телефон"); ok = false; }
      if (!selDate || !selTime) {
        pick.classList.add("invalid");
        showToast("Выберите дату и время в календаре");
        ok = false;
      }
      if (!ok) return;
      // ---- Ready for backend: send { service, date, time, name, phone } here. ----
      const text = "Услуга: " + serviceEl.dataset.value + " · " + fmt(selDate) + " в " + selTime +
        ". Мы свяжемся с вами по номеру " + phoneEl.value.trim() + " для подтверждения.";
      openModal(text);
      // reset
      selDate = null; selTime = null; nameEl.value = ""; phoneEl.value = "";
      renderCal(); renderSlots(); updatePick();
    });

    renderCal();
    renderSlots();
    updatePick();
  })();

  /* ---- Custom selects (service dropdown — readable on dark theme) ---- */
  $$(".cselect").forEach((sel) => {
    const btn = $(".cselect-btn", sel);
    const valEl = $(".cselect-val", sel);
    if (!btn || !valEl) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = sel.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    $$(".cselect-opt", sel).forEach((opt) => {
      opt.addEventListener("click", () => {
        sel.dataset.value = opt.dataset.value;
        valEl.textContent = opt.textContent;
        $$(".cselect-opt", sel).forEach((o) => o.classList.toggle("is-sel", o === opt));
        sel.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      });
    });
  });
  document.addEventListener("click", () => {
    $$(".cselect.open").forEach((s) => {
      s.classList.remove("open");
      const b = $(".cselect-btn", s);
      if (b) b.setAttribute("aria-expanded", "false");
    });
  });

  /* ---- Before / after sliders (drag to compare) ---- */
  $$(".ba").forEach((ba) => {
    const range = ba.querySelector(".ba-range");
    if (!range) return;
    const set = (v) => { v = Math.max(0, Math.min(100, v)); ba.style.setProperty("--pos", v + "%"); range.value = v; };
    set(50);
    range.addEventListener("input", () => set(+range.value));
    const pct = (e) => { const r = ba.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
    let drag = false;
    ba.addEventListener("pointerdown", (e) => { drag = true; try { ba.setPointerCapture(e.pointerId); } catch (x) {} set(pct(e)); e.preventDefault(); });
    ba.addEventListener("pointermove", (e) => { if (drag) set(pct(e)); });
    ba.addEventListener("pointerup", () => { drag = false; });
    ba.addEventListener("pointercancel", () => { drag = false; });
  });

  /* ---- Background video: nudge autoplay + resume on focus ---- */
  (function () {
    const v = $(".bg__video");
    if (!v) return;
    const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    play();
    v.addEventListener("canplay", play, { once: true });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) play(); });
  })();

  /* ---- Footer year ---- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
