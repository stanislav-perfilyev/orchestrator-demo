/*
 * Логика распределения задач. Чистые функции без DOM и без общего состояния:
 * одинаково работают в браузере (window.OrchestratorLogic) и под Node (для тестов).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OrchestratorLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SKILLS = Object.freeze({ design: 'Дизайн', dev: 'Разработка', text: 'Тексты', trans: 'Переводы', data: 'Аналитика' });
  // max: самая высокая сложность, которую уровень берёт; cap: ёмкость в баллах сложности
  const LEVELS = Object.freeze({
    jr: Object.freeze({ name: 'Младший', max: 2, cap: 5 }),
    md: Object.freeze({ name: 'Средний', max: 4, cap: 8 }),
    sr: Object.freeze({ name: 'Старший', max: 5, cap: 10 })
  });
  const STATUS = Object.freeze({ POOL: 'pool', WORK: 'work', REVIEW: 'review', DONE: 'done' });
  const LOAD_WARN = 0.8;
  const DAY_MS = 864e5;
  const SENIOR_ONLY_FROM = 5;
  const RIVALS_SHOWN = 2;

  const cap = (e) => LEVELS[e.level].cap;
  const inWork = (e, tasks) => tasks.filter((t) => t.status === STATUS.WORK && t.exec === e.id);
  const load = (e, tasks) => inWork(e, tasks).reduce((sum, t) => sum + t.cx, 0);
  const active = (e, tasks) => inWork(e, tasks).length;
  const v = (e, male, female) => (e.g === 'f' ? female : male);
  const short = (e) => {
    const [first, last] = e.name.split(' ');
    return last ? first + ' ' + last[0] + '.' : first;
  };

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function dueLabel(due, now) {
    const diff = Math.round((startOfDay(due) - startOfDay(now)) / DAY_MS);
    if (diff < 0) return { txt: 'просрочено', cls: 'late' };
    if (diff === 0) return { txt: 'сегодня', cls: 'soon' };
    if (diff === 1) return { txt: 'завтра', cls: 'soon' };
    return { txt: due.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), cls: '' };
  }

  /*
   * Выбор исполнителя для задачи t.
   * Фильтры по порядку: навык → в сети → уровень тянет сложность → хватает ёмкости.
   * Из оставшихся берём того, чья загрузка после назначения будет самой низкой в долях от ёмкости;
   * при равенстве выигрывает тот, у кого меньше задач в работе.
   * Возвращает { e, why }, если исполнитель найден, иначе { why } с причиной ожидания.
   */
  function pick(t, execs, tasks) {
    const skill = SKILLS[t.skill];
    const withSkill = execs.filter((e) => e.skills.includes(t.skill));
    if (!withSkill.length) return { why: 'В команде нет исполнителей с навыком «' + skill + '»' };

    const online = withSkill.filter((e) => e.online);
    if (!online.length) return { why: 'С навыком «' + skill + '» сейчас никого нет в сети: ' + withSkill.map(short).join(', ') };

    const fitLevel = online.filter((e) => LEVELS[e.level].max >= t.cx);
    if (!fitLevel.length) {
      const need = t.cx >= SENIOR_ONLY_FROM ? 'старший' : 'средний или старший';
      return { why: 'Для сложности ' + t.cx + ' нужен ' + need + ' уровень, таких в сети нет' };
    }

    const fit = fitLevel.filter((e) => load(e, tasks) + t.cx <= cap(e));
    if (!fit.length) {
      const busy = fitLevel.map((e) => short(e) + ' ' + load(e, tasks) + '/' + cap(e)).join(', ');
      return { why: 'Подходящие заняты: ' + busy + '. Уйдёт первому, кто освободится' };
    }

    const score = (e) => (load(e, tasks) + t.cx) / cap(e);
    const ranked = fit.slice().sort((a, b) => score(a) - score(b) || active(a, tasks) - active(b, tasks));
    const best = ranked[0], l = load(best, tasks), c = cap(best);
    const rivals = ranked.slice(1, 1 + RIVALS_SHOWN).map((e) => short(e) + ' ' + load(e, tasks) + '/' + cap(e));
    const why = 'Навык «' + skill + '», уровень «' + LEVELS[best.level].name + '» берёт сложность до ' + LEVELS[best.level].max +
      '. Загрузка ' + l + '/' + c + ' → ' + (l + t.cx) + '/' + c +
      (rivals.length ? ', у остальных выше: ' + rivals.join(', ') : ', других свободных с этим навыком нет');
    return { e: best, why };
  }

  function estate(e, tasks) {
    if (!e.online) return { cls: 'off', txt: 'Не в сети' };
    const l = load(e, tasks), c = cap(e);
    if (!l) return { cls: 'free', txt: v(e, 'Свободен', 'Свободна') };
    if (l > c) return { cls: 'over', txt: 'Перегруз' };
    if (l / c >= LOAD_WARN) return { cls: 'full', txt: v(e, 'Загружен', 'Загружена') };
    return { cls: 'busy', txt: 'Работает' };
  }

  return Object.freeze({ SKILLS, LEVELS, STATUS, LOAD_WARN, DAY_MS, cap, load, active, v, short, plural, dueLabel, pick, estate });
});
