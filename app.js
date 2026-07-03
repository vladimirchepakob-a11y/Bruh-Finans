/* =========================================================================
   Finance Pro — design system
   Palette: ledger green (growth) + rust clay (spend) + indigo (invest)
   Type: Fraunces (display/figures) + Inter (UI) + IBM Plex Mono (tabular data)
   ========================================================================= */

@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

:root{
  /* -- palette -- */
  --bg: #F4F6F1;
  --bg-soft: #ECEFE7;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --line: #DEE3D8;
  --line-soft: #E9ECE4;

  --ink: #1C2620;
  --ink-soft: #4B5750;
  --muted: #7B857D;

  --green: #2F6F4E;
  --green-soft: #E4EFE7;
  --green-deep: #1F4E37;

  --rust: #B5482F;
  --rust-soft: #F6E7E2;
  --rust-deep: #8C3620;

  --indigo: #3B5BA9;
  --indigo-soft: #E7EAF6;

  --gold: #B8862F;
  --gold-soft: #F6EEDD;

  --danger: #B5482F;
  --danger-soft: #F6E7E2;

  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;

  --shadow-sm: 0 1px 2px rgba(28,38,32,0.06), 0 1px 1px rgba(28,38,32,0.04);
  --shadow-md: 0 6px 20px rgba(28,38,32,0.08);
  --shadow-lg: 0 20px 48px rgba(28,38,32,0.14);

  --font-display: 'Fraunces', serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --sidebar-w: 248px;
  --topbar-h: 64px;
  --bottomnav-h: 64px;
}

/* -------------------------------------------------------------------- */
/* reset */
*, *::before, *::after{ box-sizing: border-box; }
html, body{ height: 100%; }
body{
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior-y: none;
}
h1,h2,h3,h4{ margin: 0; font-family: var(--font-display); font-weight: 600; color: var(--ink); }
p{ margin: 0; }
a{ color: inherit; text-decoration: none; }
ul{ list-style: none; margin: 0; padding: 0; }
button{ font-family: inherit; }
input, select, textarea, button{ font-size: 15px; }
::selection{ background: var(--green-soft); color: var(--green-deep); }

:focus-visible{
  outline: 2px solid var(--green);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce){
  *{ animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}

/* numerals everywhere get tabular figures */
.card__value, .table td, .card__delta, .badge, .chart-container, #recentTransactionsBody, #transactionsBody{
  font-variant-numeric: tabular-nums;
}

/* -------------------------------------------------------------------- */
/* app shell */
.app{
  display: flex;
  min-height: 100vh;
  width: 100%;
}

