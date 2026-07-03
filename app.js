/* ==========================================================================
   Finance Pro — основная логика приложения
   Хранит все данные в localStorage браузера/Telegram WebView.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'financeProData';

  var DEFAULT_STATE = {
    transactions: [],
    sidejobs: [],
    investments: [],
    accounts: [],
    goals: [],
    categories: {
      expense: ['Продукты', 'Транспорт', 'Жильё', 'Развлечения', 'Здоровье', 'Одежда', 'Другое'],
      income: ['Зарплата', 'Подработка', 'Инвестиции', 'Подарки', 'Другое']
    },
    settings: { currency: 'RUB' }
  };

  var state = loadState();

  /* ---------------------------------------------------------------------- */
  /* Хранилище                                                              */
  /* ---------------------------------------------------------------------- */

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return deepClone(DEFAULT_STATE);
      var parsed = JSON.parse(raw);
      // подстраховка на случай отсутствия каких-то полей в старых сохранениях
      return Object.assign(deepClone(DEFAULT_STATE), parsed, {
        categories: Object.assign(deepClone(DEFAULT_STATE.categories), parsed.categories || {}),
        settings: Object.assign(deepClone(DEFAULT_STATE.settings), parsed.settings || {})
      });
    } catch (e) {
      console.error('Не удалось прочитать сохранённые данные', e);
      return deepClone(DEFAULT_STATE);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Не удалось сохранить данные', e);
      toast('Не удалось сохранить данные на устройстве', 'error');
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------------------------------------------------------------- */
  /* Форматирование                                                         */
  /* ---------------------------------------------------------------------- */

  var CURRENCY_SYMBOLS = { RUB: '₽', USD: '$', EUR: '€', CRYPTO: '₿' };

  function formatMoney(amount, currency) {
    var symbol = CURRENCY_SYMBOLS[currency || state.settings.currency] || '₽';
    var value = Number(amount) || 0;
    var formatted = value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return formatted + ' ' + symbol;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function todayISO() {
    var d = new Date();
    var offset = d.getTimezoneOffset();
    d = new Date(d.getTime() - offset * 60000);
    return d.toISOString().slice(0, 10);
  }

  function isSameMonth(dateStr, ref) {
    var d = new Date(dateStr);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }

  /* ---------------------------------------------------------------------- */
  /* Toasts                                                                  */
  /* ---------------------------------------------------------------------- */

  function toast(message, kind) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind === 'error' ? ' toast--error' : '');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3200);
  }

  /* ---------------------------------------------------------------------- */
  /* Модальные окна                                                         */
  /* ---------------------------------------------------------------------- */

  function openModal(id) {
    var overlay = document.getElementById('modalOverlay');
    var modal = document.getElementById(id);
    if (!overlay || !modal) return;
    overlay.removeAttribute('hidden');
    modal.removeAttribute('hidden');
  }

  function closeAllModals() {
    var overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.setAttribute('hidden', '');
    document.querySelectorAll('.modal').forEach(function (m) { m.setAttribute('hidden', ''); });
  }

  var confirmCallback = null;
  function showConfirm(text, onConfirm, title) {
    document.getElementById('modalConfirmTitle').textContent = title || 'Подтвердите действие';
    document.getElementById('modalConfirmText').textContent = text;
    confirmCallback = onConfirm;
    openModal('modalConfirm');
  }

  /* ---------------------------------------------------------------------- */
  /* Боковое меню (открытие/закрытие)                                       */
  /* ---------------------------------------------------------------------- */

  function initSidebar() {
    var menuToggle = document.getElementById('menuToggle');
    var sidebar = document.getElementById('sidebar');
    var sidebarOverlay = document.getElementById('sidebarOverlay');
    var sidebarClose = document.getElementById('sidebarClose');

    function openSidebar() {
      if (!sidebar) return;
      sidebar.classList.add('sidebar--open');
      if (sidebarOverlay) sidebarOverlay.classList.add('sidebar-overlay--visible');
    }
    function closeSidebar() {
      if (!sidebar) return;
      sidebar.classList.remove('sidebar--open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('sidebar-overlay--visible');
    }

    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', function () {
        sidebar.classList.contains('sidebar--open') ? closeSidebar() : openSidebar();
      });
    }
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSidebar(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 960) closeSidebar(); });

    window.__closeSidebar = closeSidebar;
  }

  /* ---------------------------------------------------------------------- */
  /* Навигация между страницами                                             */
  /* ---------------------------------------------------------------------- */

  function initNavigation() {
    var titles = {
      dashboard: 'Главная',
      transactions: 'Доходы и расходы',
      sidejobs: 'Подработки',
      investments: 'Инвестиции',
      savings: 'Накопления',
      analytics: 'Аналитика',
      calendar: 'Календарь',
      reports: 'Отчеты',
      settings: 'Настройки'
    };
    var pageTitle = document.getElementById('pageTitle');

    function goToPage(pageId) {
      if (!document.getElementById('page-' + pageId)) return;
      document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
      document.getElementById('page-' + pageId).classList.add('active');
      document.querySelectorAll('[data-page]').forEach(function (l) {
        l.classList.toggle('active', l.getAttribute('data-page') === pageId);
      });
      if (pageTitle && titles[pageId]) pageTitle.textContent = titles[pageId];
      if (window.__closeSidebar) window.__closeSidebar();
    }

    document.querySelectorAll('[data-page]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var pageId = link.getAttribute('data-page');
        if (!pageId) return;
        e.preventDefault();
        goToPage(pageId);
      });
    });

    document.querySelectorAll('[data-page-link]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        goToPage(link.getAttribute('data-page-link'));
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Категории                                                              */
  /* ---------------------------------------------------------------------- */

  function allCategories() {
    return state.categories.expense.concat(state.categories.income);
  }

  function populateTransactionCategorySelect(type) {
    var select = document.getElementById('transactionCategory');
    if (!select) return;
    var list = state.categories[type] || [];
    select.innerHTML = list.map(function (c) { return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; }).join('');
  }

  function populateFilterCategorySelect() {
    var select = document.getElementById('filterCategory');
    if (!select) return;
    var current = select.value;
    var unique = Array.from(new Set(allCategories()));
    select.innerHTML = '<option value="all">Все категории</option>' +
      unique.map(function (c) { return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; }).join('');
    select.value = current || 'all';
  }

  function renderCategoriesList() {
    var list = document.getElementById('categoriesList');
    if (!list) return;
    var rows = [];
    ['expense', 'income'].forEach(function (type) {
      state.categories[type].forEach(function (name) {
        rows.push(
          '<li class="list__item" data-type="' + type + '" data-name="' + escapeHtml(name) + '">' +
          '<span>' + escapeHtml(name) + ' <span class="card__hint">(' + (type === 'expense' ? 'расход' : 'доход') + ')</span></span>' +
          '<button type="button" class="icon-btn" data-delete-category aria-label="Удалить"><span class="icon" data-icon="trash"></span></button>' +
          '</li>'
        );
      });
    });
    list.innerHTML = rows.join('') || '<li class="list__item">Категорий пока нет</li>';

    list.querySelectorAll('[data-delete-category]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var li = btn.closest('li');
        var type = li.getAttribute('data-type');
        var name = li.getAttribute('data-name');
        showConfirm('Удалить категорию «' + name + '»?', function () {
          state.categories[type] = state.categories[type].filter(function (c) { return c !== name; });
          saveState();
          renderCategoriesList();
          populateFilterCategorySelect();
          populateTransactionCategorySelect(getActiveTransactionType());
          toast('Категория удалена');
        });
      });
    });
  }

  function initCategories() {
    var addBtn = document.getElementById('addCategoryBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var nameInput = document.getElementById('newCategoryName');
        var typeSelect = document.getElementById('newCategoryType');
        var name = nameInput.value.trim();
        if (!name) { toast('Введите название категории', 'error'); return; }
        var type = typeSelect.value;
        if (state.categories[type].indexOf(name) !== -1) { toast('Такая категория уже есть', 'error'); return; }
        state.categories[type].push(name);
        saveState();
        nameInput.value = '';
        renderCategoriesList();
        populateFilterCategorySelect();
        populateTransactionCategorySelect(getActiveTransactionType());
        toast('Категория добавлена');
      });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Операции (доходы/расходы)                                              */
  /* ---------------------------------------------------------------------- */

  function getActiveTransactionType() {
    var active = document.querySelector('#transactionTypeSwitch .segmented-control__item.active');
    return active ? active.getAttribute('data-type') : 'expense';
  }

  function initTransactionForm() {
    var switchEl = document.getElementById('transactionTypeSwitch');
    if (switchEl) {
      switchEl.querySelectorAll('.segmented-control__item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          switchEl.querySelectorAll('.segmented-control__item').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          populateTransactionCategorySelect(btn.getAttribute('data-type'));
        });
      });
    }

    var form = document.getElementById('formTransaction');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var amount = parseFloat(document.getElementById('transactionAmount').value);
        if (!amount || amount <= 0) { toast('Укажите корректную сумму', 'error'); return; }

        var tx = {
          id: uid(),
          type: getActiveTransactionType(),
          amount: amount,
          category: document.getElementById('transactionCategory').value || 'Другое',
          subcategory: document.getElementById('transactionSubcategory').value.trim(),
          date: document.getElementById('transactionDate').value || todayISO(),
          time: document.getElementById('transactionTime').value,
          paymentMethod: document.getElementById('transactionPaymentMethod').value,
          comment: document.getElementById('transactionComment').value.trim()
        };

        state.transactions.push(tx);
        saveState();

        renderDashboard();
        renderTransactionsTable();
        populateFilterCategorySelect();
        closeAllModals();
        form.reset();
        document.getElementById('transactionDate').value = todayISO();
        toast(tx.type === 'income' ? 'Доход добавлен' : 'Расход добавлен');
        hapticFeedback('success');
      });
    }
  }

  function deleteTransaction(id) {
    showConfirm('Удалить операцию?', function () {
      state.transactions = state.transactions.filter(function (t) { return t.id !== id; });
      saveState();
      renderDashboard();
      renderTransactionsTable();
      toast('Операция удалена');
    });
  }

  function getFilteredTransactions() {
    var type = (document.getElementById('filterType') || {}).value || 'all';
    var category = (document.getElementById('filterCategory') || {}).value || 'all';
    var search = ((document.getElementById('filterSearch') || {}).value || '').toLowerCase().trim();
    var from = (document.getElementById('filterDateFrom') || {}).value;
    var to = (document.getElementById('filterDateTo') || {}).value;

    return state.transactions
      .filter(function (t) { return type === 'all' || t.type === type; })
      .filter(function (t) { return category === 'all' || t.category === category; })
      .filter(function (t) {
        if (!search) return true;
        return (t.category + ' ' + t.subcategory + ' ' + t.comment).toLowerCase().indexOf(search) !== -1;
      })
      .filter(function (t) { return !from || t.date >= from; })
      .filter(function (t) { return !to || t.date <= to; })
      .sort(function (a, b) { return (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')); });
  }

  function renderTransactionsTable() {
    var body = document.getElementById('transactionsBody');
    if (!body) return;
    var list = getFilteredTransactions();

    if (!list.length) {
      body.innerHTML = '<tr class="table__empty-row"><td colspan="7">Операций пока нет — добавьте первую запись</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (t) {
      var amountClass = t.type === 'income' ? 'amount-positive' : 'amount-negative';
      var sign = t.type === 'income' ? '+' : '−';
      return '<tr>' +
        '<td>' + formatDate(t.date) + '</td>' +
        '<td>' + escapeHtml(t.category) + '</td>' +
        '<td>' + escapeHtml(t.subcategory || '—') + '</td>' +
        '<td>' + escapeHtml(t.comment || '—') + '</td>' +
        '<td>' + paymentMethodLabel(t.paymentMethod) + '</td>' +
        '<td class="table__align-right ' + amountClass + '">' + sign + ' ' + formatMoney(t.amount) + '</td>' +
        '<td><button type="button" class="icon-btn" data-delete-tx="' + t.id + '" aria-label="Удалить"><span class="icon" data-icon="trash"></span></button></td>' +
        '</tr>';
    }).join('');

    body.querySelectorAll('[data-delete-tx]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteTransaction(btn.getAttribute('data-delete-tx')); });
    });
  }

  function paymentMethodLabel(v) {
    return { cash: 'Наличные', card: 'Карта', transfer: 'Перевод', other: 'Другое' }[v] || '—';
  }

  function initTransactionFilters() {
    ['filterType', 'filterCategory', 'filterSearch', 'filterDateFrom', 'filterDateTo'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', renderTransactionsTable);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Дашборд                                                                */
  /* ---------------------------------------------------------------------- */

  function renderDashboard() {
    var now = new Date();
    var monthTx = state.transactions.filter(function (t) { return isSameMonth(t.date, now); });
    var monthIncome = sum(monthTx.filter(function (t) { return t.type === 'income'; }), 'amount');
    var monthExpense = sum(monthTx.filter(function (t) { return t.type === 'expense'; }), 'amount');

    var allIncome = sum(state.transactions.filter(function (t) { return t.type === 'income'; }), 'amount');
    var allExpense = sum(state.transactions.filter(function (t) { return t.type === 'expense'; }), 'amount');
    var accountsBalance = sum(state.accounts, 'balance');
    var totalBalance = allIncome - allExpense + accountsBalance;

    var totalSavings = sum(state.goals, 'currentAmount');
    var totalInvestments = sum(state.investments, 'cost');

    setText('totalBalance', formatMoney(totalBalance));
    setText('totalIncome', formatMoney(monthIncome));
    setText('totalExpense', formatMoney(monthExpense));
    setText('totalSavings', formatMoney(totalSavings));
    setText('totalInvestments', formatMoney(totalInvestments));

    setText('balanceHint', state.transactions.length ? 'Обновлено сейчас' : 'Мало данных');

    // Финансовая подушка: остаток от дохода за месяц
    var pillowPercent = monthIncome > 0 ? Math.max(0, Math.min(100, Math.round(((monthIncome - monthExpense) / monthIncome) * 100))) : 0;
    setText('pillowPercent', pillowPercent + '%');
    var pillowRing = document.getElementById('pillowRing');
    if (pillowRing) pillowRing.setAttribute('data-value', pillowPercent);
    setText('pillowNote', 'Остаток от дохода · ' + (monthIncome > 0 ? Math.round((monthExpense / monthIncome) * 100) : 0) + '% потрачено');
    var avgMonthlyExpense = monthExpense || (allExpense / Math.max(1, monthsWithData()));
    var pillowMonths = avgMonthlyExpense > 0 ? (totalBalance / avgMonthlyExpense) : 0;
    setText('pillowMonths', formatMoney(totalBalance));
    setText('pillowMonthsLabel', 'Хватит на ' + Math.max(0, Math.floor(pillowMonths)) + ' мес. без дохода');

    // Здоровье финансов — простая эвристика
    var health = 0;
    if (state.transactions.length) {
      var savingsRate = monthIncome > 0 ? (monthIncome - monthExpense) / monthIncome : 0;
      health = Math.max(0, Math.min(100, Math.round(50 + savingsRate * 50)));
    }
    setText('healthScore', health);
    var ring = document.getElementById('healthRing');
    if (ring) ring.setAttribute('data-value', health);
    setText('healthHint', state.transactions.length ? (health >= 60 ? 'Хорошо' : 'Требует внимания') : 'Мало данных');
    setText('healthNote', state.transactions.length
      ? 'Расчёт на основе доходов и расходов за текущий месяц.'
      : 'Внесите первые данные, чтобы рассчитать показатели здоровья.');

    renderRecentTransactions();
  }

  function monthsWithData() {
    var months = new Set(state.transactions.map(function (t) { return (t.date || '').slice(0, 7); }));
    return months.size || 1;
  }

  function renderRecentTransactions() {
    var body = document.getElementById('recentTransactionsBody');
    if (!body) return;
    var list = state.transactions
      .slice()
      .sort(function (a, b) { return (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')); })
      .slice(0, 5);

    if (!list.length) {
      body.innerHTML = '<tr class="table__empty-row"><td colspan="4">Пока нет операций</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (t) {
      var amountClass = t.type === 'income' ? 'amount-positive' : 'amount-negative';
      var sign = t.type === 'income' ? '+' : '−';
      return '<tr>' +
        '<td>' + escapeHtml(t.category) + '</td>' +
        '<td>' + escapeHtml(t.comment || '—') + '</td>' +
        '<td>' + formatDate(t.date) + '</td>' +
        '<td class="table__align-right ' + amountClass + '">' + sign + ' ' + formatMoney(t.amount) + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------------------------------------------------------------------- */
  /* Подработки                                                             */
  /* ---------------------------------------------------------------------- */

  function initSidejobForm() {
    var form = document.getElementById('formSidejob');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hours = parseFloat(document.getElementById('sidejobHours').value) || 0;
      var rate = parseFloat(document.getElementById('sidejobRate').value) || 0;
      var job = {
        id: uid(),
        title: document.getElementById('sidejobTitle').value.trim(),
        client: document.getElementById('sidejobClient').value.trim(),
        company: document.getElementById('sidejobCompany').value.trim(),
        date: document.getElementById('sidejobDate').value || todayISO(),
        timeStart: document.getElementById('sidejobTimeStart').value,
        timeEnd: document.getElementById('sidejobTimeEnd').value,
        hours: hours,
        rate: rate,
        amount: hours * rate,
        status: document.getElementById('sidejobStatus').value,
        comment: document.getElementById('sidejobComment').value.trim()
      };
      if (!job.title) { toast('Укажите название работы', 'error'); return; }

      state.sidejobs.push(job);
      saveState();
      renderSidejobs();
      closeAllModals();
      form.reset();
      document.getElementById('sidejobDate').value = todayISO();
      toast('Подработка добавлена');
    });
  }

  function renderSidejobs() {
    var body = document.getElementById('sidejobsBody');
    if (!body) return;

    var totalEarned = sum(state.sidejobs, 'amount');
    var totalHours = sum(state.sidejobs, 'hours');
    var avgRate = totalHours > 0 ? totalEarned / totalHours : 0;

    setText('sidejobsTotalEarned', formatMoney(totalEarned));
    setText('sidejobsTotalHours', totalHours);
    setText('sidejobsAvgRate', formatMoney(avgRate) + '/ч');

    var byMonth = {};
    state.sidejobs.forEach(function (j) {
      var key = (j.date || '').slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + j.amount;
    });
    var bestMonth = Object.keys(byMonth).sort(function (a, b) { return byMonth[b] - byMonth[a]; })[0];
    setText('sidejobsBestMonth', bestMonth ? formatMonthLabel(bestMonth) : '—');

    var statusFilter = (document.getElementById('sidejobsFilterStatus') || {}).value || 'all';
    var list = state.sidejobs
      .filter(function (j) { return statusFilter === 'all' || j.status === statusFilter; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });

    if (!list.length) {
      body.innerHTML = '<tr class="table__empty-row"><td colspan="8">Подработок пока нет</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (j) {
      var statusLabel = j.status === 'paid' ? 'Оплачено' : 'Ожидает оплаты';
      return '<tr>' +
        '<td>' + escapeHtml(j.title) + '</td>' +
        '<td>' + escapeHtml(j.client || j.company || '—') + '</td>' +
        '<td>' + formatDate(j.date) + '</td>' +
        '<td>' + j.hours + '</td>' +
        '<td>' + formatMoney(j.rate) + '</td>' +
        '<td class="table__align-right">' + formatMoney(j.amount) + '</td>' +
        '<td>' + statusLabel + '</td>' +
        '<td><button type="button" class="icon-btn" data-delete-job="' + j.id + '" aria-label="Удалить"><span class="icon" data-icon="trash"></span></button></td>' +
        '</tr>';
    }).join('');

    body.querySelectorAll('[data-delete-job]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete-job');
        showConfirm('Удалить запись о подработке?', function () {
          state.sidejobs = state.sidejobs.filter(function (j) { return j.id !== id; });
          saveState();
          renderSidejobs();
          toast('Запись удалена');
        });
      });
    });
  }

  function formatMonthLabel(key) {
    var parts = key.split('-');
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }

  function initSidejobFilters() {
    var el = document.getElementById('sidejobsFilterStatus');
    if (el) el.addEventListener('change', renderSidejobs);
  }

  /* ---------------------------------------------------------------------- */
  /* Инвестиции                                                             */
  /* ---------------------------------------------------------------------- */

  function initInvestmentForm() {
    var form = document.getElementById('formInvestment');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var inv = {
        id: uid(),
        name: document.getElementById('investmentName').value.trim(),
        category: document.getElementById('investmentCategory').value.trim(),
        cost: parseFloat(document.getElementById('investmentCost').value) || 0,
        date: document.getElementById('investmentDate').value || todayISO(),
        expectedProfit: parseFloat(document.getElementById('investmentExpectedProfit').value) || 0,
        actualProfit: parseFloat(document.getElementById('investmentActualProfit').value) || 0
      };
      if (!inv.name) { toast('Укажите название инвестиции', 'error'); return; }

      state.investments.push(inv);
      saveState();
      renderInvestments();
      renderDashboard();
      closeAllModals();
      form.reset();
      document.getElementById('investmentDate').value = todayISO();
      toast('Инвестиция добавлена');
    });
  }

  function renderInvestments() {
    var grid = document.getElementById('investmentsGrid');
    var empty = document.getElementById('investmentsEmptyState');
    if (!grid) return;

    var totalInvested = sum(state.investments, 'cost');
    var totalProfit = sum(state.investments, 'actualProfit');
    var avgRoi = state.investments.length
      ? Math.round(state.investments.reduce(function (acc, i) { return acc + (i.cost > 0 ? (i.actualProfit - i.cost) / i.cost * 100 : 0); }, 0) / state.investments.length)
      : 0;
    var paidBack = state.investments.filter(function (i) { return i.actualProfit >= i.cost && i.cost > 0; }).length;

    setText('investmentsTotalProfit', formatMoney(totalProfit));
    setText('investmentsAvgRoi', avgRoi + '%');
    setText('investmentsPaidBackCount', paidBack);
    setText('investmentTransfersTotal', formatMoney(totalInvested));

    var statusFilter = (document.getElementById('investmentsFilterStatus') || {}).value || 'all';
    var list = state.investments.filter(function (i) {
      if (statusFilter === 'all') return true;
      var isPaidBack = i.actualProfit >= i.cost && i.cost > 0;
      return statusFilter === 'paid-back' ? isPaidBack : !isPaidBack;
    });

    if (!list.length) {
      if (empty) empty.style.display = '';
      grid.querySelectorAll('.card--investment').forEach(function (c) { c.remove(); });
      return;
    }
    if (empty) empty.style.display = 'none';

    var cardsHtml = list.map(function (i) {
      var roi = i.cost > 0 ? Math.round((i.actualProfit - i.cost) / i.cost * 100) : 0;
      var statusLabel = (i.actualProfit >= i.cost && i.cost > 0) ? 'Окупилось' : 'В процессе';
      return '<article class="card card--investment">' +
        '<div class="card__header"><span class="card__label">' + escapeHtml(i.name) + '</span>' +
        '<button type="button" class="icon-btn" data-delete-investment="' + i.id + '" aria-label="Удалить"><span class="icon" data-icon="trash"></span></button></div>' +
        '<p class="card__note">' + escapeHtml(i.category || '—') + ' · ' + formatDate(i.date) + '</p>' +
        '<div class="card__value">' + formatMoney(i.cost) + '</div>' +
        '<p class="card__note">Ожидаемая прибыль: ' + formatMoney(i.expectedProfit) + '</p>' +
        '<p class="card__note">Фактическая прибыль: ' + formatMoney(i.actualProfit) + ' (ROI ' + roi + '%)</p>' +
        '<p class="card__note">' + statusLabel + '</p>' +
        '</article>';
    }).join('');

    grid.innerHTML = cardsHtml + (empty ? empty.outerHTML : '');
    grid.querySelectorAll('[data-delete-investment]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete-investment');
        showConfirm('Удалить инвестицию?', function () {
          state.investments = state.investments.filter(function (i) { return i.id !== id; });
          saveState();
          renderInvestments();
          renderDashboard();
          toast('Инвестиция удалена');
        });
      });
    });
  }

  function initInvestmentFilters() {
    var el = document.getElementById('investmentsFilterStatus');
    if (el) el.addEventListener('change', renderInvestments);
  }

  /* ---------------------------------------------------------------------- */
  /* Счета и цели (Накопления)                                              */
  /* ---------------------------------------------------------------------- */

  function initAccountForm() {
    var form = document.getElementById('formAccount');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var acc = {
        id: uid(),
        name: document.getElementById('accountName').value.trim(),
        balance: parseFloat(document.getElementById('accountBalance').value) || 0,
        currency: document.getElementById('accountCurrency').value
      };
      if (!acc.name) { toast('Укажите название счёта', 'error'); return; }

      state.accounts.push(acc);
      saveState();
      renderAccounts();
      renderDashboard();
      closeAllModals();
      form.reset();
      toast('Счёт добавлен');
    });
  }

  function renderAccounts() {
    var grid = document.getElementById('accountsGrid');
    var empty = document.getElementById('accountsEmptyState');
    if (!grid) return;

    if (!state.accounts.length) {
      if (empty) empty.style.display = '';
      grid.querySelectorAll('.card--account').forEach(function (c) { c.remove(); });
      return;
    }
    if (empty) empty.style.display = 'none';

    var cardsHtml = state.accounts.map(function (a) {
      return '<article class="card card--account">' +
        '<div class="card__header"><span class="card__label">' + escapeHtml(a.name) + '</span>' +
        '<button type="button" class="icon-btn" data-delete-account="' + a.id + '" aria-label="Удалить"><span class="icon" data-icon="trash"></span></button></div>' +
        '<div class="card__value">' + formatMoney(a.balance, a.currency) + '</div>' +
        '</article>';
    }).join('');

    grid.innerHTML = cardsHtml + (empty ? empty.outerHTML : '');
    grid.querySelectorAll('[data-delete-account]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete-account');
        showConfirm('Удалить счёт?', function () {
          state.accounts = state.accounts.filter(function (a) { return a.id !== id; });
          saveState();
          renderAccounts();
          renderDashboard();
          toast('Счёт удалён');
        });
      });
    });
  }

  function initGoalForm() {
    var form = document.getElementById('formGoal');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var goal = {
        id: uid(),
        name: document.getElementById('goalName').value.trim(),
        targetAmount: parseFloat(document.getElementById('goalTargetAmount').value) || 0,
        currentAmount: parseFloat(document.getElementById('goalCurrentAmount').value) || 0,
        deadline: document.getElementById('goalDeadline').value
      };
      if (!goal.name) { toast('Укажите название цели', 'error'); return; }

      state.goals.push(goal);
      saveState();
      renderGoals();
      renderDashboard();
      closeAllModals();
      form.reset();
      toast('Цель добавлена');
    });
  }

  function renderGoals() {
    var grid = document.getElementById('goalsGrid');
    var empty = document.getElementById('goalsEmptyState');
    if (!grid) return;

    if (!state.goals.length) {
      if (empty) empty.style.display = '';
      grid.querySelectorAll('.card--goal').forEach(function (c) { c.remove(); });
      return;
    }
    if (empty) empty.style.display = 'none';

    var cardsHtml = state.goals.map(function (g) {
      var percent = g.targetAmount > 0 ? Math.min(100, Math.round(g.currentAmount / g.targetAmount * 100)) : 0;
      return '<article class="card card--goal">' +
        '<div class="card__header"><span class="card__label">' + escapeHtml(g.name) + '</span>' +
        '<button type="button" class="icon-btn" data-delete-goal="' + g.id + '" aria-label="Удалить"><span class="icon" data-icon="trash"></span></button></div>' +
        '<div class="card__value">' + formatMoney(g.currentAmount) + ' / ' + formatMoney(g.targetAmount) + '</div>' +
        '<p class="card__note">Прогресс: ' + percent + '%' + (g.deadline ? ' · до ' + formatDate(g.deadline) : '') + '</p>' +
        '</article>';
    }).join('');

    grid.innerHTML = cardsHtml + (empty ? empty.outerHTML : '');
    grid.querySelectorAll('[data-delete-goal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete-goal');
        showConfirm('Удалить цель?', function () {
          state.goals = state.goals.filter(function (g) { return g.id !== id; });
          saveState();
          renderGoals();
          renderDashboard();
          toast('Цель удалена');
        });
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Настройки                                                              */
  /* ---------------------------------------------------------------------- */

  function initSettings() {
    var currencySelect = document.getElementById('settingsCurrency');
    if (currencySelect) {
      currencySelect.value = state.settings.currency;
      currencySelect.addEventListener('change', function () {
        state.settings.currency = currencySelect.value;
        saveState();
        var el = document.getElementById('userCurrency');
        if (el) el.textContent = state.settings.currency + ' ' + CURRENCY_SYMBOLS[state.settings.currency];
        renderDashboard();
        renderTransactionsTable();
        toast('Валюта изменена');
      });
      var userCurrencyEl = document.getElementById('userCurrency');
      if (userCurrencyEl) userCurrencyEl.textContent = state.settings.currency + ' ' + CURRENCY_SYMBOLS[state.settings.currency];
    }

    var exportBtn = document.getElementById('exportBackupBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'finance-pro-backup-' + todayISO() + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast('Резервная копия скачана');
      });
    }

    var importBtn = document.getElementById('importDataBtn');
    var importInput = document.getElementById('importFileInput');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', function () { importInput.click(); });
      importInput.addEventListener('change', function () {
        var file = importInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var parsed = JSON.parse(reader.result);
            state = Object.assign(deepClone(DEFAULT_STATE), parsed, {
              categories: Object.assign(deepClone(DEFAULT_STATE.categories), parsed.categories || {}),
              settings: Object.assign(deepClone(DEFAULT_STATE.settings), parsed.settings || {})
            });
            saveState();
            renderAll();
            toast('Данные импортированы');
          } catch (err) {
            toast('Файл повреждён или имеет неверный формат', 'error');
          }
        };
        reader.readAsText(file);
        importInput.value = '';
      });
    }

    var clearBtn = document.getElementById('clearAllDataBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        showConfirm('Все данные будут удалены безвозвратно. Продолжить?', function () {
          state = deepClone(DEFAULT_STATE);
          saveState();
          renderAll();
          toast('Все данные удалены');
        }, 'Удалить все данные');
      });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Открытие модалок с кнопок                                              */
  /* ---------------------------------------------------------------------- */

  function initModalTriggers() {
    document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', closeAllModals);
    });
    var overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeAllModals();
      });
    }

    bind('addTransactionBtn', 'click', function () {
      document.getElementById('transactionDate').value = todayISO();
      openModal('modalTransaction');
    });
    bind('openAddTransactionModal', 'click', function () {
      document.getElementById('transactionDate').value = todayISO();
      openModal('modalTransaction');
    });
    bind('bottomAddBtn', 'click', function () {
      document.getElementById('transactionDate').value = todayISO();
      openModal('modalTransaction');
    });
    bind('openAddSidejobModal', 'click', function () {
      document.getElementById('sidejobDate').value = todayISO();
      openModal('modalSidejob');
    });
    bind('openAddInvestmentModal', 'click', function () {
      document.getElementById('investmentDate').value = todayISO();
      openModal('modalInvestment');
    });
    bind('openAddAccountModal', 'click', function () { openModal('modalAccount'); });
    bind('openAddGoalModal', 'click', function () { openModal('modalGoal'); });
    bind('manageCategoriesBtn', 'click', function () { renderCategoriesList(); openModal('modalCategories'); });

    bind('modalConfirmActionBtn', 'click', function () {
      if (typeof confirmCallback === 'function') confirmCallback();
      confirmCallback = null;
      closeAllModals();
    });
  }

  function bind(id, event, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }

  /* ---------------------------------------------------------------------- */
  /* Вспомогательные                                                        */
  /* ---------------------------------------------------------------------- */

  function sum(arr, field) {
    return arr.reduce(function (acc, item) { return acc + (Number(item[field]) || 0); }, 0);
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function hapticFeedback(type) {
    try {
      var hapticsEnabled = document.getElementById('settingsTelegramHaptics');
      if (hapticsEnabled && hapticsEnabled.checked && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
      }
    } catch (e) { /* тихо игнорируем, если Telegram SDK недоступен */ }
  }

  function initTelegram() {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        var tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        var user = tg.initDataUnsafe && tg.initDataUnsafe.user;
        if (user) {
          var nameEl = document.getElementById('userName');
          var avatarEl = document.getElementById('userAvatar');
          if (nameEl) nameEl.textContent = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Пользователь';
          if (avatarEl) avatarEl.textContent = (user.first_name || 'U').charAt(0).toUpperCase();
        }
      }
    } catch (e) { /* приложение открыто вне Telegram — это нормально */ }
  }

  /* ---------------------------------------------------------------------- */
  /* Инициализация                                                          */
  /* ---------------------------------------------------------------------- */

  function renderAll() {
    populateTransactionCategorySelect(getActiveTransactionType());
    populateFilterCategorySelect();
    renderDashboard();
    renderTransactionsTable();
    renderSidejobs();
    renderInvestments();
    renderAccounts();
    renderGoals();
  }

  function init() {
    initTelegram();
    initSidebar();
    initNavigation();
    initModalTriggers();
    initCategories();
    initTransactionForm();
    initTransactionFilters();
    initSidejobForm();
    initSidejobFilters();
    initInvestmentForm();
    initInvestmentFilters();
    initAccountForm();
    initGoalForm();
    initSettings();

    document.getElementById('transactionDate') && (document.getElementById('transactionDate').value = todayISO());
    document.getElementById('sidejobDate') && (document.getElementById('sidejobDate').value = todayISO());
    document.getElementById('investmentDate') && (document.getElementById('investmentDate').value = todayISO());

    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
