'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

const { STATUS } = L;

function executor(id, level, skills, extra = {}) {
  return { id, name: 'Тест ' + id.toUpperCase(), g: 'm', level, skills, online: true, ...extra };
}
const inWork = (exec, cx) => ({ status: STATUS.WORK, exec, cx });
const poolTask = (skill, cx) => ({ status: STATUS.POOL, skill, cx });

test('pick: берёт исполнителя с самой низкой загрузкой после назначения', () => {
  const execs = [executor('a', 'md', ['design']), executor('b', 'sr', ['design'])];
  const tasks = [inWork('a', 2), inWork('b', 4)]; // a: (2+2)/8 = 0.50, b: (4+2)/10 = 0.60
  assert.equal(L.pick(poolTask('design', 2), execs, tasks).e.id, 'a');
});

test('pick: сравнивает загрузку в долях ёмкости, а не в баллах', () => {
  const execs = [executor('jr', 'jr', ['text']), executor('sr', 'sr', ['text'])];
  const tasks = [inWork('jr', 1), inWork('sr', 5)]; // jr: 3/5 = 0.6, sr: 7/10 = 0.7
  assert.equal(L.pick(poolTask('text', 2), execs, tasks).e.id, 'jr');
});

test('pick: при равной загрузке выигрывает тот, у кого меньше задач', () => {
  const execs = [executor('a', 'md', ['dev']), executor('b', 'md', ['dev'])];
  const tasks = [inWork('a', 2), inWork('a', 2), inWork('b', 4)];
  assert.equal(L.pick(poolTask('dev', 1), execs, tasks).e.id, 'b');
});

test('pick: пропускает исполнителей без нужного навыка', () => {
  const execs = [executor('d', 'sr', ['design']), executor('t', 'md', ['text'])];
  assert.equal(L.pick(poolTask('text', 2), execs, []).e.id, 't');
});

test('pick: объясняет, если навыка нет в команде', () => {
  const r = L.pick(poolTask('data', 1), [executor('d', 'sr', ['design'])], []);
  assert.equal(r.e, undefined);
  assert.match(r.why, /нет исполнителей с навыком «Аналитика»/);
});

test('pick: не назначает тех, кто не в сети', () => {
  const r = L.pick(poolTask('data', 1), [executor('k', 'md', ['data'], { online: false })], []);
  assert.equal(r.e, undefined);
  assert.match(r.why, /никого нет в сети/);
});

test('pick: не отдаёт сложную задачу уровню, который её не тянет', () => {
  const execs = [executor('jr', 'jr', ['text']), executor('md', 'md', ['text'])];
  const hard = L.pick(poolTask('text', 5), execs, []);
  assert.equal(hard.e, undefined);
  assert.match(hard.why, /нужен старший уровень/);
  assert.equal(L.pick(poolTask('text', 3), execs, []).e.id, 'md');
});

test('pick: не превышает ёмкость и называет занятых', () => {
  const r = L.pick(poolTask('dev', 5), [executor('e', 'sr', ['dev'])], [inWork('e', 9)]);
  assert.equal(r.e, undefined);
  assert.match(r.why, /9\/10/);
});

test('pick: задача ровно на остаток ёмкости проходит', () => {
  const r = L.pick(poolTask('dev', 5), [executor('e', 'sr', ['dev'])], [inWork('e', 5)]);
  assert.equal(r.e.id, 'e');
  assert.match(r.why, /5\/10 → 10\/10/);
});

test('pick: не меняет входные данные и даёт тот же ответ при повторе', () => {
  const execs = [executor('a', 'md', ['design']), executor('b', 'sr', ['design'])];
  const tasks = [inWork('a', 2), inWork('b', 4)];
  const before = JSON.stringify({ execs, tasks });
  const first = L.pick(poolTask('design', 2), execs, tasks);
  const second = L.pick(poolTask('design', 2), execs, tasks);
  assert.equal(JSON.stringify({ execs, tasks }), before);
  assert.deepEqual(first, second);
});

test('load и active считают только задачи в работе', () => {
  const e = executor('a', 'md', ['design']);
  const tasks = [inWork('a', 3), inWork('a', 1), { status: STATUS.REVIEW, exec: 'a', cx: 4 }, inWork('b', 5)];
  assert.equal(L.load(e, tasks), 4);
  assert.equal(L.active(e, tasks), 2);
});

test('estate: статус по загрузке и смене', () => {
  const e = executor('a', 'md', ['design']); // ёмкость 8
  assert.equal(L.estate({ ...e, online: false }, []).cls, 'off');
  assert.equal(L.estate(e, []).cls, 'free');
  assert.equal(L.estate(e, [inWork('a', 3)]).cls, 'busy');
  assert.equal(L.estate(e, [inWork('a', 7)]).cls, 'full');
  assert.equal(L.estate(e, [inWork('a', 9)]).cls, 'over');
});

test('estate и v: род в подписях', () => {
  assert.equal(L.estate(executor('m', 'md', ['dev']), []).txt, 'Свободен');
  assert.equal(L.estate(executor('f', 'md', ['dev'], { g: 'f' }), []).txt, 'Свободна');
  assert.equal(L.v({ g: 'f' }, 'сдал', 'сдала'), 'сдала');
});

test('plural: русские формы числительных', () => {
  const forms = (n) => L.plural(n, 'задача', 'задачи', 'задач');
  assert.equal(forms(1), 'задача');
  assert.equal(forms(21), 'задача');
  assert.equal(forms(2), 'задачи');
  assert.equal(forms(24), 'задачи');
  assert.equal(forms(5), 'задач');
  assert.equal(forms(11), 'задач');
  assert.equal(forms(12), 'задач');
  assert.equal(forms(112), 'задач');
  assert.equal(forms(0), 'задач');
});

test('dueLabel: сегодня, завтра, просрочено, дата', () => {
  const now = new Date(2026, 9, 2, 15, 30);
  assert.deepEqual(L.dueLabel(new Date(2026, 9, 2), now), { txt: 'сегодня', cls: 'soon' });
  assert.deepEqual(L.dueLabel(new Date(2026, 9, 3), now), { txt: 'завтра', cls: 'soon' });
  assert.deepEqual(L.dueLabel(new Date(2026, 9, 1), now), { txt: 'просрочено', cls: 'late' });
  const later = L.dueLabel(new Date(2026, 9, 9), now);
  assert.equal(later.cls, '');
  assert.match(later.txt, /9/);
});

test('short: имя и инициал фамилии', () => {
  assert.equal(L.short({ name: 'Алина Ким' }), 'Алина К.');
  assert.equal(L.short({ name: 'Алина' }), 'Алина');
});
