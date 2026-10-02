/*
 * Интерфейс демо: состояние, отрисовка трёх ролей, диалоги и «живой режим».
 * Правила распределения лежат в logic.js.
 */
(function () {
  'use strict';

  const L = window.OrchestratorLogic;
  if (!L) {
    console.error('Оркестратор: logic.js не загрузился, интерфейс не запущен');
    const main = document.querySelector('main');
    if (main) main.innerHTML = '<p class="lead">Не удалось загрузить логику демо. Обновите страницу.</p>';
    return;
  }
  const { SKILLS, LEVELS, STATUS, LOAD_WARN, DAY_MS, plural, v, short } = L;

  const STAGES = [
    { id: STATUS.POOL, name: 'Пул' },
    { id: STATUS.WORK, name: 'В работе' },
    { id: STATUS.REVIEW, name: 'На проверке' },
    { id: STATUS.DONE, name: 'Отправлено' }
  ];
  const STATUS_NAME = { pool: 'В пуле', work: 'В работе', review: 'На проверке', done: 'Отправлено заказчику' };
  const CLIENT_STEPS = ['Принят', 'В работе', 'Проверка', 'Готово'];
  const STEP_IDX = { pool: 0, work: 1, review: 2, done: 3 };
  const CLIENTS = ['Тау Кофе', 'Студия Прана', 'Дента Клиник', 'АлмаСтрой', 'Номад Тур', 'ЭкоМаркет'];
  const DEFAULT_MANAGER_NOTE = 'Всё по ТЗ, результат во вложении.';
  const DEFAULT_CLIENT = 'Без заказчика';
  const DEFAULT_BRIEF = 'Без ремарок.';
  const DEFAULT_CX = 2;
  const DEFAULT_DUE_DAYS = 3;
  const REWORK_PROGRESS = 60;
  const CLIENT_STEP_FILL = { pool: 15, review: 60 };
  const SUBMIT_NOTES = ['Готово, всё по ТЗ.', 'Исходники в папке задачи.', 'Сделано в двух вариантах, на выбор.', 'Готово, есть вопрос к заказчику по срокам, описание в файле.'];
  const INCOMING = [
    ['Сторис к открытию второй точки', 'Тау Кофе', 'design', 1, 2, '5 сторис 1080×1920. Ремарка: адрес и часы работы крупно.'],
    ['Интеграция онлайн-оплаты', 'Дента Клиник', 'dev', 4, 5, 'Оплата депозита при записи. Ремарка: чек должен уходить пациенту на почту.'],
    ['Статья в блог про имплантацию', 'Дента Клиник', 'text', 2, 4, '3–4 тыс. знаков простым языком, в конце блок частых вопросов.'],
    ['Перевод договора на английский', 'АлмаСтрой', 'trans', 3, 3, 'Договор подряда, 9 страниц. Термины сверить с прошлым переводом.'],
    ['Прайс-лист в PDF', 'Студия Прана', 'design', 2, 3, 'Абонементы и разовые занятия. Цвета из нового фирстиля.'],
    ['Дашборд по заявкам', 'АлмаСтрой', 'data', 4, 6, 'Заявки по источникам и менеджерам, обновление раз в день.'],
    ['Рассылка для клиентов', 'Номад Тур', 'text', 1, 2, 'Письмо про осенние туры: тема и два варианта заголовка.'],
    ['Мобильная вёрстка лендинга', 'Дента Клиник', 'dev', 3, 4, 'Адаптировать готовый лендинг под экраны от 360 px.'],
    ['Упаковка для дрип-пакетов', 'Тау Кофе', 'design', 3, 7, 'Развёртка пакета, 3 вкуса. Ремарка: место под стикер с датой обжарки.'],
    ['Починить форму обратной связи', 'Номад Тур', 'dev', 1, 1, 'С мобильных форма не отправляет письма. Найти причину и исправить.']
  ];
  const TICK_MS = 800;
  const INCOMING_CHANCE = 0.07;
  const LOG_MAX = 80;
  const LOG_SHOWN = 40;
  const SEED_LOG_SHOWN = 12;
  const DONE_SHOWN = 5;
  const TOAST_MAX = 3;
  const TOAST_MS = 5200;

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const today0 = () => { const x = new Date(); x.setHours(0, 0, 0, 0); return x; };
  const dayOff = (n) => new Date(today0().getTime() + n * DAY_MS);
  const ago = (min) => new Date(Date.now() - min * 60000);
  const hhmm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const isoDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const fmtWhen = (d) => sameDay(d, new Date()) ? hhmm(d) : pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ' ' + hhmm(d);
  const longDate = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const initials = (e) => e.name.split(' ').map((p) => p[0]).join('');

  function seed() {
    const execs = [
      { id: 'aig', name: 'Айгерим Сейтова', g: 'f', level: 'sr', skills: ['design'], tg: '@aigerim.demo', online: true },
      { id: 'ali', name: 'Алина Ким', g: 'f', level: 'md', skills: ['design'], tg: '@alina.demo', online: true },
      { id: 'dan', name: 'Данияр Ахметов', g: 'm', level: 'md', skills: ['dev'], tg: '@daniyar.demo', online: true },
      { id: 'erl', name: 'Ерлан Касымов', g: 'm', level: 'sr', skills: ['dev'], tg: '@erlan.demo', online: true },
      { id: 'mad', name: 'Мадина Нурланова', g: 'f', level: 'sr', skills: ['text', 'trans'], tg: '@madina.demo', online: true },
      { id: 'tim', name: 'Тимур Жумабаев', g: 'm', level: 'jr', skills: ['text'], tg: '@timur.demo', online: true },
      { id: 'ksu', name: 'Ксения Литвинова', g: 'f', level: 'md', skills: ['data'], tg: '@ksenia.demo', online: false }
    ];
    // название, заказчик, навык, сложность, срок (дней от сегодня), статус, исполнитель, прогресс, минут назад, ТЗ, комментарий исполнителя, ремарка менеджера
    const raw = [
      ['Логотип и фирменный стиль', 'Студия Прана', 'design', 4, 5, 'work', 'aig', 60, 300, 'Логотип, два варианта палитры и визитка. Ремарка: заказчик любит зелёный, но не «аптечный».'],
      ['Карточки товаров для маркетплейса, 30 шт.', 'ЭкоМаркет', 'design', 2, 3, 'work', 'ali', 30, 180, 'Фото товаров в общей папке. Шаблон карточки утверждён, меняются только тексты и фото.'],
      ['Лендинг клиники', 'Дента Клиник', 'dev', 4, 4, 'work', 'dan', 45, 420, 'Услуги, врачи, запись. Макет приложен. Ремарка: заявка должна уходить администратору в WhatsApp.'],
      ['Telegram-бот записи на занятия', 'Студия Прана', 'dev', 5, 2, 'work', 'erl', 70, 1440, 'Расписание из Google-таблицы, запись и отмена, напоминание за 2 часа.'],
      ['Доработка формы заявки в CRM', 'АлмаСтрой', 'dev', 4, 6, 'work', 'erl', 20, 240, 'Добавить поля «объект» и «бюджет», проверка телефона в формате +7.'],
      ['Тексты для сайта, 5 страниц', 'Дента Клиник', 'text', 3, 3, 'work', 'mad', 50, 360, 'Главная, услуги, о клинике, цены, контакты. Тон спокойный, без медицинского жаргона.'],
      ['Перевод презентации на казахский', 'Номад Тур', 'trans', 2, 1, 'work', 'mad', 80, 200, '18 слайдов. Названия туров не переводить.'],
      ['Посты для Instagram на неделю', 'Тау Кофе', 'text', 1, 2, 'work', 'tim', 40, 90, '7 постов, к каждому 3 варианта первой строки. Ремарка: упомянуть новую обжарку.'],
      ['Презентация для инвестора', 'Номад Тур', 'design', 3, 1, 'review', 'ali', 100, 500, '12 слайдов по готовому тексту. Ремарка: цифры крупно, фото туров из архива.', 'Сделала два варианта обложки, остальное по ТЗ.'],
      ['Описания туров, 12 шт.', 'Номад Тур', 'text', 2, 2, 'review', 'tim', 100, 400, 'По 600–800 знаков: маршрут, что включено, кому подойдёт.', 'Готово, в двух турах уточнил цены по прайсу.'],
      ['Меню для кофейни', 'Тау Кофе', 'design', 2, 0, 'done', 'aig', 100, 600, 'Формат А3, двустороннее. Цены из прайса от 1 октября.', 'Макеты для печати в папке.', 'Всё по ТЗ. Файлы для типографии во вложении.'],
      ['Отчёт по рекламе за сентябрь', 'АлмаСтрой', 'data', 3, -1, 'done', 'ksu', 100, 1600, 'Расход, заявки и цена заявки по каналам.', 'Выводы на последней странице.', 'Отчёт во вложении, главное на последней странице.'],
      ['Анализ продаж за квартал', 'АлмаСтрой', 'data', 3, 4, 'pool', null, 0, 120, 'Выгрузка из 1С в папке. Нужны топ-10 позиций и сезонность.'],
      ['Интернет-магазин на 40 товаров', 'ЭкоМаркет', 'dev', 5, 9, 'pool', null, 0, 60, 'Каталог, корзина, онлайн-оплата. Ремарка: заказчик хочет запуск до конца месяца.']
    ];
    const log = [];
    const tasks = raw.map((r, i) => {
      const [title, client, skill, cx, dueIn, status, exec, progress, mAgo, brief, submitNote = null, managerNote = null] = r;
      const created = ago(mAgo);
      const t = { id: 't' + (i + 1), title, client, skill, cx, due: dayOff(dueIn), status, exec, progress, brief, submitNote, managerNote, reason: null, created, history: [{ t: created, text: 'Создана менеджером, попала в пул' }] };
      if (exec) {
        const e = execs.find((x) => x.id === exec);
        const at = ago(mAgo - 1);
        t.history.push({ t: at, text: 'Оркестратор → ' + e.name });
        log.push({ t: at, kind: 'assign', text: '«' + title + '» → ' + short(e) });
        if (status === STATUS.REVIEW || status === STATUS.DONE) {
          t.submittedAt = ago(Math.round(mAgo / 3));
          t.history.push({ t: t.submittedAt, text: e.name + ' ' + v(e, 'сдал', 'сдала') + ' работу: ' + submitNote });
          log.push({ t: t.submittedAt, kind: 'submit', text: short(e) + ' ' + v(e, 'сдал', 'сдала') + ' «' + title + '»' });
        }
        if (status === STATUS.DONE) {
          t.doneAt = ago(Math.round(mAgo / 4));
          t.history.push({ t: t.doneAt, text: 'Проверено и отправлено заказчику' });
          log.push({ t: t.doneAt, kind: 'done', text: '«' + title + '» → заказчику ' + client });
        }
      }
      return t;
    });
    log.sort((a, b) => b.t - a.t);
    return { execs, tasks, log: log.slice(0, SEED_LOG_SHOWN), auto: true, inc: 0, seq: tasks.length };
  }

  let S = seed();
  let view = 'manager';
  let filterExec = null;
  let selExec = 'ali';
  let selClient = 'Номад Тур';
  let timer = null;
  let booting = false;
  let lastFocus = null;

  const ex = (id) => S.execs.find((e) => e.id === id);
  const task = (id) => S.tasks.find((t) => t.id === id);
  const cap = L.cap;
  const load = (e) => L.load(e, S.tasks);
  const pick = (t) => L.pick(t, S.execs, S.tasks);
  const estate = (e) => L.estate(e, S.tasks);
  const dueLabel = (d) => L.dueLabel(d, new Date());
  const clientList = () => [...new Set(CLIENTS.concat(S.tasks.map((t) => t.client)))];

  function log(kind, text, sub) {
    S.log.unshift({ t: new Date(), kind, text, sub });
    if (S.log.length > LOG_MAX) S.log.length = LOG_MAX;
  }
  function hist(t, text) { t.history.push({ t: new Date(), text }); }

  function toast(title, sub, kind) {
    if (booting) return;
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast k-' + (kind || 'assign');
    el.innerHTML = '<b>' + esc(title) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '');
    box.appendChild(el);
    while (box.children.length > TOAST_MAX) box.firstElementChild.remove();
    setTimeout(() => el.remove(), TOAST_MS);
  }

  function assign(t, e, why) {
    t.status = STATUS.WORK; t.exec = e.id; t.progress = 0; t.reason = null; t.assignedAt = new Date();
    hist(t, 'Оркестратор → ' + e.name + '. ' + why);
    hist(t, e.name + ': уведомление в Telegram ' + e.tg);
    log('assign', '«' + t.title + '» → ' + short(e), why);
    toast('«' + t.title + '» → ' + short(e), 'Загрузка ' + load(e) + '/' + cap(e) + ' · уведомление ушло в Telegram', 'assign');
  }

  // Разбор пула: сначала задачи с ближайшим сроком, при равном сроке более сложные
  function distribute(force) {
    if (!S.auto && !force) return 0;
    let n = 0;
    const pool = S.tasks.filter((t) => t.status === STATUS.POOL).sort((a, b) => a.due - b.due || b.cx - a.cx);
    for (const t of pool) {
      const r = pick(t);
      if (r.e) { assign(t, r.e, r.why); n++; }
      else if (t.reason !== r.why) { t.reason = r.why; log('wait', '«' + t.title + '» ждёт в пуле', r.why); }
    }
    return n;
  }

  function submit(t, note) {
    const e = ex(t.exec);
    t.status = STATUS.REVIEW; t.progress = 100; t.submitNote = note || null; t.submittedAt = new Date();
    hist(t, e.name + ' ' + v(e, 'сдал', 'сдала') + ' работу' + (note ? ': ' + note : ''));
    hist(t, 'Менеджеру ушло уведомление в Telegram');
    log('submit', short(e) + ' ' + v(e, 'сдал', 'сдала') + ' «' + t.title + '»', 'Ждёт проверки менеджера');
    toast(short(e) + ' ' + v(e, 'сдал', 'сдала') + ' «' + t.title + '»', 'Ждёт вашей проверки · уведомление ушло в Telegram', 'submit');
    distribute();
    if (e.online && load(e) === 0) log('info', short(e) + ' ' + v(e, 'свободен', 'свободна') + ', в очереди ожидания', 'Следующая подходящая задача придёт автоматически');
  }

  function accept(t, note) {
    t.status = STATUS.DONE; t.managerNote = note || DEFAULT_MANAGER_NOTE; t.doneAt = new Date();
    hist(t, 'Проверено и отправлено заказчику: ' + t.managerNote);
    log('done', '«' + t.title + '» → заказчику ' + t.client, t.managerNote);
    toast('Отправлено заказчику: ' + t.client, '«' + t.title + '»', 'done');
  }

  function rework(t, note) {
    const e = ex(t.exec);
    t.status = STATUS.WORK; t.progress = REWORK_PROGRESS; t.submitNote = null;
    hist(t, 'Возвращено на доработку' + (note ? ': ' + note : ''));
    log('rework', '«' + t.title + '» вернулась на доработку → ' + short(e), note || 'Без комментария');
    toast('«' + t.title + '» на доработке', short(e) + ' получит уведомление в Telegram', 'wait');
  }

  function toggleOnline(e) {
    e.online = !e.online;
    if (e.online) log('info', short(e) + ' ' + v(e, 'вышел', 'вышла') + ' на смену', 'Оркестратор проверяет пул');
    else log('info', short(e) + ' ' + v(e, 'ушёл', 'ушла') + ' со смены', 'Новые задачи не получает');
    distribute();
  }

  function createTask(o, fromClient) {
    const t = { id: 't' + (++S.seq), title: o.title, client: o.client, skill: o.skill, cx: o.cx, due: o.due, brief: o.brief, status: STATUS.POOL, exec: null, progress: 0, reason: null, submitNote: null, managerNote: null, created: new Date(), history: [] };
    hist(t, fromClient ? 'Пришла от заказчика, попала в пул' : 'Создана менеджером, попала в пул');
    S.tasks.push(t);
    log('new', 'Новая задача в пуле: «' + t.title + '»', t.client + ' · ' + SKILLS[t.skill] + ', сложность ' + t.cx);
    distribute();
    if (t.status === STATUS.POOL) toast('«' + t.title + '» ждёт в пуле', t.reason || 'Автораспределение выключено', 'wait');
  }

  function addIncoming() {
    const r = INCOMING[S.inc++ % INCOMING.length];
    createTask({ title: r[0], client: r[1], skill: r[2], cx: r[3], due: dayOff(r[4]), brief: r[5] }, true);
  }

  // ---------- отрисовка ----------
  const dots = (cx) => '<span class="cx" role="img" aria-label="Сложность ' + cx + ' из 5" title="Сложность ' + cx + ' из 5">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (i <= cx ? 'on' : '') + '"></i>').join('') + '</span>';
  const avatar = (e, size) => '<span class="av ' + (size || '') + '" aria-hidden="true">' + esc(initials(e)) + '</span>';
  function bar(l, c) {
    const r = c ? l / c : 0;
    const cls = r > 1 ? 'crit' : r >= LOAD_WARN ? 'warn' : '';
    return '<span class="bar ' + cls + '"><i style="width:' + Math.min(100, r * 100) + '%"></i></span>';
  }
  const progress = (t) => '<span class="prog"><span class="bar"><i data-prog="' + t.id + '" style="width:' + t.progress + '%"></i></span><span class="pct" data-progtxt="' + t.id + '">' + Math.round(t.progress) + '%</span></span>';

  function card(t) {
    const e = t.exec ? ex(t.exec) : null, d = dueLabel(t.due);
    let extra = '';
    if (t.status === STATUS.POOL) extra = '<span class="why">' + esc(t.reason || (S.auto ? 'Подбираем исполнителя' : 'Автораспределение выключено, ждёт решения менеджера')) + '</span>';
    if (t.status === STATUS.WORK) extra = progress(t);
    if (t.status === STATUS.REVIEW && t.submitNote) extra = '<span class="note">«' + esc(t.submitNote) + '»</span>';
    return '<button type="button" class="card' + (t.status === STATUS.POOL && t.reason ? ' waiting' : '') + '" data-act="open" data-id="' + t.id + '">' +
      '<span class="t">' + esc(t.title) + '</span>' +
      '<span class="c">' + esc(t.client) + '</span>' +
      '<span class="meta"><span class="tag">' + SKILLS[t.skill] + '</span>' + dots(t.cx) + '<span class="due ' + d.cls + '">' + d.txt + '</span></span>' +
      extra +
      (e ? '<span class="who">' + avatar(e, 'sm') + '<span>' + esc(short(e)) + '</span></span>' : '') +
      '</button>';
  }

  function renderManager() {
    const by = (s) => S.tasks.filter((t) => t.status === s);
    const pool = by(STATUS.POOL), work = by(STATUS.WORK), review = by(STATUS.REVIEW), done = by(STATUS.DONE);
    const waiting = pool.filter((t) => t.reason).length;
    const on = S.execs.filter((e) => e.online);
    const capSum = on.reduce((a, e) => a + cap(e), 0), loadSum = on.reduce((a, e) => a + load(e), 0);
    const pct = capSum ? Math.round(loadSum / capSum * 100) : 0;
    const busy = new Set(work.map((t) => t.exec)).size;
    const poolSub = !pool.length ? 'всё распределено' : waiting ? waiting + ' ' + plural(waiting, 'ждёт', 'ждут', 'ждут') + ' свободного исполнителя' : 'ждут ручного распределения';

    const kpis = '<div class="kpis">' +
      '<div class="kpi' + (waiting ? ' warn' : '') + '"><span class="l">В пуле</span><span class="n">' + pool.length + '</span><span class="s">' + poolSub + '</span></div>' +
      '<div class="kpi"><span class="l">В работе</span><span class="n">' + work.length + '</span><span class="s">у ' + busy + ' ' + plural(busy, 'исполнителя', 'исполнителей', 'исполнителей') + '</span></div>' +
      '<div class="kpi' + (review.length ? ' attn' : '') + '"><span class="l">На проверке</span><span class="n">' + review.length + '</span><span class="s">' + (review.length ? 'ждут вашей проверки' : 'проверять нечего') + '</span></div>' +
      '<div class="kpi"><span class="l">Отправлено заказчикам</span><span class="n">' + done.length + '</span><span class="s">с начала демо</span></div>' +
      '<div class="kpi wide"><span class="l">Загрузка команды</span><span class="n">' + pct + '%</span>' + bar(loadSum, capSum) + '<span class="s">' + loadSum + ' из ' + capSum + ' баллов · в сети ' + on.length + ' из ' + S.execs.length + '</span></div>' +
      '</div>';

    const fx = filterExec ? ex(filterExec) : null;
    const visible = (t) => !fx || t.exec === fx.id;
    const cols = STAGES.map((st) => {
      let list = by(st.id).filter(visible);
      if (st.id === STATUS.DONE) list.sort((a, b) => b.doneAt - a.doneAt);
      else if (st.id === STATUS.REVIEW) list.sort((a, b) => a.submittedAt - b.submittedAt);
      else list.sort((a, b) => a.due - b.due);
      const total = list.length;
      const more = st.id === STATUS.DONE && total > DONE_SHOWN ? total - DONE_SHOWN : 0;
      if (more) list = list.slice(0, DONE_SHOWN);
      return '<div class="col"><h3><span>' + st.name + '</span><span class="cnt">' + total + '</span></h3>' +
        (list.map(card).join('') || '<p class="empty">Пусто</p>') +
        (more ? '<p class="more">и ещё ' + more + '</p>' : '') + '</div>';
    }).join('');

    const board = '<section><div class="bhead"><h2>Задачи</h2>' +
      (fx ? '<button type="button" class="chip" data-act="filter" data-ex="' + fx.id + '">Только ' + esc(short(fx)) + ' <span aria-hidden="true">×</span></button>' : '') +
      '<div class="bact">' +
      '<button type="button" class="switch" data-act="auto" role="switch" aria-checked="' + S.auto + '"><span class="knob"></span>Автораспределение</button>' +
      (!S.auto ? '<button type="button" class="btn" data-act="dist"' + (pool.length ? '' : ' disabled') + '>Распределить пул</button>' : '') +
      '<button type="button" class="btn primary" data-act="new">Новая задача</button>' +
      '</div></div><div class="board">' + cols + '</div></section>';

    const team = S.execs.map((e) => {
      const l = load(e), c = cap(e), st = estate(e);
      return '<button type="button" class="erow' + (e.online ? '' : ' off') + '" data-act="filter" data-ex="' + e.id + '" aria-pressed="' + (filterExec === e.id) + '">' +
        avatar(e) +
        '<span class="ei"><span class="en">' + esc(e.name) + '</span><span class="em">' + LEVELS[e.level].name + ' · ' + e.skills.map((s) => SKILLS[s]).join(', ') + '</span></span>' +
        '<span class="el"><span class="num">' + l + '/' + c + '</span><span class="pill ' + st.cls + '">' + st.txt + '</span></span>' +
        bar(l, c) + '</button>';
    }).join('');

    const logHtml = S.log.slice(0, LOG_SHOWN).map((l) =>
      '<li class="k-' + l.kind + '"><time>' + hhmm(l.t) + '</time><span><span class="lt">' + esc(l.text) + '</span>' + (l.sub ? '<span class="ls">' + esc(l.sub) + '</span>' : '') + '</span></li>'
    ).join('');

    const side = '<aside class="side">' +
      '<section class="panel"><header class="ph"><h2>Команда</h2><span class="hint">нажмите, чтобы отфильтровать доску</span></header><div class="team">' + team + '</div></section>' +
      '<section class="panel"><header class="ph"><h2>Лента событий</h2><span class="hint">новые сверху</span></header><ol class="log">' + logHtml + '</ol></section>' +
      '</aside>';

    $('#m-dyn').innerHTML = kpis + '<div class="layout">' + board + side + '</div>';
  }

  function renderExec() {
    const e = ex(selExec);
    const chips = S.execs.map((x) =>
      '<button type="button" class="pchip" data-act="sel-exec" data-ex="' + x.id + '" aria-pressed="' + (x.id === e.id) + '">' + avatar(x, 'sm') + '<span>' + esc(short(x)) + '</span><span class="num">' + load(x) + '/' + cap(x) + '</span></button>'
    ).join('');
    const mine = S.tasks.filter((t) => t.exec === e.id && t.status === STATUS.WORK).sort((a, b) => a.due - b.due);
    const past = S.tasks.filter((t) => t.exec === e.id && (t.status === STATUS.REVIEW || t.status === STATUS.DONE)).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
    const l = load(e), c = cap(e), st = estate(e), lv = LEVELS[e.level];
    const cells = Array.from({ length: Math.max(c, l) }, (_, i) => '<i class="' + (i < l ? (i >= c ? 'over' : 'on') : '') + '"></i>').join('');

    const profile = '<div class="profile">' +
      '<div class="pmain">' + avatar(e, 'lg') + '<div><h2>' + esc(e.name) + '</h2><p class="muted">' + lv.name + ' · ' + e.skills.map((s) => SKILLS[s]).join(', ') + ' · сложность до ' + lv.max + '</p><p class="muted mono small">Telegram ' + esc(e.tg) + '</p></div></div>' +
      '<div class="pside"><button type="button" class="switch" data-act="online" data-ex="' + e.id + '" role="switch" aria-checked="' + e.online + '"><span class="knob"></span>На смене</button><span class="pill ' + st.cls + '">' + st.txt + '</span></div>' +
      '<div class="gauge"><div class="gl"><span>Загрузка</span><span class="num">' + l + ' из ' + c + ' баллов</span></div><div class="cells" role="img" aria-label="Занято ' + l + ' из ' + c + ' баллов">' + cells + '</div>' +
      '<p class="muted small">Одна клетка равна одному баллу сложности. Больше ' + c + ' баллов оркестратор не выдаст.</p></div>' +
      '</div>';

    let tasksHtml;
    if (mine.length) {
      tasksHtml = '<div class="mytasks">' + mine.map((t) => {
        const d = dueLabel(t.due);
        return '<article class="mytask"><div class="mt-head"><div><h3>' + esc(t.title) + '</h3><p class="muted">' + esc(t.client) + ' · ' + SKILLS[t.skill] + ' · срок <span class="due ' + d.cls + '">' + d.txt + '</span></p></div>' + dots(t.cx) + '</div>' +
          '<p class="brief"><span class="lbl">ТЗ и ремарки</span>' + esc(t.brief) + '</p>' + progress(t) +
          '<div class="mt-act"><button type="button" class="btn primary" data-act="submit" data-id="' + t.id + '">Сдать работу</button></div></article>';
      }).join('') + '</div>';
    } else if (e.online) {
      tasksHtml = '<div class="emptybox"><b>Задач нет, вы в очереди ожидания</b><span>Как только в пуле появится задача по вашему профилю, оркестратор пришлёт её сюда и в Telegram.</span></div>';
    } else {
      tasksHtml = '<div class="emptybox"><b>Вы не на смене</b><span>Пока переключатель «На смене» выключен, новые задачи не приходят. Включите его, и оркестратор проверит пул.</span></div>';
    }

    const pastHtml = past.length ? '<section><h2 class="sec-h">Сданные работы</h2><ul class="past">' + past.map((t) =>
      '<li><span>' + esc(t.title) + ' <span class="muted small">· ' + esc(t.client) + '</span></span>' +
      (t.status === STATUS.DONE ? '<span class="pill s-done">Принято</span>' : '<span class="pill s-work">На проверке</span>') + '</li>'
    ).join('') + '</ul></section>' : '';

    $('#v-exec').innerHTML = '<p class="lead">Так систему видит исполнитель: только свои задачи с ТЗ, своя загрузка и кнопка сдачи. Выберите, за кого смотреть.</p>' +
      '<div class="pchips">' + chips + '</div>' + profile +
      '<section><h2 class="sec-h">Мои задачи</h2>' + tasksHtml + '</section>' + pastHtml;
  }

  function renderClient() {
    const clients = clientList();
    if (!clients.includes(selClient)) selClient = clients[0];
    const chips = clients.map((c) => {
      const n = S.tasks.filter((t) => t.client === c && t.status !== STATUS.DONE).length;
      return '<button type="button" class="pchip" data-act="sel-client" data-c="' + esc(c) + '" aria-pressed="' + (c === selClient) + '"><span>' + esc(c) + '</span><span class="num">' + n + '</span></button>';
    }).join('');
    const mine = S.tasks.filter((t) => t.client === selClient);
    const open = mine.filter((t) => t.status !== STATUS.DONE).sort((a, b) => a.due - b.due);
    const closed = mine.filter((t) => t.status === STATUS.DONE).sort((a, b) => b.doneAt - a.doneAt);
    const orders = open.concat(closed).map((t) => {
      const idx = STEP_IDX[t.status];
      const nowP = t.status === STATUS.WORK ? t.progress : CLIENT_STEP_FILL[t.status];
      const steps = CLIENT_STEPS.map((s, i) => {
        const cls = i < idx || t.status === STATUS.DONE ? 'past' : i === idx ? 'now' : '';
        const attr = cls === 'now' ? ' style="--p:' + nowP + '%"' + (t.status === STATUS.WORK ? ' data-progp="' + t.id + '"' : '') : '';
        return '<li class="' + cls + '"' + attr + '><span class="dot"></span><span>' + s + '</span></li>';
      }).join('');
      let state;
      if (t.status === STATUS.POOL) state = 'Заказ принят, подбираем исполнителя.';
      else if (t.status === STATUS.WORK) state = 'В работе, готово примерно на <span data-progtxt="' + t.id + '">' + Math.round(t.progress) + '%</span>.';
      else if (t.status === STATUS.REVIEW) state = 'Работа готова, менеджер проверяет её перед отправкой.';
      else state = 'Готово, отправлено ' + fmtWhen(t.doneAt) + '.';
      return '<article class="order"><div class="o-head"><h3>' + esc(t.title) + '</h3><span class="mono">срок ' + longDate(t.due) + '</span></div>' +
        '<ol class="steps">' + steps + '</ol><p class="ostate">' + state + '</p>' +
        (t.status === STATUS.DONE ? '<div class="remark"><span class="lbl">Комментарий менеджера</span>' + esc(t.managerNote) + '</div>' : '') +
        '</article>';
    }).join('');
    $('#v-client').innerHTML = '<p class="lead">Так свои заказы видит заказчик: статус и срок без внутренней кухни. Имена исполнителей и их загрузка ему не показываются.</p>' +
      '<div class="pchips">' + chips + '</div>' +
      '<section><h2 class="sec-h">Заказы: ' + esc(selClient) + '</h2>' + (orders ? '<div class="orders">' + orders + '</div>' : '<div class="emptybox"><b>Заказов пока нет</b></div>') + '</section>';
  }

  function render() {
    document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === view)));
    $('#v-manager').hidden = view !== 'manager';
    $('#v-exec').hidden = view !== 'exec';
    $('#v-client').hidden = view !== 'client';
    if (view === 'manager') renderManager();
    else if (view === 'exec') renderExec();
    else renderClient();
  }

  function updateProgress() {
    document.querySelectorAll('[data-prog]').forEach((el) => { const t = task(el.dataset.prog); if (t) el.style.width = t.progress + '%'; });
    document.querySelectorAll('[data-progtxt]').forEach((el) => { const t = task(el.dataset.progtxt); if (t) el.textContent = Math.round(t.progress) + '%'; });
    document.querySelectorAll('[data-progp]').forEach((el) => { const t = task(el.dataset.progp); if (t) el.style.setProperty('--p', t.progress + '%'); });
  }

  // ---------- диалоги ----------
  const closeBtn = '<button type="button" class="x" data-act="close" aria-label="Закрыть">×</button>';

  function openModal(html) {
    lastFocus = document.activeElement;
    $('#dlg').innerHTML = html;
    $('#modal').hidden = false;
    const f = $('#dlg').querySelector('textarea, input:not([type="radio"]), select') || $('#dlg').querySelector('.x');
    if (f) f.focus();
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#dlg').innerHTML = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function openTask(id) {
    const t = task(id); if (!t) return;
    const e = t.exec ? ex(t.exec) : null, d = dueLabel(t.due);
    let actions = '';
    if (t.status === STATUS.POOL) {
      const cands = S.execs.filter((x) => x.skills.includes(t.skill));
      actions = '<div class="box warn">' + esc(t.reason || 'Ждёт распределения') + '</div>' +
        '<div class="row"><button type="button" class="btn" data-act="try" data-id="' + t.id + '">Распределить сейчас</button></div>' +
        '<div class="field"><label for="dlg-manual">Или назначить вручную, в обход правил</label><div class="row"><select id="dlg-manual">' +
        cands.map((x) => '<option value="' + x.id + '">' + esc(x.name) + ': ' + load(x) + '/' + cap(x) + (x.online ? '' : ', не в сети') + '</option>').join('') +
        '</select><button type="button" class="btn" data-act="manual" data-id="' + t.id + '"' + (cands.length ? '' : ' disabled') + '>Назначить</button></div></div>';
    } else if (t.status === STATUS.WORK) {
      actions = '<div class="field"><span class="lbl">Готовность</span>' + progress(t) + '</div>';
    } else if (t.status === STATUS.REVIEW) {
      actions = '<div class="field"><label for="dlg-note">Комментарий</label><textarea id="dlg-note" rows="3" placeholder="Для заказчика при отправке или для исполнителя при возврате"></textarea></div>' +
        '<div class="row"><button type="button" class="btn primary" data-act="accept" data-id="' + t.id + '">Отправить заказчику</button><button type="button" class="btn" data-act="rework" data-id="' + t.id + '">Вернуть на доработку</button></div>';
    }
    openModal('<div class="dh"><span class="pill s-' + t.status + '">' + STATUS_NAME[t.status] + '</span>' + closeBtn + '</div>' +
      '<h2 id="dlg-title">' + esc(t.title) + '</h2>' +
      '<dl class="facts">' +
      '<div><dt>Заказчик</dt><dd>' + esc(t.client) + '</dd></div>' +
      '<div><dt>Направление</dt><dd>' + SKILLS[t.skill] + '</dd></div>' +
      '<div><dt>Сложность</dt><dd>' + dots(t.cx) + ' ' + t.cx + ' из 5</dd></div>' +
      '<div><dt>Срок</dt><dd><span class="due ' + d.cls + '">' + longDate(t.due) + '</span></dd></div>' +
      '<div><dt>Исполнитель</dt><dd>' + (e ? esc(e.name) : 'не назначен') + '</dd></div>' +
      '</dl>' +
      '<div class="box info"><span class="lbl">ТЗ и ремарки</span>' + esc(t.brief) + '</div>' +
      (t.submitNote ? '<div class="box info"><span class="lbl">Комментарий исполнителя</span>' + esc(t.submitNote) + '</div>' : '') +
      (t.managerNote ? '<div class="box info"><span class="lbl">Ремарка для заказчика</span>' + esc(t.managerNote) + '</div>' : '') +
      actions +
      '<div class="hist"><span class="lbl">История</span><ol>' + t.history.slice().reverse().map((h) => '<li><time>' + fmtWhen(h.t) + '</time><span>' + esc(h.text) + '</span></li>').join('') + '</ol></div>');
  }

  function openSubmit(id) {
    const t = task(id); if (!t) return;
    openModal('<div class="dh"><span class="pill s-work">Сдача работы</span>' + closeBtn + '</div>' +
      '<h2 id="dlg-title">' + esc(t.title) + '</h2>' +
      '<p class="muted">' + esc(t.client) + '. После сдачи задача уйдёт менеджеру на проверку, а вы встанете в очередь за следующей.</p>' +
      '<div class="field"><label for="dlg-note">Комментарий для менеджера</label><textarea id="dlg-note" rows="3" placeholder="Например: исходники в папке задачи"></textarea></div>' +
      '<div class="row"><button type="button" class="btn primary" data-act="do-submit" data-id="' + t.id + '">Отправить на проверку</button><button type="button" class="btn ghost" data-act="close">Отмена</button></div>');
  }

  function openNew(p) {
    p = p || {};
    const cxSel = p.cx || DEFAULT_CX;
    openModal('<div class="dh"><span class="pill s-pool">Новая задача в пул</span>' + closeBtn + '</div>' +
      '<h2 id="dlg-title">Что нужно сделать</h2>' +
      '<form id="nt-form" class="view" novalidate>' +
      '<div class="field"><label for="nt-title">Название</label><input id="nt-title" maxlength="90" value="' + esc(p.title || '') + '" placeholder="Например: баннеры для акции"></div>' +
      '<div class="grid2">' +
      '<div class="field"><label for="nt-client">Заказчик</label><input id="nt-client" list="nt-clients" value="' + esc(p.client || '') + '" placeholder="Название компании"><datalist id="nt-clients">' + clientList().map((c) => '<option value="' + esc(c) + '"></option>').join('') + '</datalist></div>' +
      '<div class="field"><label for="nt-skill">Направление</label><select id="nt-skill">' + Object.keys(SKILLS).map((k) => '<option value="' + k + '"' + (p.skill === k ? ' selected' : '') + '>' + SKILLS[k] + '</option>').join('') + '</select></div>' +
      '</div><div class="grid2">' +
      '<fieldset class="field"><legend>Сложность</legend><div class="seg cxseg">' + [1, 2, 3, 4, 5].map((i) => '<label><input type="radio" id="nt-cx-' + i + '" name="nt-cx" value="' + i + '"' + (i === cxSel ? ' checked' : '') + '><span>' + i + '</span></label>').join('') + '</div><span class="hint">1 — пара часов, 5 — неделя работы и только старший уровень</span></fieldset>' +
      '<div class="field"><label for="nt-due">Срок</label><input id="nt-due" type="date" value="' + isoDate(dayOff(p.dueIn != null ? p.dueIn : DEFAULT_DUE_DAYS)) + '"></div>' +
      '</div>' +
      '<div class="field"><label for="nt-brief">ТЗ и ремарки</label><textarea id="nt-brief" rows="3" placeholder="Что важно учесть исполнителю">' + esc(p.brief || '') + '</textarea></div>' +
      '<p class="err" id="nt-err" hidden>Впишите название задачи.</p>' +
      '<div class="row"><button type="submit" class="btn primary">Отправить в пул</button><button type="button" class="btn ghost" data-act="example">Заполнить примером</button></div>' +
      '</form>');
  }

  function stale() { toast('Статус задачи уже изменился', 'Откройте её заново с доски', 'wait'); closeModal(); render(); }

  // ---------- живой режим ----------
  function tick() {
    let changed = false;
    for (const t of S.tasks.slice()) {
      if (t.status !== STATUS.WORK) continue;
      if (!ex(t.exec).online) continue;
      t.progress = Math.min(100, t.progress + (2 + Math.random() * 5) * (1.6 - 0.22 * t.cx));
      if (t.progress >= 100) { submit(t, SUBMIT_NOTES[Math.floor(Math.random() * SUBMIT_NOTES.length)]); changed = true; }
    }
    if (Math.random() < INCOMING_CHANCE) { addIncoming(); changed = true; }
    if (changed) render(); else updateProgress();
  }
  function setLive(on) {
    clearInterval(timer);
    timer = on ? setInterval(tick, TICK_MS) : null;
    $('#live').setAttribute('aria-checked', String(on));
  }

  function boot() {
    booting = true;
    distribute();
    booting = false;
  }

  // ---------- события ----------
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) { if (ev.target === $('#modal')) closeModal(); return; }
    const act = b.dataset.act, id = b.dataset.id;
    const t = id ? task(id) : null;
    switch (act) {
      case 'view': view = b.dataset.v; render(); break;
      case 'open': openTask(id); break;
      case 'filter': filterExec = filterExec === b.dataset.ex ? null : b.dataset.ex; render(); break;
      case 'new': openNew(); break;
      case 'example': {
        const r = INCOMING[S.inc++ % INCOMING.length];
        openNew({ title: r[0], client: r[1], skill: r[2], cx: r[3], dueIn: r[4], brief: r[5] });
        break;
      }
      case 'auto':
        S.auto = !S.auto;
        log('info', S.auto ? 'Автораспределение включено' : 'Автораспределение выключено', S.auto ? 'Пул разбирается сам' : 'Задачи ждут решения менеджера');
        if (S.auto) distribute();
        render();
        break;
      case 'dist':
        if (!distribute(true)) toast('Никого не удалось назначить', 'Причины видны на карточках в пуле', 'wait');
        render();
        break;
      case 'sel-exec': selExec = b.dataset.ex; render(); break;
      case 'sel-client': selClient = b.dataset.c; render(); break;
      case 'online': toggleOnline(ex(b.dataset.ex)); render(); break;
      case 'submit': openSubmit(id); break;
      case 'do-submit':
        if (!t || t.status !== STATUS.WORK) { stale(); break; }
        submit(t, $('#dlg-note').value.trim()); closeModal(); render();
        break;
      case 'accept':
        if (!t || t.status !== STATUS.REVIEW) { stale(); break; }
        accept(t, $('#dlg-note').value.trim()); closeModal(); render();
        break;
      case 'rework':
        if (!t || t.status !== STATUS.REVIEW) { stale(); break; }
        rework(t, $('#dlg-note').value.trim()); closeModal(); render();
        break;
      case 'try': {
        if (!t || t.status !== STATUS.POOL) { stale(); break; }
        const r = pick(t);
        if (r.e) { assign(t, r.e, r.why); closeModal(); }
        else { t.reason = r.why; toast('Пока некому отдать', r.why, 'wait'); openTask(t.id); }
        render();
        break;
      }
      case 'manual': {
        if (!t || t.status !== STATUS.POOL) { stale(); break; }
        const e = ex($('#dlg-manual').value);
        if (e) assign(t, e, 'Назначено менеджером вручную');
        closeModal(); render();
        break;
      }
      case 'close': closeModal(); break;
      case 'live': setLive(!timer); break;
      case 'reset':
        setLive(false); closeModal();
        S = seed(); filterExec = null; boot(); render();
        toast('Демо сброшено', 'Исходные задачи и команда на месте', 'done');
        break;
    }
  });

  document.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'nt-form') return;
    ev.preventDefault();
    const title = $('#nt-title').value.trim();
    if (!title) { $('#nt-err').hidden = false; $('#nt-title').focus(); return; }
    const checked = document.querySelector('input[name="nt-cx"]:checked');
    const dv = $('#nt-due').value;
    const o = {
      title,
      client: $('#nt-client').value.trim() || DEFAULT_CLIENT,
      skill: $('#nt-skill').value,
      cx: checked ? Number(checked.value) : DEFAULT_CX,
      due: dv ? new Date(dv + 'T00:00:00') : dayOff(DEFAULT_DUE_DAYS),
      brief: $('#nt-brief').value.trim() || DEFAULT_BRIEF
    };
    closeModal();
    createTask(o, false);
    render();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !$('#modal').hidden) closeModal();
  });

  boot();
  render();
})();
