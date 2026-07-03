/* ==========================================================================
   FINANCE PRO 2.0 — логика приложения
   Хранение: localStorage (ключ "financeProDB").
   Все суммы — числа в валюте, заданной в настройках (settings.currency).
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 0. TELEGRAM WEBAPP
   * ------------------------------------------------------------------ */
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    try { tg.ready(); tg.expand(); } catch (e) { /* ignore */ }
  }

  function haptic(type) {
    if (!tg || !DB.settings.haptics || !tg.HapticFeedback) return;
    try {
      if (type === "success" || type === "error" || type === "warning") {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type || "light");
      }
    } catch (e) { /* ignore */ }
  }

  function applyTelegramTheme() {
    if (!tg || !DB.settings.useTelegramTheme || !tg.themeParams) return;
    var p = tg.themeParams;
    var root = document.documentElement.style;
    if (p.bg_color) root.setProperty("--bg", p.bg_color);
    if (p.secondary_bg_color) root.setProperty("--surface-sunken", p.secondary_bg_color);
    if (p.text_color) root.setProperty("--ink", p.text_color);
    if (p.hint_color) root.setProperty("--ink-muted", p.hint_color);
    if (p.button_color) root.setProperty("--emerald-600", p.button_color);
  }

  /* ------------------------------------------------------------------ *
   * 1. УТИЛИТЫ
   * ------------------------------------------------------------------ */
  var $ = function (id) { return document.getElementById(id); };
  var qs = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var qsa = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  var CURRENCY_SYMBOLS = { RUB: "₽", USD: "$", EUR: "€", CRYPTO: "₿" };

  function formatMoney(amount, currency) {
    currency = currency || (DB && DB.settings ? DB.settings.currency : "RUB");
    var symbol = CURRENCY_SYMBOLS[currency] || "";
    var n = Number(amount);
    if (!isFinite(n)) n = 0;
    var formatted = n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return symbol ? formatted + " " + symbol : formatted;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    var d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function todayStr() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
  }

  function monthKey(dateStr) { return (dateStr || "").slice(0, 7); }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  /* ------------------------------------------------------------------ *
   * 2. ХРАНИЛИЩЕ ДАННЫХ
   * ------------------------------------------------------------------ */
  var STORAGE_KEY = "financeProDB";

  function defaultDB() {
    return {
      version: 1,
      accounts: [],
      transactions: [],
      categories: [
        { id: uid(), name: "Продукты", type: "expense" },
        { id: uid(), name: "Транспорт", type: "expense" },
        { id: uid(), name: "Жильё и коммуналка", type: "expense" },
        { id: uid(), name: "Развлечения", type: "expense" },
        { id: uid(), name: "Здоровье", type: "expense" },
        { id: uid(), name: "Одежда", type: "expense" },
        { id: uid(), name: "Прочее", type: "expense" },
        { id: uid(), name: "Зарплата", type: "income" },
        { id: uid(), name: "Фриланс", type: "income" },
        { id: uid(), name: "Подарки", type: "income" },
        { id: uid(), name: "Прочее", type: "income" }
      ],
      sidejobs: [],
      investments: [],
      goals: [],
      settings: { currency: "RUB", theme: "light", haptics: false, useTelegramTheme: true }
    };
  }

  function loadDB() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultDB();
      var parsed = JSON.parse(raw);
      var base = defaultDB();
      return Object.assign(base, parsed, { settings: Object.assign(base.settings, parsed.settings || {}) });
    } catch (e) {
      console.error("Ошибка чтения хранилища:", e);
      return defaultDB();
    }
  }

  function saveDB() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
    } catch (e) {
      toast("Не удалось сохранить данные на устройстве", "error");
    }
  }

  var DB = loadDB();

  /* ------------------------------------------------------------------ *
   * 3. TOASTS
   * ------------------------------------------------------------------ */
  function toast(message, kind) {
    var container = $("toastContainer");
    if (!container) return;
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " toast--" + kind : "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .25s ease, transform .25s ease";
      el.style.opacity = "0";
      el.style.transform = "translateX(16px)";
      setTimeout(function () { el.remove(); }, 260);
    }, 2600);
  }

  /* ------------------------------------------------------------------ *
   * 4. НАВИГАЦИЯ / САЙДБАР
   * ------------------------------------------------------------------ */
  var PAGE_TITLES = {
    dashboard: "Главная",
    transactions: "Доходы и расходы",
    sidejobs: "Подработки",
    investments: "Инвестиции",
    savings: "Накопления",
    analytics: "Аналитика",
    calendar: "Календарь",
    reports: "Отчеты",
    settings: "Настройки"
  };

  function closeSidebar() {
    var sidebar = $("sidebar");
    var backdrop = $("sidebarBackdrop");
    if (sidebar) sidebar.classList.remove("sidebar--open");
    if (backdrop) backdrop.classList.remove("is-visible");
  }

  function openSidebar() {
    var sidebar = $("sidebar");
    var backdrop = $("sidebarBackdrop");
    if (sidebar) sidebar.classList.add("sidebar--open");
    if (backdrop) backdrop.classList.add("is-visible");
  }

  function showPage(pageId) {
    if (!$("page-" + pageId)) return;
    qsa(".page").forEach(function (p) { p.classList.remove("active"); });
    $("page-" + pageId).classList.add("active");
    qsa("[data-page]").forEach(function (l) {
      l.classList.toggle("active", l.getAttribute("data-page") === pageId);
    });
    var title = $("pageTitle");
    if (title && PAGE_TITLES[pageId]) title.textContent = PAGE_TITLES[pageId];
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    if (pageId === "dashboard") renderDashboard();
    if (pageId === "transactions") renderTransactionsPage();
    if (pageId === "sidejobs") renderSidejobsPage();
    if (pageId === "investments") renderInvestmentsPage();
    if (pageId === "savings") renderSavingsPage();
    if (pageId === "analytics") renderAnalyticsPage();
    if (pageId === "calendar") renderCalendarPage();
    if (pageId === "settings") renderSettingsPage();
  }

  function initNavigation() {
    qsa("[data-page], [data-page-link]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var pageId = link.getAttribute("data-page") || link.getAttribute("data-page-link");
        if (!pageId || !$("page-" + pageId)) return;
        e.preventDefault();
        showPage(pageId);
        haptic("light");
      });
    });

    var menuToggle = $("menuToggle");
    if (menuToggle) menuToggle.addEventListener("click", openSidebar);

    var sidebarClose = $("sidebarClose");
    if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);

    var backdrop = $("sidebarBackdrop");
    if (backdrop) backdrop.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeSidebar(); closeModal(); }
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. МОДАЛЬНЫЕ ОКНА
   * ------------------------------------------------------------------ */
  function openModal(id) {
    var overlay = $("modalOverlay");
    var modal = $(id);
    if (!overlay || !modal) return;
    overlay.removeAttribute("hidden");
    modal.removeAttribute("hidden");
  }

  function closeModal() {
    var overlay = $("modalOverlay");
    if (!overlay) return;
    overlay.setAttribute("hidden", "");
    qsa(".modal").forEach(function (m) { m.setAttribute("hidden", ""); });
  }

  function initModals() {
    qsa("[data-close-modal]").forEach(function (btn) {
      btn.addEventListener("click", closeModal);
    });
    var overlay = $("modalOverlay");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeModal();
      });
    }
  }

  function confirmAction(title, text, onConfirm) {
    $("modalConfirmTitle").textContent = title;
    $("modalConfirmText").textContent = text;
    var btn = $("modalConfirmActionBtn");
    var freshBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(freshBtn, btn);
    freshBtn.addEventListener("click", function () {
      onConfirm();
      closeModal();
    });
    openModal("modalConfirm");
  }

  /* ------------------------------------------------------------------ *
   * 6. КАТЕГОРИИ
   * ------------------------------------------------------------------ */
  function categoriesByType(type) { return DB.categories.filter(function (c) { return c.type === type; }); }
  function categoryById(id) { return DB.categories.find(function (c) { return c.id === id; }); }

  function fillCategorySelect(select, type, selectedId) {
    if (!select) return;
    select.innerHTML = "";
    categoriesByType(type).forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id; opt.textContent = c.name;
      if (c.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function fillFilterCategorySelect() {
    var select = $("filterCategory");
    if (!select) return;
    var current = select.value;
    select.innerHTML = '<option value="all">Все категории</option>';
    DB.categories.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name + (c.type === "income" ? " (доход)" : " (расход)");
      select.appendChild(opt);
    });
    select.value = current || "all";
  }

  function renderCategoriesList() {
    var list = $("categoriesList");
    if (!list) return;
    list.innerHTML = "";
    if (!DB.categories.length) {
      list.innerHTML = '<li class="empty-state" style="grid-column:auto;">Категорий пока нет</li>';
      return;
    }
    DB.categories.forEach(function (c) {
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="category-tag category-tag--' + c.type + '">' + escapeHtml(c.name) + "</span>" +
        '<div class="item-actions"><button type="button" class="item-actions__delete" data-del-cat="' + c.id + '" aria-label="Удалить"><span data-icon="trash"></span></button></div>';
      list.appendChild(li);
    });
    qsa("[data-del-cat]", list).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-del-cat");
        var used = DB.transactions.some(function (t) { return t.categoryId === id; });
        confirmAction(
          "Удалить категорию?",
          used ? "Категория используется в операциях. Они останутся с сохранённым названием категории." : "Это действие нельзя отменить.",
          function () {
            DB.categories = DB.categories.filter(function (c) { return c.id !== id; });
            saveDB();
            renderCategoriesList();
            populateCategorySelects();
            toast("Категория удалена", "success");
          }
        );
      });
    });
  }

  function populateCategorySelects() {
    fillCategorySelect($("transactionCategory"), getTransactionType(), $("transactionCategory") ? $("transactionCategory").dataset.selected : null);
    fillFilterCategorySelect();
  }

  function initCategoriesModal() {
    var addBtn = $("addCategoryBtn");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        var nameInput = $("newCategoryName");
        var typeSelect = $("newCategoryType");
        var name = nameInput.value.trim();
        if (!name) { toast("Введите название категории", "error"); return; }
        DB.categories.push({ id: uid(), name: name, type: typeSelect.value });
        saveDB();
        nameInput.value = "";
        renderCategoriesList();
        populateCategorySelects();
        toast("Категория добавлена", "success");
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * 7. ОПЕРАЦИИ (ДОХОДЫ / РАСХОДЫ)
   * ------------------------------------------------------------------ */
  var editingTransactionId = null;

  function getTransactionType() {
    var active = qs('#transactionTypeSwitch .segmented-control__item.active');
    return active ? active.getAttribute("data-type") : "expense";
  }

  function setTransactionType(type) {
    qsa("#transactionTypeSwitch .segmented-control__item").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-type") === type);
    });
    fillCategorySelect($("transactionCategory"), type);
  }

  function openTransactionModal(transaction) {
    editingTransactionId = transaction ? transaction.id : null;
    $("modalTransactionTitle").textContent = transaction ? "Редактировать операцию" : "Новая операция";
    setTransactionType(transaction ? transaction.type : "expense");
    $("transactionAmount").value = transaction ? transaction.amount : "";
    fillCategorySelect($("transactionCategory"), transaction ? transaction.type : "expense", transaction ? transaction.categoryId : null);
    $("transactionSubcategory").value = transaction ? (transaction.subcategory || "") : "";
    $("transactionDate").value = transaction ? transaction.date : todayStr();
    $("transactionTime").value = transaction ? (transaction.time || "") : "";
    $("transactionPaymentMethod").value = transaction ? transaction.paymentMethod : "cash";
    $("transactionComment").value = transaction ? (transaction.comment || "") : "";
    openModal("modalTransaction");
  }

  function initTransactionForm() {
    qsa("#transactionTypeSwitch .segmented-control__item").forEach(function (btn) {
      btn.addEventListener("click", function () { setTransactionType(btn.getAttribute("data-type")); });
    });

    $("formTransaction").addEventListener("submit", function (e) {
      e.preventDefault();
      var amount = parseFloat($("transactionAmount").value);
      if (!amount || amount <= 0) { toast("Укажите сумму больше нуля", "error"); return; }
      var categoryId = $("transactionCategory").value;
      var category = categoryById(categoryId);
      var data = {
        type: getTransactionType(),
        amount: amount,
        categoryId: categoryId,
        categoryName: category ? category.name : "Без категории",
        subcategory: $("transactionSubcategory").value.trim(),
        date: $("transactionDate").value || todayStr(),
        time: $("transactionTime").value,
        paymentMethod: $("transactionPaymentMethod").value,
        comment: $("transactionComment").value.trim()
      };

      if (editingTransactionId) {
        var idx = DB.transactions.findIndex(function (t) { return t.id === editingTransactionId; });
        if (idx !== -1) DB.transactions[idx] = Object.assign(DB.transactions[idx], data);
        toast("Операция обновлена", "success");
      } else {
        data.id = uid();
        data.createdAt = Date.now();
        DB.transactions.push(data);
        toast("Операция добавлена", "success");
      }
      saveDB();
      closeModal();
      haptic("success");
      renderTransactionsPage();
      renderDashboard();
    });
  }

  function deleteTransaction(id) {
    confirmAction("Удалить операцию?", "Это действие нельзя отменить.", function () {
      DB.transactions = DB.transactions.filter(function (t) { return t.id !== id; });
      saveDB();
      renderTransactionsPage();
      renderDashboard();
      toast("Операция удалена", "success");
    });
  }

  function getFilteredTransactions() {
    var type = $("filterType") ? $("filterType").value : "all";
    var categoryId = $("filterCategory") ? $("filterCategory").value : "all";
    var search = $("filterSearch") ? $("filterSearch").value.trim().toLowerCase() : "";
    var from = $("filterDateFrom") ? $("filterDateFrom").value : "";
    var to = $("filterDateTo") ? $("filterDateTo").value : "";

    return DB.transactions
      .filter(function (t) {
        if (type !== "all" && t.type !== type) return false;
        if (categoryId !== "all" && t.categoryId !== categoryId) return false;
        if (from && t.date < from) return false;
        if (to && t.date > to) return false;
        if (search) {
          var haystack = (t.categoryName + " " + (t.subcategory || "") + " " + (t.comment || "")).toLowerCase();
          if (haystack.indexOf(search) === -1) return false;
        }
        return true;
      })
      .sort(function (a, b) { return (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")); });
  }

  function renderTransactionsTable() {
    var body = $("transactionsBody");
    if (!body) return;
    var rows = getFilteredTransactions();
    if (!rows.length) {
      body.innerHTML = '<tr class="table__empty-row"><td colspan="7">Операций пока нет — добавьте первую запись</td></tr>';
      return;
    }
    var pm = { cash: "Наличные", card: "Карта", transfer: "Перевод", other: "Другое" };
    body.innerHTML = rows.map(function (t) {
      return "<tr>" +
        "<td>" + formatDate(t.date) + (t.time ? " · " + t.time : "") + "</td>" +
        '<td><span class="category-tag category-tag--' + t.type + '">' + escapeHtml(t.categoryName) + "</span></td>" +
        "<td>" + escapeHtml(t.subcategory || "—") + "</td>" +
        "<td>" + escapeHtml(t.comment || "—") + "</td>" +
        "<td>" + (pm[t.paymentMethod] || "—") + "</td>" +
        '<td class="table__align-right amount--' + t.type + '">' + (t.type === "expense" ? "−" : "+") + formatMoney(t.amount) + "</td>" +
        '<td><div class="item-actions">' +
          '<button type="button" data-edit-tx="' + t.id + '" aria-label="Редактировать"><span data-icon="file-text"></span></button>' +
          '<button type="button" class="item-actions__delete" data-del-tx="' + t.id + '" aria-label="Удалить"><span data-icon="trash"></span></button>' +
        "</div></td>" +
        "</tr>";
    }).join("");

    qsa("[data-edit-tx]", body).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var t = DB.transactions.find(function (x) { return x.id === btn.getAttribute("data-edit-tx"); });
        if (t) openTransactionModal(t);
      });
    });
    qsa("[data-del-tx]", body).forEach(function (btn) {
      btn.addEventListener("click", function () { deleteTransaction(btn.getAttribute("data-del-tx")); });
    });
  }

  function renderTransactionsPage() {
    fillFilterCategorySelect();
    renderTransactionsTable();
  }

  function initTransactionsPageFilters() {
    ["filterType", "filterCategory", "filterSearch", "filterDateFrom", "filterDateTo"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", renderTransactionsTable);
      el.addEventListener("change", renderTransactionsTable);
    });
  }

  /* ------------------------------------------------------------------ *
   * 8. ПОДРАБОТКИ
   * ------------------------------------------------------------------ */
  var editingSidejobId = null;

  function sidejobAmount(job) { return (parseFloat(job.hours) || 0) * (parseFloat(job.rate) || 0); }

  function openSidejobModal(job) {
    editingSidejobId = job ? job.id : null;
    $("modalSidejobTitle").textContent = job ? "Редактировать подработку" : "Новая подработка";
    $("sidejobTitle").value = job ? job.title : "";
    $("sidejobClient").value = job ? (job.client || "") : "";
    $("sidejobCompany").value = job ? (job.company || "") : "";
    $("sidejobDate").value = job ? job.date : todayStr();
    $("sidejobTimeStart").value = job ? (job.timeStart || "") : "";
    $("sidejobTimeEnd").value = job ? (job.timeEnd || "") : "";
    $("sidejobHours").value = job ? job.hours : "";
    $("sidejobRate").value = job ? job.rate : "";
    $("sidejobStatus").value = job ? job.status : "pending";
    $("sidejobComment").value = job ? (job.comment || "") : "";
    openModal("modalSidejob");
  }

  function initSidejobForm() {
    $("formSidejob").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("sidejobTitle").value.trim();
      if (!title) { toast("Укажите название работы", "error"); return; }
      var data = {
        title: title,
        client: $("sidejobClient").value.trim(),
        company: $("sidejobCompany").value.trim(),
        date: $("sidejobDate").value || todayStr(),
        timeStart: $("sidejobTimeStart").value,
        timeEnd: $("sidejobTimeEnd").value,
        hours: parseFloat($("sidejobHours").value) || 0,
        rate: parseFloat($("sidejobRate").value) || 0,
        status: $("sidejobStatus").value,
        comment: $("sidejobComment").value.trim()
      };
      if (editingSidejobId) {
        var idx = DB.sidejobs.findIndex(function (j) { return j.id === editingSidejobId; });
        if (idx !== -1) DB.sidejobs[idx] = Object.assign(DB.sidejobs[idx], data);
        toast("Подработка обновлена", "success");
      } else {
        data.id = uid();
        DB.sidejobs.push(data);
        toast("Подработка добавлена", "success");
      }
      saveDB();
      closeModal();
      haptic("success");
      renderSidejobsPage();
      renderDashboard();
    });
  }

  function deleteSidejob(id) {
    confirmAction("Удалить подработку?", "Это действие нельзя отменить.", function () {
      DB.sidejobs = DB.sidejobs.filter(function (j) { return j.id !== id; });
      saveDB();
      renderSidejobsPage();
      renderDashboard();
      toast("Подработка удалена", "success");
    });
  }

  function renderSidejobsPage() {
    var statusFilter = $("sidejobsFilterStatus") ? $("sidejobsFilterStatus").value : "all";
    var jobs = DB.sidejobs
      .filter(function (j) { return statusFilter === "all" || j.status === statusFilter; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });

    var body = $("sidejobsBody");
    if (jobs.length) {
      body.innerHTML = jobs.map(function (j) {
        var amount = sidejobAmount(j);
        return "<tr>" +
          "<td>" + escapeHtml(j.title) + "</td>" +
          "<td>" + escapeHtml(j.client || j.company || "—") + "</td>" +
          "<td>" + formatDate(j.date) + "</td>" +
          "<td>" + (j.hours || 0) + "</td>" +
          "<td>" + formatMoney(j.rate) + "/ч</td>" +
          '<td class="table__align-right">' + formatMoney(amount) + "</td>" +
          '<td><span class="status-pill status-pill--' + j.status + '">' + (j.status === "paid" ? "Оплачено" : "Ожидает") + "</span></td>" +
          '<td><div class="item-actions">' +
            '<button type="button" data-edit-job="' + j.id + '" aria-label="Редактировать"><span data-icon="file-text"></span></button>' +
            '<button type="button" class="item-actions__delete" data-del-job="' + j.id + '" aria-label="Удалить"><span data-icon="trash"></span></button>' +
          "</div></td>" +
          "</tr>";
      }).join("");
      qsa("[data-edit-job]", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var j = DB.sidejobs.find(function (x) { return x.id === btn.getAttribute("data-edit-job"); });
          if (j) openSidejobModal(j);
        });
      });
      qsa("[data-del-job]", body).forEach(function (btn) {
        btn.addEventListener("click", function () { deleteSidejob(btn.getAttribute("data-del-job")); });
      });
    } else {
      body.innerHTML = '<tr class="table__empty-row"><td colspan="8">Подработок пока нет</td></tr>';
    }

    var allJobs = DB.sidejobs;
    var totalEarned = allJobs.reduce(function (s, j) { return s + sidejobAmount(j); }, 0);
    var totalHours = allJobs.reduce(function (s, j) { return s + (parseFloat(j.hours) || 0); }, 0);
    var avgRate = totalHours > 0 ? totalEarned / totalHours : 0;

    var byMonth = {};
    allJobs.forEach(function (j) {
      var k = monthKey(j.date);
      byMonth[k] = (byMonth[k] || 0) + sidejobAmount(j);
    });
    var bestMonth = "—";
    var bestVal = -1;
    Object.keys(byMonth).forEach(function (k) {
      if (byMonth[k] > bestVal) { bestVal = byMonth[k]; bestMonth = k; }
    });

    $("sidejobsTotalEarned").textContent = formatMoney(totalEarned);
    $("sidejobsTotalHours").textContent = totalHours.toLocaleString("ru-RU");
    $("sidejobsAvgRate").textContent = formatMoney(avgRate) + "/ч";
    $("sidejobsBestMonth").textContent = bestMonth === "—" ? "—" : formatMonthLabel(bestMonth);
  }

  function formatMonthLabel(key) {
    var parts = key.split("-");
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  }

  /* ------------------------------------------------------------------ *
   * 9. ИНВЕСТИЦИИ
   * ------------------------------------------------------------------ */
  var editingInvestmentId = null;

  function investmentRoi(inv) {
    var cost = parseFloat(inv.cost) || 0;
    var profit = parseFloat(inv.actualProfit) || 0;
    return cost > 0 ? (profit / cost) * 100 : 0;
  }
  function investmentIsPaidBack(inv) { return (parseFloat(inv.actualProfit) || 0) >= (parseFloat(inv.cost) || 0) && (parseFloat(inv.cost) || 0) > 0; }

  function openInvestmentModal(inv) {
    editingInvestmentId = inv ? inv.id : null;
    $("modalInvestmentTitle").textContent = inv ? "Редактировать инвестицию" : "Новая инвестиция";
    $("investmentName").value = inv ? inv.name : "";
    $("investmentCategory").value = inv ? (inv.category || "") : "";
    $("investmentCost").value = inv ? inv.cost : "";
    $("investmentDate").value = inv ? inv.date : todayStr();
    $("investmentExpectedProfit").value = inv ? (inv.expectedProfit || "") : "";
    $("investmentActualProfit").value = inv ? (inv.actualProfit || "") : "";
    openModal("modalInvestment");
  }

  function initInvestmentForm() {
    $("formInvestment").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("investmentName").value.trim();
      var cost = parseFloat($("investmentCost").value);
      if (!name || !cost) { toast("Укажите название и стоимость", "error"); return; }
      var data = {
        name: name,
        category: $("investmentCategory").value.trim(),
        cost: cost,
        date: $("investmentDate").value || todayStr(),
        expectedProfit: parseFloat($("investmentExpectedProfit").value) || 0,
        actualProfit: parseFloat($("investmentActualProfit").value) || 0
      };
      if (editingInvestmentId) {
        var idx = DB.investments.findIndex(function (i) { return i.id === editingInvestmentId; });
        if (idx !== -1) DB.investments[idx] = Object.assign(DB.investments[idx], data);
        toast("Инвестиция обновлена", "success");
      } else {
        data.id = uid();
        DB.investments.push(data);
        toast("Инвестиция добавлена", "success");
      }
      saveDB();
      closeModal();
      haptic("success");
      renderInvestmentsPage();
      renderDashboard();
    });
  }

  function deleteInvestment(id) {
    confirmAction("Удалить инвестицию?", "Это действие нельзя отменить.", function () {
      DB.investments = DB.investments.filter(function (i) { return i.id !== id; });
      saveDB();
      renderInvestmentsPage();
      renderDashboard();
      toast("Инвестиция удалена", "success");
    });
  }

  function renderInvestmentsPage() {
    var statusFilter = $("investmentsFilterStatus") ? $("investmentsFilterStatus").value : "all";
    var list = DB.investments.filter(function (inv) {
      if (statusFilter === "paid-back") return investmentIsPaidBack(inv);
      if (statusFilter === "in-progress") return !investmentIsPaidBack(inv);
      return true;
    }).sort(function (a, b) { return b.date.localeCompare(a.date); });

    var grid = $("investmentsGrid");
    var empty = $("investmentsEmptyState");
    grid.innerHTML = "";
    if (!list.length) {
      if (empty) { empty.hidden = false; grid.appendChild(empty); }
    } else {
      if (empty) empty.hidden = true;
      list.forEach(function (inv) {
        var roi = investmentRoi(inv);
        var paidBack = investmentIsPaidBack(inv);
        var card = document.createElement("article");
        card.className = "investment-card";
        card.innerHTML =
          '<div class="investment-card__top">' +
            '<div><div class="investment-card__name">' + escapeHtml(inv.name) + '</div>' +
            '<div class="investment-card__meta">' + escapeHtml(inv.category || "Без категории") + " · " + formatDate(inv.date) + '</div></div>' +
            '<span class="status-pill status-pill--' + (paidBack ? "paid" : "progress") + '">' + (paidBack ? "Окупилось" : "В процессе") + '</span>' +
          '</div>' +
          '<div class="investment-card__stats">' +
            '<div>Вложено<b>' + formatMoney(inv.cost) + '</b></div>' +
            '<div>Прибыль<b>' + formatMoney(inv.actualProfit || 0) + '</b></div>' +
            '<div>Ожидалось<b>' + formatMoney(inv.expectedProfit || 0) + '</b></div>' +
            '<div>ROI<b>' + roi.toFixed(1) + '%</b></div>' +
          '</div>' +
          '<div class="item-actions" style="margin-top:12px;">' +
            '<button type="button" data-edit-inv="' + inv.id + '" aria-label="Редактировать"><span data-icon="file-text"></span></button>' +
            '<button type="button" class="item-actions__delete" data-del-inv="' + inv.id + '" aria-label="Удалить"><span data-icon="trash"></span></button>' +
          '</div>';
        grid.appendChild(card);
      });
      qsa("[data-edit-inv]", grid).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var inv = DB.investments.find(function (x) { return x.id === btn.getAttribute("data-edit-inv"); });
          if (inv) openInvestmentModal(inv);
        });
      });
      qsa("[data-del-inv]", grid).forEach(function (btn) {
        btn.addEventListener("click", function () { deleteInvestment(btn.getAttribute("data-del-inv")); });
      });
    }

    var all = DB.investments;
    var totalInvested = all.reduce(function (s, i) { return s + (parseFloat(i.cost) || 0); }, 0);
    var totalProfit = all.reduce(function (s, i) { return s + (parseFloat(i.actualProfit) || 0); }, 0);
    var avgRoi = all.length ? all.reduce(function (s, i) { return s + investmentRoi(i); }, 0) / all.length : 0;
    var paidBackCount = all.filter(investmentIsPaidBack).length;

    $("investmentsTotalInvested").textContent = formatMoney(totalInvested);
    $("investmentsTotalProfit").textContent = formatMoney(totalProfit);
    $("investmentsAvgRoi").textContent = avgRoi.toFixed(1) + "%";
    $("investmentsPaidBackCount").textContent = String(paidBackCount);
  }

  /* ------------------------------------------------------------------ *
   * 10. НАКОПЛЕНИЯ: СЧЕТА И ЦЕЛИ
   * ------------------------------------------------------------------ */
  var editingAccountId = null;
  var editingGoalId = null;

  function openAccountModal(acc) {
    editingAccountId = acc ? acc.id : null;
    qs("#modalAccount .modal__title").textContent = acc ? "Редактировать счёт" : "Новый счёт";
    $("accountName").value = acc ? acc.name : "";
    $("accountBalance").value = acc ? acc.balance : "";
    $("accountCurrency").value = acc ? acc.currency : "RUB";
    openModal("modalAccount");
  }

  function initAccountForm() {
    $("formAccount").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("accountName").value.trim();
      if (!name) { toast("Укажите название счёта", "error"); return; }
      var data = {
        name: name,
        balance: parseFloat($("accountBalance").value) || 0,
        currency: $("accountCurrency").value
      };
      if (editingAccountId) {
        var idx = DB.accounts.findIndex(function (a) { return a.id === editingAccountId; });
        if (idx !== -1) DB.accounts[idx] = Object.assign(DB.accounts[idx], data);
        toast("Счёт обновлён", "success");
      } else {
        data.id = uid();
        DB.accounts.push(data);
        toast("Счёт добавлен", "success");
      }
      saveDB();
      closeModal();
      haptic("success");
      renderSavingsPage();
      renderDashboard();
    });
  }

  function deleteAccount(id) {
    confirmAction("Удалить счёт?", "Это действие нельзя отменить.", function () {
      DB.accounts = DB.accounts.filter(function (a) { return a.id !== id; });
      saveDB();
      renderSavingsPage();
      renderDashboard();
      toast("Счёт удалён", "success");
    });
  }

  function openGoalModal(goal) {
    editingGoalId = goal ? goal.id : null;
    qs("#modalGoal .modal__title").textContent = goal ? "Редактировать цель" : "Новая финансовая цель";
    $("goalName").value = goal ? goal.name : "";
    $("goalTargetAmount").value = goal ? goal.targetAmount : "";
    $("goalCurrentAmount").value = goal ? goal.currentAmount : "";
    $("goalDeadline").value = goal ? (goal.deadline || "") : "";
    openModal("modalGoal");
  }

  function initGoalForm() {
    $("formGoal").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("goalName").value.trim();
      var target = parseFloat($("goalTargetAmount").value);
      if (!name || !target) { toast("Укажите название и сумму цели", "error"); return; }
      var data = {
        name: name,
        targetAmount: target,
        currentAmount: parseFloat($("goalCurrentAmount").value) || 0,
        deadline: $("goalDeadline").value
      };
      if (editingGoalId) {
        var idx = DB.goals.findIndex(function (g) { return g.id === editingGoalId; });
        if (idx !== -1) DB.goals[idx] = Object.assign(DB.goals[idx], data);
        toast("Цель обновлена", "success");
      } else {
        data.id = uid();
        DB.goals.push(data);
        toast("Цель добавлена", "success");
      }
      saveDB();
      closeModal();
      haptic("success");
      renderSavingsPage();
    });
  }

  function deleteGoal(id) {
    confirmAction("Удалить цель?", "Это действие нельзя отменить.", function () {
      DB.goals = DB.goals.filter(function (g) { return g.id !== id; });
      saveDB();
      renderSavingsPage();
      toast("Цель удалена", "success");
    });
  }

  function renderSavingsPage() {
    var accGrid = $("accountsGrid");
    var accEmpty = $("accountsEmptyState");
    accGrid.innerHTML = "";
    if (!DB.accounts.length) {
      if (accEmpty) { accEmpty.hidden = false; accGrid.appendChild(accEmpty); }
    } else {
      if (accEmpty) accEmpty.hidden = true;
      DB.accounts.forEach(function (acc) {
        var card = document.createElement("article");
        card.className = "account-card";
        card.innerHTML =
          '<div class="account-card__top">' +
            '<div><div class="account-card__name">' + escapeHtml(acc.name) + '</div>' +
            '<div class="account-card__meta">' + (CURRENCY_SYMBOLS[acc.currency] || acc.currency) + '</div></div>' +
          '</div>' +
          '<div class="card__value card__value--small">' + formatMoney(acc.balance, acc.currency) + '</div>' +
          '<div class="item-actions" style="margin-top:12px;">' +
            '<button type="button" data-edit-acc="' + acc.id + '" aria-label="Редактировать"><span data-icon="file-text"></span></button>' +
            '<button type="button" class="item-actions__delete" data-del-acc="' + acc.id + '" aria-label="Удалить"><span data-icon="trash"></span></button>' +
          '</div>';
        accGrid.appendChild(card);
      });
      qsa("[data-edit-acc]", accGrid).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var acc = DB.accounts.find(function (a) { return a.id === btn.getAttribute("data-edit-acc"); });
          if (acc) openAccountModal(acc);
        });
      });
      qsa("[data-del-acc]", accGrid).forEach(function (btn) {
        btn.addEventListener("click", function () { deleteAccount(btn.getAttribute("data-del-acc")); });
      });
    }

    var goalGrid = $("goalsGrid");
    var goalEmpty = $("goalsEmptyState");
    goalGrid.innerHTML = "";
    if (!DB.goals.length) {
      if (goalEmpty) { goalEmpty.hidden = false; goalGrid.appendChild(goalEmpty); }
    } else {
      if (goalEmpty) goalEmpty.hidden = true;
      DB.goals.forEach(function (goal) {
        var pct = clamp((goal.currentAmount / goal.targetAmount) * 100 || 0, 0, 100);
        var card = document.createElement("article");
        card.className = "goal-card";
        card.innerHTML =
          '<div class="goal-card__top">' +
            '<div class="goal-card__name">' + escapeHtml(goal.name) + '</div>' +
            '<div class="item-actions">' +
              '<button type="button" data-edit-goal="' + goal.id + '" aria-label="Редактировать"><span data-icon="file-text"></span></button>' +
              '<button type="button" class="item-actions__delete" data-del-goal="' + goal.id + '" aria-label="Удалить"><span data-icon="trash"></span></button>' +
            '</div>' +
          '</div>' +
          '<div class="goal-card__progress-track"><div class="goal-card__progress-fill" style="width:' + pct.toFixed(0) + '%"></div></div>' +
          '<div class="goal-card__foot"><span>' + formatMoney(goal.currentAmount) + " / " + formatMoney(goal.targetAmount) + '</span><span>' + pct.toFixed(0) + '%</span></div>' +
          (goal.deadline ? '<div class="card__note" style="margin-top:8px;">До ' + formatDate(goal.deadline) + '</div>' : "");
        goalGrid.appendChild(card);
      });
      qsa("[data-edit-goal]", goalGrid).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var g = DB.goals.find(function (x) { return x.id === btn.getAttribute("data-edit-goal"); });
          if (g) openGoalModal(g);
        });
      });
      qsa("[data-del-goal]", goalGrid).forEach(function (btn) {
        btn.addEventListener("click", function () { deleteGoal(btn.getAttribute("data-del-goal")); });
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * 11. ДАШБОРД
   * ------------------------------------------------------------------ */
  function setRing(el, percent, color) {
    if (!el) return;
    percent = clamp(percent, 0, 100);
    el.style.background = "conic-gradient(" + color + " 0deg " + (percent * 3.6) + "deg, var(--border-soft) " + (percent * 3.6) + "deg 360deg)";
  }

  function drawSparkline(el, values, color) {
    if (!el) return;
    if (!values.length || values.every(function (v) { return v === 0; })) {
      el.innerHTML = "";
      return;
    }
    var w = el.clientWidth || 260, h = el.clientHeight || 46;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    var range = max - min || 1;
    var step = w / (values.length - 1 || 1);
    var points = values.map(function (v, i) {
      var x = i * step;
      var y = h - ((v - min) / range) * (h - 6) - 3;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    el.innerHTML =
      '<svg width="100%" height="100%" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none">' +
      '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>";
  }

  function computeTotals() {
    var monthPrefix = todayStr().slice(0, 7);
    var monthTx = DB.transactions.filter(function (t) { return monthKey(t.date) === monthPrefix; });
    var totalIncome = monthTx.filter(function (t) { return t.type === "income"; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var totalExpense = monthTx.filter(function (t) { return t.type === "expense"; }).reduce(function (s, t) { return s + t.amount; }, 0);

    var allIncome = DB.transactions.filter(function (t) { return t.type === "income"; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var allExpense = DB.transactions.filter(function (t) { return t.type === "expense"; }).reduce(function (s, t) { return s + t.amount; }, 0);

    var totalSavings = DB.accounts.reduce(function (s, a) { return s + (parseFloat(a.balance) || 0); }, 0);
    var totalInvested = DB.investments.reduce(function (s, i) { return s + (parseFloat(i.cost) || 0); }, 0);
    var totalInvestProfit = DB.investments.reduce(function (s, i) { return s + (parseFloat(i.actualProfit) || 0); }, 0);
    var sidejobsPaid = DB.sidejobs.filter(function (j) { return j.status === "paid"; }).reduce(function (s, j) { return s + sidejobAmount(j); }, 0);

    // Общий баланс = денежные счета + весь накопленный доход/расход по операциям
    // + оплаченные подработки − вложено в инвестиции + фактическая прибыль от них.
    var totalBalance = totalSavings + (allIncome - allExpense) + sidejobsPaid - totalInvested + totalInvestProfit;

    return {
      totalIncome: totalIncome, totalExpense: totalExpense,
      totalSavings: totalSavings, totalInvested: totalInvested,
      totalBalance: totalBalance, monthTx: monthTx
    };
  }

  function renderDashboard() {
    var t = computeTotals();
    var hasAnyData = DB.transactions.length || DB.accounts.length || DB.investments.length;

    $("totalBalance").textContent = formatMoney(t.totalBalance);
    $("totalIncome").textContent = formatMoney(t.totalIncome);
    $("totalExpense").textContent = formatMoney(t.totalExpense);
    $("totalSavings").textContent = formatMoney(t.totalSavings);
    $("totalInvestments").textContent = formatMoney(t.totalInvested);
    $("investmentTransfersTotal").textContent = formatMoney(t.totalInvested);

    var balanceHint = $("balanceHint");
    if (balanceHint) {
      balanceHint.textContent = hasAnyData ? (t.totalBalance >= 0 ? "В плюсе" : "В минусе") : "Мало данных";
      balanceHint.className = "card__hint " + (hasAnyData ? (t.totalBalance >= 0 ? "card__hint--good" : "card__hint--bad") : "");
    }

    // дельты по сравнению с прошлым месяцем
    var prevMonthDate = new Date(); prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    var prevKey = prevMonthDate.getFullYear() + "-" + String(prevMonthDate.getMonth() + 1).padStart(2, "0");
    var prevIncome = DB.transactions.filter(function (x) { return x.type === "income" && monthKey(x.date) === prevKey; }).reduce(function (s, x) { return s + x.amount; }, 0);
    var prevExpense = DB.transactions.filter(function (x) { return x.type === "expense" && monthKey(x.date) === prevKey; }).reduce(function (s, x) { return s + x.amount; }, 0);
    $("incomeDelta").textContent = deltaText(t.totalIncome, prevIncome);
    $("expenseDelta").textContent = deltaText(t.totalExpense, prevExpense, true);

    // финансовое здоровье
    var healthEl = $("healthScore");
    var healthHint = $("healthHint");
    var healthNote = $("healthNote");
    if (t.totalIncome > 0 || t.totalExpense > 0) {
      var savingsRate = t.totalIncome > 0 ? (t.totalIncome - t.totalExpense) / t.totalIncome : -1;
      var score = Math.round(clamp(60 + savingsRate * 60, 0, 100));
      healthEl.textContent = String(score);
      setRing($("healthRing"), score, score >= 70 ? "var(--income)" : score >= 40 ? "var(--gold-500)" : "var(--expense)");
      if (score >= 70) { healthHint.textContent = "Отлично"; healthHint.className = "card__hint card__hint--good"; healthNote.textContent = "Вы откладываете значительную часть дохода — так держать."; }
      else if (score >= 40) { healthHint.textContent = "Нормально"; healthHint.className = "card__hint card__hint--warn"; healthNote.textContent = "Расходы близки к доходам. Есть куда расти в накоплениях."; }
      else { healthHint.textContent = "Внимание"; healthHint.className = "card__hint card__hint--bad"; healthNote.textContent = "Расходы превышают доходы. Стоит пересмотреть бюджет."; }
    } else {
      healthEl.textContent = "0";
      setRing($("healthRing"), 0, "var(--border-strong)");
      healthHint.textContent = "Мало данных"; healthHint.className = "card__hint";
      healthNote.textContent = "Внесите первые данные, чтобы рассчитать показатели здоровья.";
    }

    // подушка безопасности
    var spentPercent = t.totalIncome > 0 ? clamp((t.totalExpense / t.totalIncome) * 100, 0, 100) : (t.totalExpense > 0 ? 100 : 0);
    setRing($("pillowRing"), 100 - spentPercent, "var(--gold-500)");
    $("pillowPercent").textContent = Math.round(100 - spentPercent) + "%";
    $("pillowNote").textContent = "Остаток от дохода · " + Math.round(spentPercent) + "% потрачено";
    $("pillowMonths").textContent = formatMoney(t.totalSavings);
    var avgMonthlyExpense = t.totalExpense > 0 ? t.totalExpense : (DB.transactions.filter(function (x) { return x.type === "expense"; }).reduce(function (s, x) { return s + x.amount; }, 0) / 3 || 0);
    var monthsCovered = avgMonthlyExpense > 0 ? (t.totalSavings / avgMonthlyExpense) : 0;
    $("pillowMonthsLabel").textContent = "Хватит на " + (monthsCovered ? monthsCovered.toFixed(1) : 0) + " мес. без дохода";

    // мини-спарклайн баланса (30 дней)
    drawSparkline($("balanceMiniChart"), lastNDaysCumulative(30), "var(--gold-500)");

    // последние операции
    var recentBody = $("recentTransactionsBody");
    var recent = DB.transactions.slice().sort(function (a, b) { return (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")); }).slice(0, 5);
    if (recent.length) {
      recentBody.innerHTML = recent.map(function (tx) {
        return "<tr>" +
          '<td><span class="category-tag category-tag--' + tx.type + '">' + escapeHtml(tx.categoryName) + "</span></td>" +
          "<td>" + escapeHtml(tx.comment || "—") + "</td>" +
          "<td>" + formatDate(tx.date) + "</td>" +
          '<td class="table__align-right amount--' + tx.type + '">' + (tx.type === "expense" ? "−" : "+") + formatMoney(tx.amount) + "</td>" +
          "</tr>";
      }).join("");
    } else {
      recentBody.innerHTML = '<tr class="table__empty-row"><td colspan="4">Пока нет операций</td></tr>';
    }

    renderBalanceHistoryChart(currentBalancePeriod);

    // сайдбар
    $("userCurrency").textContent = DB.settings.currency + " " + (CURRENCY_SYMBOLS[DB.settings.currency] || "");
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      $("userName").textContent = tg.initDataUnsafe.user.first_name || "Пользователь";
    }
  }

  function deltaText(current, prev, invert) {
    if (!prev) return current ? "Первые данные за месяц" : "Нет данных за прошлый месяц";
    var diff = ((current - prev) / prev) * 100;
    var good = invert ? diff <= 0 : diff >= 0;
    var arrow = diff >= 0 ? "↑" : "↓";
    return arrow + " " + Math.abs(diff).toFixed(1) + "% к прошлому месяцу";
  }

  function lastNDaysCumulative(n) {
    var days = [];
    var cursor = new Date();
    cursor.setDate(cursor.getDate() - (n - 1));
    var running = 0;
    var byDate = {};
    DB.transactions.forEach(function (t) {
      byDate[t.date] = byDate[t.date] || 0;
      byDate[t.date] += t.type === "income" ? t.amount : -t.amount;
    });
    // начальная точка отсчёта — накопленный эффект операций до начала окна
    for (var i = 0; i < n; i++) {
      var mm = String(cursor.getMonth() + 1).padStart(2, "0");
      var dd = String(cursor.getDate()).padStart(2, "0");
      var key = cursor.getFullYear() + "-" + mm + "-" + dd;
      running += byDate[key] || 0;
      days.push(running);
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  var currentBalancePeriod = "month";
  var balanceHistoryChart = null;

  function renderBalanceHistoryChart(period) {
    var container = $("chartBalanceHistory");
    if (!container || typeof Chart === "undefined") return;
    var days = period === "week" ? 7 : period === "year" ? 365 : 30;
    var values = lastNDaysCumulative(days);
    var hasData = DB.transactions.length > 0;
    if (!hasData) {
      if (balanceHistoryChart) { balanceHistoryChart.destroy(); balanceHistoryChart = null; }
      container.classList.remove("has-chart");
      container.innerHTML = '<p class="chart-placeholder">Недостаточно данных для графика</p>';
      return;
    }
    var labels = buildDayLabels(days, period);
    // для года агрегируем по месяцам, чтобы не рисовать 365 точек
    if (period === "year") {
      var agg = aggregateMonthly(12);
      labels = agg.labels; values = agg.balances;
    }
    container.classList.add("has-chart");
    if (!container.querySelector("canvas")) {
      container.innerHTML = '<canvas></canvas>';
    }
    var ctx = container.querySelector("canvas").getContext("2d");
    var cfg = {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Баланс",
          data: values,
          borderColor: "#1F6F54",
          backgroundColor: "rgba(31,111,84,0.08)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2
        }]
      },
      options: chartBaseOptions()
    };
    if (balanceHistoryChart) { balanceHistoryChart.data = cfg.data; balanceHistoryChart.update(); }
    else { balanceHistoryChart = new Chart(ctx, cfg); }
  }

  function buildDayLabels(n, period) {
    var labels = [];
    var cursor = new Date();
    cursor.setDate(cursor.getDate() - (n - 1));
    for (var i = 0; i < n; i++) {
      labels.push(cursor.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }));
      cursor.setDate(cursor.getDate() + 1);
    }
    return labels;
  }

  function aggregateMonthly(n) {
    var labels = [], balances = [];
    var running = 0;
    // сначала посчитаем эффект всех операций старше окна, чтобы баланс был кумулятивным
    var cursor = new Date();
    cursor.setMonth(cursor.getMonth() - (n - 1));
    cursor.setDate(1);
    var startKey = cursor.getFullYear() + "-" + String(cursor.getMonth() + 1).padStart(2, "0");
    DB.transactions.forEach(function (t) { if (monthKey(t.date) < startKey) running += t.type === "income" ? t.amount : -t.amount; });
    for (var i = 0; i < n; i++) {
      var key = cursor.getFullYear() + "-" + String(cursor.getMonth() + 1).padStart(2, "0");
      var net = DB.transactions.filter(function (t) { return monthKey(t.date) === key; })
        .reduce(function (s, t) { return s + (t.type === "income" ? t.amount : -t.amount); }, 0);
      running += net;
      labels.push(cursor.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }));
      balances.push(running);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { labels: labels, balances: balances };
  }

  function initDashboardPeriodSwitch() {
    qsa("#balancePeriodSwitch .period-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        qsa("#balancePeriodSwitch .period-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        currentBalancePeriod = btn.getAttribute("data-period");
        renderBalanceHistoryChart(currentBalancePeriod);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 12. АНАЛИТИКА
   * ------------------------------------------------------------------ */
  var analyticsCharts = {};
  var PALETTE = ["#1F6F54", "#C0A053", "#2F8F63", "#A6402C", "#5B6B64", "#8C6D26", "#14392D", "#B23B2A"];

  function chartBaseOptions(extra) {
    var base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#6B7A72", font: { family: "Manrope", size: 11 } } },
        y: { grid: { color: "#E8ECE8" }, ticks: { color: "#6B7A72", font: { family: "Manrope", size: 11 } } }
      }
    };
    return Object.assign(base, extra || {});
  }

  function periodRange() {
    var period = $("analyticsPeriod") ? $("analyticsPeriod").value : "month";
    var to = new Date();
    var from = new Date();
    if (period === "month") from.setMonth(from.getMonth() - 1);
    else if (period === "quarter") from.setMonth(from.getMonth() - 3);
    else if (period === "year") from.setFullYear(from.getFullYear() - 1);
    else from = new Date(2000, 0, 1);
    var fromStr = from.toISOString().slice(0, 10);
    var toStr = to.toISOString().slice(0, 10);
    return { from: fromStr, to: toStr };
  }

  function renderOrPlaceholder(containerId, hasData, drawFn) {
    var container = $(containerId);
    if (!container || typeof Chart === "undefined") return;
    if (!hasData) {
      if (analyticsCharts[containerId]) { analyticsCharts[containerId].destroy(); delete analyticsCharts[containerId]; }
      container.classList.remove("has-chart");
      container.innerHTML = '<p class="chart-placeholder">Недостаточно данных</p>';
      return;
    }
    container.classList.add("has-chart");
    if (!container.querySelector("canvas")) container.innerHTML = "<canvas></canvas>";
    var ctx = container.querySelector("canvas").getContext("2d");
    var cfg = drawFn();
    if (analyticsCharts[containerId]) { analyticsCharts[containerId].destroy(); }
    analyticsCharts[containerId] = new Chart(ctx, cfg);
  }

  function groupByDate(list, valueFn) {
    var map = {};
    list.forEach(function (item) { map[item.date] = (map[item.date] || 0) + valueFn(item); });
    var dates = Object.keys(map).sort();
    return { labels: dates.map(formatDate), values: dates.map(function (d) { return map[d]; }) };
  }

  function groupByCategory(list) {
    var map = {};
    list.forEach(function (t) { map[t.categoryName] = (map[t.categoryName] || 0) + t.amount; });
    return { labels: Object.keys(map), values: Object.values(map) };
  }

  function renderAnalyticsPage() {
    var range = periodRange();
    var tx = DB.transactions.filter(function (t) { return t.date >= range.from && t.date <= range.to; });
    var income = tx.filter(function (t) { return t.type === "income"; });
    var expense = tx.filter(function (t) { return t.type === "expense"; });

    renderOrPlaceholder("chartIncomeDynamics", income.length > 0, function () {
      var g = groupByDate(income, function (t) { return t.amount; });
      return { type: "line", data: { labels: g.labels, datasets: [{ data: g.values, borderColor: "#2F8F63", backgroundColor: "rgba(47,143,99,.1)", fill: true, tension: .35, pointRadius: 0, borderWidth: 2 }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartExpenseDynamics", expense.length > 0, function () {
      var g = groupByDate(expense, function (t) { return t.amount; });
      return { type: "line", data: { labels: g.labels, datasets: [{ data: g.values, borderColor: "#A6402C", backgroundColor: "rgba(166,64,44,.1)", fill: true, tension: .35, pointRadius: 0, borderWidth: 2 }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartBalanceChange", tx.length > 0, function () {
      var byDate = {};
      tx.forEach(function (t) { byDate[t.date] = (byDate[t.date] || 0) + (t.type === "income" ? t.amount : -t.amount); });
      var dates = Object.keys(byDate).sort();
      var running = 0;
      var values = dates.map(function (d) { running += byDate[d]; return running; });
      return { type: "line", data: { labels: dates.map(formatDate), datasets: [{ data: values, borderColor: "#1F6F54", backgroundColor: "rgba(31,111,84,.1)", fill: true, tension: .35, pointRadius: 0, borderWidth: 2 }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartCashFlow", tx.length > 0, function () {
      var byDate = {};
      tx.forEach(function (t) { byDate[t.date] = (byDate[t.date] || 0) + (t.type === "income" ? t.amount : -t.amount); });
      var dates = Object.keys(byDate).sort();
      var values = dates.map(function (d) { return byDate[d]; });
      return { type: "bar", data: { labels: dates.map(formatDate), datasets: [{ data: values, backgroundColor: values.map(function (v) { return v >= 0 ? "#2F8F63" : "#A6402C"; }) }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartExpenseByCategory", expense.length > 0, function () {
      var g = groupByCategory(expense);
      return { type: "doughnut", data: { labels: g.labels, datasets: [{ data: g.values, backgroundColor: PALETTE }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { font: { family: "Manrope", size: 10 }, color: "#3E5148" } } } } };
    });

    renderOrPlaceholder("chartIncomeDistribution", income.length > 0, function () {
      var g = groupByCategory(income);
      return { type: "doughnut", data: { labels: g.labels, datasets: [{ data: g.values, backgroundColor: PALETTE }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { font: { family: "Manrope", size: 10 }, color: "#3E5148" } } } } };
    });

    renderOrPlaceholder("chartAvgCheck", expense.length > 0, function () {
      var map = {}, counts = {};
      expense.forEach(function (t) { map[t.categoryName] = (map[t.categoryName] || 0) + t.amount; counts[t.categoryName] = (counts[t.categoryName] || 0) + 1; });
      var labels = Object.keys(map);
      var values = labels.map(function (l) { return map[l] / counts[l]; });
      return { type: "bar", data: { labels: labels, datasets: [{ data: values, backgroundColor: "#A6402C" }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartAvgIncomeExpense", tx.length > 0, function () {
      var avgIncome = income.length ? income.reduce(function (s, t) { return s + t.amount; }, 0) / income.length : 0;
      var avgExpense = expense.length ? expense.reduce(function (s, t) { return s + t.amount; }, 0) / expense.length : 0;
      return { type: "bar", data: { labels: ["Средний доход", "Средний расход"], datasets: [{ data: [avgIncome, avgExpense], backgroundColor: ["#2F8F63", "#A6402C"] }] }, options: chartBaseOptions() };
    });

    var monthlySeries = buildMonthlySeries(6);
    renderOrPlaceholder("chartPillowDynamics", monthlySeries.some(function (m) { return m.expense > 0; }), function () {
      var values = monthlySeries.map(function (m) {
        var savingsSoFar = DB.accounts.reduce(function (s, a) { return s + a.balance; }, 0);
        return m.expense > 0 ? savingsSoFar / m.expense : 0;
      });
      return { type: "line", data: { labels: monthlySeries.map(function (m) { return m.label; }), datasets: [{ data: values, borderColor: "#C0A053", backgroundColor: "rgba(192,160,83,.15)", fill: true, tension: .35, pointRadius: 2, borderWidth: 2 }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartInvestmentsDynamics", DB.investments.length > 0, function () {
      var sorted = DB.investments.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
      var running = 0;
      var values = sorted.map(function (i) { running += i.cost; return running; });
      return { type: "line", data: { labels: sorted.map(function (i) { return formatDate(i.date); }), datasets: [{ data: values, borderColor: "#1F6F54", backgroundColor: "rgba(31,111,84,.1)", fill: true, tension: .3, pointRadius: 2, borderWidth: 2 }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartSavingsDynamics", DB.accounts.length > 0, function () {
      return { type: "bar", data: { labels: DB.accounts.map(function (a) { return a.name; }), datasets: [{ data: DB.accounts.map(function (a) { return a.balance; }), backgroundColor: "#C0A053" }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartSidejobsProfit", DB.sidejobs.length > 0, function () {
      var byMonth = {};
      DB.sidejobs.forEach(function (j) { var k = monthKey(j.date); byMonth[k] = (byMonth[k] || 0) + sidejobAmount(j); });
      var keys = Object.keys(byMonth).sort();
      return { type: "bar", data: { labels: keys.map(formatMonthLabel), datasets: [{ data: keys.map(function (k) { return byMonth[k]; }), backgroundColor: "#1F6F54" }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartInvestmentEfficiency", DB.investments.length > 0, function () {
      return { type: "bar", data: { labels: DB.investments.map(function (i) { return i.name; }), datasets: [{ data: DB.investments.map(investmentRoi), backgroundColor: DB.investments.map(function (i) { return investmentRoi(i) >= 0 ? "#2F8F63" : "#A6402C"; }) }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartCalendarActivity", tx.length > 0, function () {
      var byWeekday = [0, 0, 0, 0, 0, 0, 0];
      tx.forEach(function (t) { byWeekday[new Date(t.date + "T00:00:00").getDay()]++; });
      var order = [1, 2, 3, 4, 5, 6, 0];
      var labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
      return { type: "bar", data: { labels: labels, datasets: [{ data: order.map(function (i) { return byWeekday[i]; }), backgroundColor: "#8C6D26" }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartMonthComparison", DB.transactions.length > 0, function () {
      var series = buildMonthlySeries(6);
      return { type: "bar", data: { labels: series.map(function (m) { return m.label; }), datasets: [
        { label: "Доход", data: series.map(function (m) { return m.income; }), backgroundColor: "#2F8F63" },
        { label: "Расход", data: series.map(function (m) { return m.expense; }), backgroundColor: "#A6402C" }
      ] }, options: chartBaseOptions({ plugins: { legend: { display: true, position: "bottom", labels: { font: { family: "Manrope", size: 11 }, color: "#3E5148" } } } }) };
    });

    renderOrPlaceholder("chartYearComparison", yearsCovered().length > 1, function () {
      var years = yearsCovered();
      var incomeByYear = years.map(function (y) { return DB.transactions.filter(function (t) { return t.type === "income" && t.date.slice(0, 4) === y; }).reduce(function (s, t) { return s + t.amount; }, 0); });
      var expenseByYear = years.map(function (y) { return DB.transactions.filter(function (t) { return t.type === "expense" && t.date.slice(0, 4) === y; }).reduce(function (s, t) { return s + t.amount; }, 0); });
      return { type: "bar", data: { labels: years, datasets: [
        { label: "Доход", data: incomeByYear, backgroundColor: "#2F8F63" },
        { label: "Расход", data: expenseByYear, backgroundColor: "#A6402C" }
      ] }, options: chartBaseOptions({ plugins: { legend: { display: true, position: "bottom", labels: { font: { family: "Manrope", size: 11 }, color: "#3E5148" } } } }) };
    });

    renderOrPlaceholder("chartBalanceForecast", DB.transactions.length >= 3, function () {
      var series = buildMonthlySeries(6);
      var avgNet = series.reduce(function (s, m) { return s + (m.income - m.expense); }, 0) / series.length;
      var currentBalance = computeTotals().totalBalance;
      var labels = series.map(function (m) { return m.label; });
      var values = series.map(function () { return null; });
      values[values.length - 1] = currentBalance;
      for (var i = 1; i <= 3; i++) {
        var d = new Date(); d.setMonth(d.getMonth() + i);
        labels.push(d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }));
        values.push(currentBalance + avgNet * i);
      }
      return { type: "line", data: { labels: labels, datasets: [{ data: values, borderColor: "#C0A053", borderDash: [6, 4], backgroundColor: "rgba(192,160,83,.1)", fill: true, tension: .3, pointRadius: 2, borderWidth: 2, spanGaps: true }] }, options: chartBaseOptions() };
    });

    renderOrPlaceholder("chartGoalsForecast", DB.goals.length > 0, function () {
      var avgMonthlyNet = buildMonthlySeries(3).reduce(function (s, m) { return s + (m.income - m.expense); }, 0) / 3;
      var labels = DB.goals.map(function (g) { return g.name; });
      var values = DB.goals.map(function (g) {
        var remaining = g.targetAmount - g.currentAmount;
        if (remaining <= 0) return 0;
        return avgMonthlyNet > 0 ? Math.ceil(remaining / avgMonthlyNet) : 0;
      });
      return { type: "bar", data: { labels: labels, datasets: [{ data: values, backgroundColor: "#1F6F54" }] }, options: Object.assign(chartBaseOptions(), { plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { return ctx.parsed.y + " мес."; } } } } }) };
    });
  }

  function buildMonthlySeries(n) {
    var result = [];
    var cursor = new Date();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() - (n - 1));
    for (var i = 0; i < n; i++) {
      var key = cursor.getFullYear() + "-" + String(cursor.getMonth() + 1).padStart(2, "0");
      var income = DB.transactions.filter(function (t) { return t.type === "income" && monthKey(t.date) === key; }).reduce(function (s, t) { return s + t.amount; }, 0);
      var expense = DB.transactions.filter(function (t) { return t.type === "expense" && monthKey(t.date) === key; }).reduce(function (s, t) { return s + t.amount; }, 0);
      result.push({ key: key, label: cursor.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }), income: income, expense: expense });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }

  function yearsCovered() {
    var set = {};
    DB.transactions.forEach(function (t) { set[t.date.slice(0, 4)] = true; });
    return Object.keys(set).sort();
  }

  /* ------------------------------------------------------------------ *
   * 13. КАЛЕНДАРЬ
   * ------------------------------------------------------------------ */
  var calendarDate = new Date();
  var selectedCalendarDay = null;

  function renderCalendarPage() {
    var grid = $("calendarGrid");
    var label = $("calendarMonthLabel");
    grid.innerHTML = "";
    label.textContent = calendarDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

    ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach(function (d) {
      var el = document.createElement("div");
      el.className = "calendar-grid__weekday";
      el.textContent = d;
      grid.appendChild(el);
    });

    var year = calendarDate.getFullYear(), month = calendarDate.getMonth();
    var firstDay = new Date(year, month, 1);
    var startOffset = (firstDay.getDay() + 6) % 7; // понедельник = 0
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayS = todayStr();

    var txByDate = {};
    DB.transactions.forEach(function (t) { (txByDate[t.date] = txByDate[t.date] || []).push(t); });

    for (var i = 0; i < startOffset; i++) {
      var empty = document.createElement("div");
      empty.className = "calendar-grid__day calendar-grid__day--empty";
      grid.appendChild(empty);
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var mm = String(month + 1).padStart(2, "0");
      var dd = String(d).padStart(2, "0");
      var dateKey = year + "-" + mm + "-" + dd;
      var cell = document.createElement("div");
      cell.className = "calendar-grid__day";
      if (dateKey === todayS) cell.classList.add("calendar-grid__day--today");
      if (dateKey === selectedCalendarDay) cell.classList.add("calendar-grid__day--active");
      if (txByDate[dateKey]) cell.classList.add("calendar-grid__day--has-data");
      cell.textContent = String(d);
      cell.addEventListener("click", function () {
        selectedCalendarDay = this.getAttribute("data-date");
        renderCalendarPage();
      });
      cell.setAttribute("data-date", dateKey);
      grid.appendChild(cell);
    }

    renderCalendarDayDetails(txByDate);
  }

  function renderCalendarDayDetails(txByDate) {
    var titleEl = $("calendarSelectedDate");
    var statsEl = $("calendarDayStats");
    var eventsEl = $("calendarDayEvents");
    if (!selectedCalendarDay) {
      titleEl.textContent = "Выберите день";
      statsEl.innerHTML = '<p class="empty-state">Нет данных за выбранный день</p>';
      eventsEl.innerHTML = "";
      return;
    }
    titleEl.textContent = formatDate(selectedCalendarDay);
    var dayTx = (txByDate[selectedCalendarDay] || []);
    if (!dayTx.length) {
      statsEl.innerHTML = '<p class="empty-state">Нет данных за выбранный день</p>';
      eventsEl.innerHTML = "";
      return;
    }
    var income = dayTx.filter(function (t) { return t.type === "income"; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var expense = dayTx.filter(function (t) { return t.type === "expense"; }).reduce(function (s, t) { return s + t.amount; }, 0);
    statsEl.innerHTML =
      '<div class="calendar-day-stats-row"><span>Доходы</span><span class="amount--income">+' + formatMoney(income) + '</span></div>' +
      '<div class="calendar-day-stats-row"><span>Расходы</span><span class="amount--expense">−' + formatMoney(expense) + '</span></div>';
    eventsEl.innerHTML = dayTx.map(function (t) {
      return "<li><span class=\"category-tag category-tag--" + t.type + "\">" + escapeHtml(t.categoryName) + "</span><span class=\"amount--" + t.type + "\">" + (t.type === "expense" ? "−" : "+") + formatMoney(t.amount) + "</span></li>";
    }).join("");
  }

  function initCalendarNav() {
    $("calendarPrevMonth").addEventListener("click", function () { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendarPage(); });
    $("calendarNextMonth").addEventListener("click", function () { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendarPage(); });
  }

  /* ------------------------------------------------------------------ *
   * 14. ОТЧЁТЫ
   * ------------------------------------------------------------------ */
  var lastReport = null;

  function buildReport() {
    var from = $("reportDateFrom").value || "2000-01-01";
    var to = $("reportDateTo").value || todayStr();
    var type = $("reportType").value;

    var tx = DB.transactions.filter(function (t) { return t.date >= from && t.date <= to; });
    if (type === "income") tx = tx.filter(function (t) { return t.type === "income"; });
    if (type === "expense") tx = tx.filter(function (t) { return t.type === "expense"; });

    var report = { from: from, to: to, type: type, rows: [], summary: {} };

    if (type === "investments") {
      var invs = DB.investments.filter(function (i) { return i.date >= from && i.date <= to; });
      report.rows = invs.map(function (i) { return { date: i.date, label: i.name, category: i.category, amount: i.cost, extra: formatMoney(i.actualProfit || 0) }; });
      report.summary = {
        "Всего вложено": formatMoney(invs.reduce(function (s, i) { return s + i.cost; }, 0)),
        "Фактическая прибыль": formatMoney(invs.reduce(function (s, i) { return s + (i.actualProfit || 0); }, 0)),
        "Кол-во": String(invs.length)
      };
    } else if (type === "sidejobs") {
      var jobs = DB.sidejobs.filter(function (j) { return j.date >= from && j.date <= to; });
      report.rows = jobs.map(function (j) { return { date: j.date, label: j.title, category: j.client || j.company || "", amount: sidejobAmount(j), extra: j.status === "paid" ? "Оплачено" : "Ожидает" }; });
      report.summary = {
        "Заработано": formatMoney(jobs.reduce(function (s, j) { return s + sidejobAmount(j); }, 0)),
        "Часов": String(jobs.reduce(function (s, j) { return s + (parseFloat(j.hours) || 0); }, 0)),
        "Кол-во": String(jobs.length)
      };
    } else {
      report.rows = tx.map(function (t) { return { date: t.date, label: t.categoryName, category: t.type === "income" ? "Доход" : "Расход", amount: t.amount, extra: t.comment || "" }; });
      var income = tx.filter(function (t) { return t.type === "income"; }).reduce(function (s, t) { return s + t.amount; }, 0);
      var expense = tx.filter(function (t) { return t.type === "expense"; }).reduce(function (s, t) { return s + t.amount; }, 0);
      report.summary = {
        "Доходы": formatMoney(income),
        "Расходы": formatMoney(expense),
        "Итого": formatMoney(income - expense),
        "Операций": String(tx.length)
      };
    }
    return report;
  }

  function renderReport() {
    lastReport = buildReport();
    var empty = $("reportEmptyState");
    var content = $("reportContent");
    if (!lastReport.rows.length) {
      empty.hidden = false; empty.textContent = "Нет данных за выбранный период";
      content.hidden = true;
      return;
    }
    empty.hidden = true;
    content.hidden = false;

    var summaryHtml = '<div class="report-summary">' + Object.keys(lastReport.summary).map(function (k) {
      return '<div class="report-summary__item"><div class="report-summary__label">' + k + '</div><div class="report-summary__value">' + lastReport.summary[k] + '</div></div>';
    }).join("") + '</div>';

    var tableHtml = '<table class="table"><thead><tr><th>Дата</th><th>Название</th><th>Категория</th><th class="table__align-right">Сумма</th><th>Прим.</th></tr></thead><tbody>' +
      lastReport.rows.map(function (r) {
        return "<tr><td>" + formatDate(r.date) + "</td><td>" + escapeHtml(r.label) + "</td><td>" + escapeHtml(r.category || "—") + '</td><td class="table__align-right">' + formatMoney(r.amount) + "</td><td>" + escapeHtml(r.extra || "—") + "</td></tr>";
      }).join("") + "</tbody></table>";

    content.innerHTML = summaryHtml + tableHtml;
  }

  function initReportsPage() {
    $("reportDateFrom").value = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10);
    $("reportDateTo").value = todayStr();
    $("generateReportBtn").addEventListener("click", function () { renderReport(); toast("Отчёт сформирован", "success"); });

    $("exportReportCsv").addEventListener("click", function () {
      if (!lastReport) { toast("Сначала сформируйте отчёт", "error"); return; }
      var lines = ["Дата;Название;Категория;Сумма;Примечание"];
      lastReport.rows.forEach(function (r) { lines.push([r.date, r.label, r.category || "", r.amount, (r.extra || "").replace(/;/g, ",")].join(";")); });
      downloadFile("report_" + todayStr() + ".csv", "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
    });

    $("exportReportJson").addEventListener("click", function () {
      if (!lastReport) { toast("Сначала сформируйте отчёт", "error"); return; }
      downloadFile("report_" + todayStr() + ".json", JSON.stringify(lastReport, null, 2), "application/json");
    });

    $("exportReportPdf").addEventListener("click", function () {
      if (!lastReport) { toast("Сначала сформируйте отчёт", "error"); return; }
      if (typeof window.jspdf === "undefined") { toast("Библиотека PDF не загрузилась", "error"); return; }
      var doc = new window.jspdf.jsPDF();
      doc.setFontSize(14);
      doc.text("Finance Pro — отчёт", 14, 16);
      doc.setFontSize(10);
      doc.text("Период: " + formatDate(lastReport.from) + " — " + formatDate(lastReport.to), 14, 24);
      var y = 34;
      Object.keys(lastReport.summary).forEach(function (k) {
        doc.text(k + ": " + lastReport.summary[k], 14, y);
        y += 6;
      });
      y += 4;
      doc.setFontSize(9);
      lastReport.rows.slice(0, 40).forEach(function (r) {
        var line = formatDate(r.date) + "  " + r.label + "  " + formatMoney(r.amount);
        doc.text(line, 14, y);
        y += 5;
        if (y > 280) { doc.addPage(); y = 20; }
      });
      doc.save("report_" + todayStr() + ".pdf");
      toast("PDF сохранён", "success");
    });
  }

  /* ------------------------------------------------------------------ *
   * 15. НАСТРОЙКИ
   * ------------------------------------------------------------------ */
  function renderSettingsPage() {
    $("settingsCurrency").value = DB.settings.currency;
    $("settingsTheme").value = DB.settings.theme;
    $("settingsTelegramHaptics").checked = !!DB.settings.haptics;
    $("settingsTelegramTheme").checked = !!DB.settings.useTelegramTheme;
  }

  function initSettingsPage() {
    $("settingsCurrency").addEventListener("change", function () {
      DB.settings.currency = this.value;
      saveDB();
      renderAll();
      toast("Валюта обновлена", "success");
    });
    $("settingsTelegramHaptics").addEventListener("change", function () {
      DB.settings.haptics = this.checked; saveDB();
    });
    $("settingsTelegramTheme").addEventListener("change", function () {
      DB.settings.useTelegramTheme = this.checked; saveDB();
      if (this.checked) applyTelegramTheme();
    });

    $("exportBackupBtn").addEventListener("click", function () {
      downloadFile("finance-pro-backup-" + todayStr() + ".json", JSON.stringify(DB, null, 2), "application/json");
      toast("Резервная копия сохранена", "success");
    });

    $("importDataBtn").addEventListener("click", function () { $("importFileInput").click(); });
    $("importFileInput").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          confirmAction("Импортировать данные?", "Текущие данные на устройстве будут заменены содержимым файла.", function () {
            DB = Object.assign(defaultDB(), parsed, { settings: Object.assign(defaultDB().settings, parsed.settings || {}) });
            saveDB();
            renderAll();
            toast("Данные импортированы", "success");
          });
        } catch (err) {
          toast("Файл повреждён или имеет неверный формат", "error");
        }
        $("importFileInput").value = "";
      };
      reader.readAsText(file);
    });

    $("clearAllDataBtn").addEventListener("click", function () {
      confirmAction("Удалить все данные?", "Это действие необратимо и удалит все операции, счета, инвестиции и цели.", function () {
        DB = defaultDB();
        saveDB();
        renderAll();
        toast("Все данные удалены", "success");
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 16. ПОИСК / УВЕДОМЛЕНИЯ (топбар)
   * ------------------------------------------------------------------ */
  function initTopbar() {
    $("searchBtn").addEventListener("click", function () {
      showPage("transactions");
      setTimeout(function () { $("filterSearch").focus(); }, 150);
    });
    $("notificationsBtn").addEventListener("click", function () {
      toast("Новых уведомлений нет", "success");
    });
    $("addTransactionBtn").addEventListener("click", function () { openTransactionModal(null); });
    $("openAddTransactionModal").addEventListener("click", function () { openTransactionModal(null); });
    $("bottomAddBtn").addEventListener("click", function () { openTransactionModal(null); });
    $("openAddSidejobModal").addEventListener("click", function () { openSidejobModal(null); });
    $("openAddInvestmentModal").addEventListener("click", function () { openInvestmentModal(null); });
    $("openAddAccountModal").addEventListener("click", function () { openAccountModal(null); });
    $("openAddGoalModal").addEventListener("click", function () { openGoalModal(null); });
    $("manageCategoriesBtn").addEventListener("click", function () { renderCategoriesList(); openModal("modalCategories"); });
  }

  /* ------------------------------------------------------------------ *
   * 17. ИНИЦИАЛИЗАЦИЯ
   * ------------------------------------------------------------------ */
  function renderAll() {
    renderDashboard();
    renderTransactionsPage();
    renderSidejobsPage();
    renderInvestmentsPage();
    renderSavingsPage();
    renderCalendarPage();
    renderSettingsPage();
    var activePage = qs(".page.active");
    if (activePage && activePage.id === "page-analytics") renderAnalyticsPage();
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyTelegramTheme();
    initNavigation();
    initModals();
    initCategoriesModal();
    initTransactionForm();
    initTransactionsPageFilters();
    initSidejobForm();
    initInvestmentForm();
    initAccountForm();
    initGoalForm();
    initDashboardPeriodSwitch();
    initCalendarNav();
    initReportsPage();
    initSettingsPage();
    initTopbar();

    ["sidejobsFilterStatus"].forEach(function (id) { $(id) && $(id).addEventListener("change", renderSidejobsPage); });
    ["investmentsFilterStatus"].forEach(function (id) { $(id) && $(id).addEventListener("change", renderInvestmentsPage); });
    $("analyticsPeriod") && $("analyticsPeriod").addEventListener("change", renderAnalyticsPage);

    populateCategorySelects();
    renderCategoriesList();
    renderAll();
    showPage("dashboard");
  });
})();