/* sidebar (desktop) */
.sidebar{
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  position: fixed;
  top: 0; bottom: 0; left: 0;
  z-index: 40;
  transition: transform .25s ease;
}
.sidebar__logo{
  display: flex; align-items: center; gap: 10px;
  padding: 6px 10px 22px;
}
.sidebar__logo-icon{
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--green);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-weight: 700; font-size: 15px;
  letter-spacing: 0.02em;
}
.sidebar__logo-text{
  font-family: var(--font-display); font-weight: 600; font-size: 18px; color: var(--ink);
}
.sidebar__nav{ display: flex; flex-direction: column; gap: 2px; flex: 1; overflow-y: auto; }
.nav-item{
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--ink-soft);
  font-weight: 500; font-size: 14px;
  transition: background .15s ease, color .15s ease;
}
.nav-item:hover{ background: var(--bg-soft); color: var(--ink); }
.nav-item.active{ background: var(--green-soft); color: var(--green-deep); }
.nav-item.active .nav-item__icon svg{ stroke: var(--green-deep); }
.nav-item__icon{ width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nav-item__icon svg{ width: 19px; height: 19px; stroke: var(--ink-soft); fill: none; stroke-width: 1.7; }
.nav-item.active .nav-item__icon svg{ stroke: var(--green-deep); }

.sidebar__footer{ padding-top: 14px; border-top: 1px solid var(--line-soft); }
.sidebar__user{ display: flex; align-items: center; gap: 10px; padding: 8px 10px; }
.sidebar__user-avatar{
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, var(--green), var(--indigo));
  flex-shrink: 0;
}
.sidebar__user-info{ display: flex; flex-direction: column; min-width: 0; }
.sidebar__user-name{ font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar__user-currency{ font-size: 12px; color: var(--muted); font-family: var(--font-mono); }

/* main column */
.main{
  flex: 1;
  margin-left: var(--sidebar-w);
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar{
  height: var(--topbar-h);
  display: flex; align-items: center; gap: 14px;
  padding: 0 24px;
  background: rgba(244,246,241,0.86);
  backdrop-filter: blur(10px);
  position: sticky; top: 0; z-index: 30;
  border-bottom: 1px solid var(--line);
}
.topbar__menu-btn{
  display: none;
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  align-items: center; justify-content: center;
  cursor: pointer;
}
.topbar__menu-btn .icon svg{ width: 18px; height: 18px; stroke: var(--ink); fill: none; stroke-width: 1.8; }
.topbar__title{ font-size: 19px; flex: 1; min-width: 0; }
.topbar__actions{ display: flex; align-items: center; gap: 8px; }
.topbar__btn{
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: var(--radius-sm);
  height: 38px;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0 14px;
  cursor: pointer;
  font-weight: 600; font-size: 13.5px;
  color: var(--ink-soft);
  position: relative;
  transition: background .15s ease, border-color .15s ease, transform .05s ease;
}
.topbar__btn:hover{ background: var(--bg-soft); }
.topbar__btn:active{ transform: scale(0.97); }
.topbar__btn--icon{ width: 38px; padding: 0; justify-content: center; }
.topbar__btn--icon .icon svg{ width: 18px; height: 18px; stroke: var(--ink-soft); fill: none; stroke-width: 1.8; }
.topbar__btn--primary{
  background: var(--green); border-color: var(--green); color: #fff;
}
.topbar__btn--primary:hover{ background: var(--green-deep); }
.topbar__btn--primary .icon svg{ stroke: #fff; width: 16px; height: 16px; stroke-width: 2.2; }

.badge{
  position: absolute; top: -4px; right: -4px;
  background: var(--rust); color: #fff;
  font-size: 10px; font-weight: 700;
  min-width: 16px; height: 16px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 4px; font-family: var(--font-mono);
}

.content{
  flex: 1;
  padding: 20px 24px 48px;
  max-width: 1360px;
  width: 100%;
}

.page{ display: none; animation: fadeIn .2s ease; }
.page.active{ display: block; }
@keyframes fadeIn{ from{ opacity: 0; transform: translateY(4px); } to{ opacity: 1; transform: none; } }

/* -------------------------------------------------------------------- */
/* cards & grids */
.cards-grid{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
.cards-grid--stats{ grid-template-columns: repeat(4, 1fr); }
.cards-grid--analytics{ grid-template-columns: repeat(2, 1fr); }

.card{
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
}
.card--wide{ grid-column: span 2; }

.card__header{
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 10px;
}
.card__label{ font-size: 12.5px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.card__hint{ font-size: 11.5px; font-family: var(--font-display); font-style: italic; color: var(--gold); background: var(--gold-soft); padding: 3px 9px; border-radius: 999px; }
.card__value{
  font-family: var(--font-display); font-weight: 600; font-size: 26px; color: var(--ink);
  letter-spacing: -0.01em;
}
.card__value--small{ font-size: 18px; }
.card__delta{ font-size: 12.5px; font-weight: 600; margin-top: 4px; color: var(--muted); font-family: var(--font-mono); }
.card__delta.positive{ color: var(--green); }
.card__delta.negative{ color: var(--rust); }
.card__note{ font-size: 12.5px; color: var(--muted); margin-top: 6px; }
.card__chart{ height: 44px; margin-top: 10px; }
.card__link{ font-size: 12.5px; font-weight: 600; color: var(--green); }

.card--income .card__value{ color: var(--green-deep); }
.card--expense .card__value{ color: var(--rust-deep); }
.card--investments .card__value{ color: var(--indigo); }

.card--health .card__header{ margin-bottom: 4px; }
.card__health-indicator{ display: flex; align-items: center; gap: 14px; margin-top: 6px; }
.card__health-note{ font-size: 12.5px; color: var(--muted); line-height: 1.4; }

.card--stat .card__value{ font-size: 21px; }

.dashboard-row{
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.card--chart .card__header{ flex-wrap: wrap; }
.card__period-switch{ display: flex; gap: 4px; background: var(--bg-soft); border-radius: 999px; padding: 3px; }
.period-btn{
  border: none; background: transparent; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--ink-soft);
  padding: 5px 12px; border-radius: 999px;
}
.period-btn.active{ background: var(--surface); color: var(--green-deep); box-shadow: var(--shadow-sm); }

.chart-container{ min-height: 180px; display: flex; align-items: center; justify-content: center; }
.chart-container svg{ width: 100%; height: auto; overflow: visible; }
.chart-placeholder{ color: var(--muted); font-size: 13px; font-style: italic; font-family: var(--font-display); }

/* ring chart */
.ring-chart{
  --pct: 0;
  width: 84px; height: 84px; border-radius: 50%;
  background: conic-gradient(var(--green) calc(var(--pct) * 1%), var(--line-soft) 0);
  display: flex; align-items: center; justify-content: center; flex-direction: column;
  position: relative; flex-shrink: 0;
}
.ring-chart::before{
  content: ''; position: absolute; inset: 8px; border-radius: 50%; background: var(--surface);
}
.ring-chart__value{ position: relative; font-family: var(--font-display); font-weight: 700; font-size: 20px; }
.ring-chart__max{ position: relative; font-size: 10px; color: var(--muted); }
.ring-chart--small{ width: 64px; height: 64px; margin-bottom: 10px; }
.ring-chart--small::before{ inset: 6px; }
.ring-chart--small .ring-chart__value{ font-size: 15px; }

.card--pillow{ display: flex; flex-direction: column; align-items: flex-start; }

/* -------------------------------------------------------------------- */
/* tables */
.table{ width: 100%; border-collapse: collapse; font-size: 13.5px; }
.table th{
  text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--muted); font-weight: 600; padding: 8px 10px; border-bottom: 1px solid var(--line);
}
.table td{ padding: 11px 10px; border-bottom: 1px solid var(--line-soft); color: var(--ink); }
.table tbody tr:hover{ background: var(--bg-soft); }
.table__align-right{ text-align: right; }
.table__empty-row td{ text-align: center; color: var(--muted); font-style: italic; font-family: var(--font-display); padding: 26px 10px; }
.amount{ font-family: var(--font-mono); font-weight: 600; }
.amount--income{ color: var(--green-deep); }
.amount--expense{ color: var(--rust-deep); }
.row-actions{ display: flex; gap: 6px; justify-content: flex-end; }
.icon-btn{
  width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--line);
  background: var(--surface); cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  color: var(--ink-soft);
}
.icon-btn:hover{ background: var(--bg-soft); }
.icon-btn svg{ width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.8; }
.tag{
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 999px;
  background: var(--bg-soft); color: var(--ink-soft);
}
.tag--paid{ background: var(--green-soft); color: var(--green-deep); }
.tag--pending{ background: var(--gold-soft); color: var(--gold); }

/* -------------------------------------------------------------------- */
/* toolbar / filters */
.page-toolbar{
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  flex-wrap: wrap; margin-bottom: 14px;
}
.page-toolbar__filters{ display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
.page-toolbar__actions{ display: flex; gap: 8px; }

.select, .input{
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  color: var(--ink);
  height: 38px;
}
.select:focus, .input:focus{ border-color: var(--green); }
textarea.input{ height: auto; resize: vertical; }

.btn{
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 9px 16px; height: 38px;
  font-weight: 600; font-size: 13.5px;
  cursor: pointer; color: var(--ink-soft);
  transition: background .15s ease, transform .05s ease;
  display: inline-flex; align-items: center; gap: 8px;
}
.btn:hover{ background: var(--bg-soft); }
.btn:active{ transform: scale(0.98); }
.btn--primary{ background: var(--green); border-color: var(--green); color: #fff; }
.btn--primary:hover{ background: var(--green-deep); }
.btn--secondary{ background: var(--surface); }
.btn--danger{ background: var(--rust); border-color: var(--rust); color: #fff; }
.btn--danger:hover{ background: var(--rust-deep); }

/* -------------------------------------------------------------------- */
/* section blocks (savings page) */
.section-block{ margin-bottom: 26px; }
.section-block__header{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-block__title{ font-size: 17px; }

.empty-state{
  grid-column: 1 / -1;
  text-align: center; padding: 34px 20px;
  color: var(--muted); font-style: italic; font-family: var(--font-display); font-size: 14px;
  border: 1px dashed var(--line); border-radius: var(--radius-md);
}

.account-card, .goal-card, .investment-card{
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md);
  padding: 16px; box-shadow: var(--shadow-sm);
}
.account-card__name, .goal-card__name, .investment-card__name{ font-weight: 600; font-size: 14.5px; margin-bottom: 6px; }
.account-card__balance{ font-family: var(--font-display); font-size: 21px; font-weight: 600; }
.account-card__currency{ font-size: 11.5px; color: var(--muted); font-family: var(--font-mono); }

.goal-card__progress{ height: 8px; border-radius: 999px; background: var(--bg-soft); margin: 10px 0 6px; overflow: hidden; }
.goal-card__progress-fill{ height: 100%; background: var(--green); border-radius: 999px; transition: width .3s ease; }
.goal-card__meta{ display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); font-family: var(--font-mono); }

.investment-card__row{ display: flex; justify-content: space-between; font-size: 12.5px; color: var(--ink-soft); margin-top: 4px; }
.investment-card__roi{ font-weight: 700; font-family: var(--font-mono); }
.investment-card__roi.positive{ color: var(--green-deep); }
.investment-card__roi.negative{ color: var(--rust-deep); }
.investment-card__status{ margin-top: 10px; }

/* -------------------------------------------------------------------- */
/* calendar */
.calendar-layout{ display: grid; grid-template-columns: 2fr 1fr; gap: 14px; align-items: start; }
.calendar-nav{ display: flex; align-items: center; gap: 12px; }
.calendar-nav__title{ font-family: var(--font-display); font-weight: 600; font-size: 15.5px; min-width: 150px; text-align: center; }
.calendar-grid{ display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-top: 10px; }
.calendar-weekday{ text-align: center; font-size: 11px; color: var(--muted); font-weight: 600; padding-bottom: 4px; }
.calendar-day{
  aspect-ratio: 1; border-radius: 10px; border: 1px solid var(--line-soft);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; font-size: 12.5px; gap: 2px; background: var(--surface);
  transition: background .15s ease;
}
.calendar-day:hover{ background: var(--bg-soft); }
.calendar-day.muted{ color: var(--line); border-color: transparent; cursor: default; }
.calendar-day.today{ border-color: var(--green); font-weight: 700; }
.calendar-day.selected{ background: var(--green-soft); border-color: var(--green); }
.calendar-day__dot{ display: flex; gap: 2px; }
.calendar-day__dot span{ width: 4px; height: 4px; border-radius: 50%; }
.calendar-day-stats{ display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.calendar-day-stats .stat-line{ display: flex; justify-content: space-between; font-size: 13px; }
.list{ display: flex; flex-direction: column; gap: 8px; }
.list li{
  display: flex; justify-content: space-between; gap: 8px;
  padding: 8px 10px; border-radius: 8px; background: var(--bg-soft); font-size: 13px;
}

/* -------------------------------------------------------------------- */
/* reports */
.form-row{ display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
.form-group{ display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 140px; }
.form-group label{ font-size: 12px; color: var(--muted); font-weight: 600; }
.report-export-actions{ display: flex; gap: 8px; }
#reportContent table{ margin-top: 10px; }
.report-summary{ display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 8px; }
.report-summary .stat{ background: var(--bg-soft); border-radius: var(--radius-sm); padding: 12px; }
.report-summary .stat__label{ font-size: 11.5px; color: var(--muted); text-transform: uppercase; }
.report-summary .stat__value{ font-family: var(--font-mono); font-weight: 700; font-size: 16px; margin-top: 4px; }

/* -------------------------------------------------------------------- */
/* settings */
.settings-actions{ display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.checkbox{ display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink-soft); }
.checkbox input{ width: 16px; height: 16px; accent-color: var(--green); }

/* -------------------------------------------------------------------- */
/* modals */
.modal-overlay{
  position: fixed; inset: 0; background: rgba(28,38,32,0.42);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 20px;
  backdrop-filter: blur(2px);
}
.modal-overlay[hidden]{ display: none; }
.modal{
  background: var(--surface); border-radius: var(--radius-lg);
  width: 100%; max-width: 480px; max-height: 88vh;
  display: flex; flex-direction: column;
  box-shadow: var(--shadow-lg);
  animation: modalIn .18s ease;
}
.modal--small{ max-width: 380px; }
@keyframes modalIn{ from{ opacity: 0; transform: translateY(10px) scale(0.98); } to{ opacity: 1; transform: none; } }
.modal[hidden]{ display: none; }
.modal__header{
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--line);
}
.modal__title{ font-size: 17px; }
.modal__close{
  width: 30px; height: 30px; border-radius: 8px; border: none; background: transparent;
  font-size: 20px; line-height: 1; cursor: pointer; color: var(--muted);
}
.modal__close:hover{ background: var(--bg-soft); }
.modal__body{ padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.modal__footer{ display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--line); }

.segmented-control{ display: flex; background: var(--bg-soft); border-radius: var(--radius-sm); padding: 4px; }
.segmented-control__item{
  flex: 1; border: none; background: transparent; padding: 9px; border-radius: 8px;
  font-weight: 600; font-size: 13.5px; cursor: pointer; color: var(--ink-soft);
}
.segmented-control__item.active{ background: var(--surface); box-shadow: var(--shadow-sm); }
.segmented-control__item[data-type="income"].active{ color: var(--green-deep); }
.segmented-control__item[data-type="expense"].active{ color: var(--rust-deep); }

#categoriesList li{ display: flex; align-items: center; justify-content: space-between; }
#categoriesList .tag{ font-weight: 500; }

/* -------------------------------------------------------------------- */
/* toasts */
.toast-container{
  position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; gap: 8px; z-index: 200;
  width: min(360px, calc(100vw - 32px));
}
.toast{
  background: var(--ink); color: #fff; padding: 11px 16px; border-radius: var(--radius-sm);
  font-size: 13.5px; font-weight: 500; box-shadow: var(--shadow-md);
  display: flex; align-items: center; gap: 8px;
  animation: toastIn .2s ease;
}
.toast--success{ background: var(--green-deep); }
.toast--error{ background: var(--rust-deep); }
@keyframes toastIn{ from{ opacity: 0; transform: translateY(8px); } to{ opacity: 1; transform: none; } }

/* -------------------------------------------------------------------- */
/* bottom nav (mobile) */
.bottom-nav{
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0;
  background: rgba(255,255,255,0.94);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
  padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
  align-items: center; justify-content: space-between;
  z-index: 50;
}
.bottom-nav__item{
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-size: 10.5px; color: var(--muted); font-weight: 600; flex: 1;
  padding: 4px 0;
}
.bottom-nav__item .icon svg{ width: 20px; height: 20px; stroke: var(--muted); fill: none; stroke-width: 1.8; }
.bottom-nav__item.active{ color: var(--green-deep); }
.bottom-nav__item.active .icon svg{ stroke: var(--green-deep); }
.bottom-nav__fab{
  width: 50px; height: 50px; border-radius: 50%;
  background: var(--green); border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px rgba(47,111,78,0.4);
  margin-top: -28px; cursor: pointer; flex-shrink: 0;
}
.bottom-nav__fab .icon svg{ width: 22px; height: 22px; stroke: #fff; stroke-width: 2.2; }

/* -------------------------------------------------------------------- */
/* responsive */
@media (max-width: 980px){
  .cards-grid{ grid-template-columns: repeat(2, 1fr); }
  .cards-grid--analytics{ grid-template-columns: 1fr; }
  .dashboard-row{ grid-template-columns: 1fr; }
  .card--wide{ grid-column: span 2; }
  .calendar-layout{ grid-template-columns: 1fr; }
}

@media (max-width: 760px){
  .sidebar{ transform: translateX(-100%); box-shadow: var(--shadow-lg); }
  .sidebar.sidebar--open{ transform: translateX(0); }
  .main{ margin-left: 0; }
  .topbar__menu-btn{ display: inline-flex; }
  .topbar{ padding: 0 14px; }
  .topbar__btn span:not(.icon){ display: none; }
  .topbar__btn--primary{ width: 38px; padding: 0; justify-content: center; }
  .content{ padding: 14px 14px calc(88px + env(safe-area-inset-bottom)); }
  .bottom-nav{ display: flex; }
  .cards-grid{ grid-template-columns: repeat(2, 1fr); }
  .card--wide{ grid-column: span 2; }
  .cards-grid--stats{ grid-template-columns: repeat(2, 1fr); }
  .page-toolbar__filters{ width: 100%; }
  .page-toolbar__filters .input, .page-toolbar__filters .select{ flex: 1; min-width: 120px; }
}

@media (max-width: 480px){
  .cards-grid, .cards-grid--stats{ grid-template-columns: 1fr 1fr; }
  .card--wide{ grid-column: span 2; }
  .card__value{ font-size: 21px; }
  .form-row{ flex-direction: column; align-items: stretch; }
  .report-summary{ grid-template-columns: 1fr 1fr; }
}

/* overlay used when sidebar open on mobile */
.sidebar-scrim{
  display: none;
  position: fixed; inset: 0; background: rgba(28,38,32,0.32); z-index: 39;
}
.sidebar-scrim.visible{ display: block; }