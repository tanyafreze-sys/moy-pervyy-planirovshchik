"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function parseDate(value) { return new Date(`${value}T12:00:00`); }
  function monday(value = dateKey(new Date())) {
    const date = parseDate(value);
    date.setDate(date.getDate() - (date.getDay() + 6) % 7);
    return dateKey(date);
  }
  function addDays(value, days) { const date = parseDate(value); date.setDate(date.getDate() + days); return dateKey(date); }
  const ui = {
    week: monday(), view: "week", taskTab: "tasks", formKind: null, editId: null,
    today: dateKey(new Date()), dateKey, monday, addDays,
    notify(text) { $("toast").textContent = text; $("toast").hidden = false; },
  };
  window.MyWeekUI = ui;
  const days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  function updateCalendar() {
    const first = parseDate(ui.week);
    const last = parseDate(addDays(ui.week, 6));
    const format = { day: "numeric", month: "long" };
    $("week-range").textContent = `${first.toLocaleDateString("ru-RU", format)} - ${last.toLocaleDateString("ru-RU", { ...format, year: "numeric" })}`;
    $("calendar-grid").replaceChildren();
    const times = document.createElement("div");
    times.className = "time-column";
    times.innerHTML = '<div class="day-heading"></div><div class="day-body"></div>';
    for (let hour = 8; hour < 16; hour++) {
      const label = document.createElement("div"); label.className = "hour-label";
      label.textContent = `${String(hour).padStart(2, "0")}:00`; times.lastChild.append(label);
    }
    $("calendar-grid").append(times);
    for (let day = 0; day < 7; day++) {
      const date = addDays(ui.week, day);
      const column = document.createElement("div"); column.className = "day-column"; column.dataset.date = date;
      const heading = document.createElement("div"); heading.className = "day-heading" + (date === ui.today ? " is-today" : "");
      const weekday = document.createElement("span"); weekday.textContent = days[day];
      const number = document.createElement("strong"); number.textContent = String(parseDate(date).getDate());
      heading.append(weekday, number);
      const body = document.createElement("div"); body.className = "day-body"; body.dataset.day = date;
      column.append(heading, body); $("calendar-grid").append(column);
    }
  }
  ui.updateCalendar = updateCalendar;
  function announceChange() { document.dispatchEvent(new CustomEvent("myweek:view")); }
  function showView(view, focus = true) {
    if (!$("view-" + view)) return;
    ui.view = view;
    document.querySelectorAll(".view").forEach(section => { section.hidden = section.id !== "view-" + view; });
    document.querySelectorAll(".sidebar [data-view]").forEach(button => {
      if (button.dataset.view === view) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    $("toast").hidden = true;
    if (focus) $("main").focus();
    announceChange();
  }
  ui.showView = showView;
  function showStep(step) {
    showView("week", false);
    document.querySelectorAll(".week-panel").forEach(panel => { panel.hidden = panel.id !== "week-" + step; });
    document.querySelectorAll(".step-tabs [data-week-step]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.weekStep === step)));
    announceChange();
  }
  ui.showStep = showStep;
  const sphereField = ["sphereId", "Сфера", "sphere", true];
  const nameField = ["name", "Название", "text", true];
  const schemas = {
    sphere: { title: "Сфера и её минимум", fields: [nameField, ["color", "Цвет", "color", true], ["minimumType", "Единица минимума", "select", true, [["minutes", "Минуты"], ["actions", "Действия"]]], ["minimum", "Минимум на неделю", "number", true, 0]] },
    goal: { title: "Цель", fields: [nameField, sphereField, ["description", "Описание", "textarea"], ["criterion", "Критерий результата", "text"], ["deadline", "Срок", "date"]] },
    task: { title: "Задача", fields: [nameField, sphereField, ["goalId", "Цель, необязательно", "goal"], ["duration", "Плановая длительность, минут", "number", false, 1], ["deadline", "Дедлайн, дата", "date"], ["deadlineTime", "Дедлайн, время (необязательно)", "time"], ["splittable", "Можно делить на занятия", "checkbox"]] },
    meeting: { title: "Встреча", fields: [nameField, ["date", "Дата", "date", true], ["start", "Начало", "time", true], ["end", "Окончание", "time", true]] },
    session: { title: "Занятие / перенос", fields: [["taskId", "Задача", "task", true], ["date", "Дата", "date", true], ["start", "Начало", "time", true], ["end", "Окончание", "time", true], ["volume", "Исходный объём, минут", "number", true, 1]] },
    availability: { title: "Постоянная доступность", fields: [["day", "День недели", "select", true, days.map((name, i) => [String(i), name])], ["intervals", "Окна, например 09:00-12:00, 14:00-18:00", "text"]] },
    exception: { title: "Исключение доступности", fields: [["date", "Дата", "date", true], ["intervals", "Окна; пустое поле означает недоступный день", "text"]] },
    preferences: { title: "Промежутки и предпочтения", fields: [["gap", "Промежуток между занятиями, минут", "number", true, 0], ["workSphere", "Рабочая сфера", "sphere"], ["restSphere", "Сфера отдыха", "sphere"], ["preferenceSphere", "Предпочтение для сферы", "sphere"], ["start", "Предпочтительное начало", "time"], ["end", "Предпочтительное окончание", "time"]] },
    habit: { title: "Привычка", fields: [nameField, sphereField, ["mode", "Режим", "select", true, [["days", "По дням"], ["frequency", "Повторения за неделю"]]], ["days", "Дни, например 1,3,5 (пн = 1)", "text"], ["frequency", "Повторений в неделю", "number", false, 1], ["effectiveDate", "Действует с даты", "date", true], ["partialTarget", "Цель неполной недели при недельной частоте", "number", false, 0]] },
    wellbeing: { title: "Самочувствие", fields: [["date", "Дата", "date", true], ["rating", "Оценка", "select", true, [1, 2, 3, 4, 5].map(n => [String(n), String(n)])], ["note", "Заметка, необязательно", "textarea"]] },
    helper: { title: "Учебный помощник на шаблонах, без ИИ", fields: [["goalId", "Цель", "goal", true], ["type", "Тип цели", "select", true, [["work", "Работа"], ["sport", "Спорт"], ["creative", "Творчество"], ["rest", "Отдых"], ["custom", "Своя цель, ручной ввод"]]], ["result", "1. Какой следующий небольшой результат?", "text"], ["minutes", "2. Сколько минут есть на одно действие?", "number", false, 1], ["obstacle", "3. Что мешает начать?", "text"]] },
  };
  ui.schemas = schemas;
  function choicesFor(type) {
    const state = window.MyWeekStore && window.MyWeekStore.state;
    if (!state) return [["", "Сначала создайте запись"]];
    const collection = type === "sphere" ? state.spheres : type === "goal" ? state.goals : state.tasks;
    return collection.filter(item => !item.archived).map(item => [item.id, item.name]);
  }
  function openForm(kind, values = {}, id = null) {
    const schema = schemas[kind]; if (!schema) return;
    if (kind === "preferences" && window.MyWeekStore) values = { ...window.MyWeekStore.state.settings, ...values };
    ui.formKind = kind; ui.editId = id;
    $("editor-form").reset(); $("form-error").textContent = "";
    $("dialog-title").textContent = schema.title;
    $("dialog-description").textContent = kind === "helper" ? "Ответы можно пропустить. Предложения не меняют план без вашего принятия." : "Обязательные поля отмечены звёздочкой. Изменения можно отменить.";
    $("dialog-fields").replaceChildren();
    for (const [name, text, type, required, extra] of schema.fields) {
      const label = document.createElement("label"); label.textContent = text + (required ? " *" : "");
      let input;
      if (["select", "sphere", "goal", "task"].includes(type)) {
        input = document.createElement("select");
        const choices = type === "select" ? extra : choicesFor(type);
        if (id && values[name] && !choices.some(([value]) => value === values[name]) && ["sphere", "goal", "task"].includes(type)) {
          const collection = window.MyWeekStore.state[type === "sphere" ? "spheres" : type === "goal" ? "goals" : "tasks"];
          const current = collection.find(item => item.id === values[name]);
          if (current) choices.push([current.id, current.name + " (архив)"]);
        }
        if (!required || type !== "select") input.append(new Option(required ? "Выберите запись" : "Не задано", ""));
        for (const [value, caption] of choices) input.append(new Option(caption, value));
      } else if (type === "textarea") {
        input = document.createElement("textarea"); label.className = "full";
      } else {
        input = document.createElement("input"); input.type = type;
        if (type === "number") { input.min = String(extra ?? 0); input.step = "1"; }
        if (type === "checkbox") label.className = "checkbox-field full";
      }
      input.name = name; input.id = "field-" + name; input.required = Boolean(required);
      if (type === "text" || type === "textarea") input.maxLength = 2000;
      if (type === "checkbox") input.checked = Boolean(values[name]);
      else input.value = values[name] ?? (type === "color" ? "#315d44" : name === "date" ? $("today-date").value : name === "effectiveDate" ? ui.today : name === "gap" ? 15 : name === "minimum" ? 0 : input.value);
      label.append(input); $("dialog-fields").append(label);
    }
    $("editor-dialog").showModal();
  }
  ui.openForm = openForm;
  document.addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button) return;
    if (button.dataset.view) showView(button.dataset.view);
    if (button.dataset.weekStep) showStep(button.dataset.weekStep);
    if (button.dataset.form) openForm(button.dataset.form);
    if (button.hasAttribute("data-close-dialog")) $("editor-dialog").close();
    if (button.dataset.weekShift || button.hasAttribute("data-current-week")) {
      ui.week = button.hasAttribute("data-current-week") ? monday() : addDays(ui.week, Number(button.dataset.weekShift) * 7);
      updateCalendar(); announceChange();
    }
    if (button.dataset.taskTab) {
      ui.taskTab = button.dataset.taskTab;
      $("task-list").hidden = ui.taskTab !== "tasks"; $("goal-list").hidden = ui.taskTab !== "goals";
      document.querySelectorAll("[data-task-tab]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.taskTab === ui.taskTab)));
    }
    if (button.dataset.action) {
      const action = new CustomEvent("myweek:action", { detail: { name: button.dataset.action, button }, cancelable: true });
      if (document.dispatchEvent(action)) ui.notify("Эта функция будет подключена на следующем этапе. Сейчас проверяем интерфейс.");
    }
  });
  $("editor-form").addEventListener("submit", event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    for (const input of event.target.querySelectorAll('input[type="checkbox"]')) values[input.name] = input.checked;
    const action = new CustomEvent("myweek:submit", { detail: { kind: ui.formKind, id: ui.editId, values }, cancelable: true });
    if (document.dispatchEvent(action)) {
      $("editor-dialog").close(); ui.notify("Форма проверена. Данные пока не сохранены - это этап интерфейса.");
    }
  });
  $("toast").addEventListener("click", () => { $("toast").hidden = true; });
  document.querySelector(".brand").addEventListener("click", event => { event.preventDefault(); showView("week"); });
  $("header-date").textContent = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  $("today-date").value = ui.today; $("history-date").value = ui.week;
  $("today-date").addEventListener("change", announceChange);
  $("history-date").addEventListener("change", announceChange);
  updateCalendar();
})();

(() => {
  const KEY = "myWeek.state.v1";
  const ui = window.MyWeekUI;
  const emptyMarkup = new Map([...document.querySelectorAll(".empty-state")].map(element => [element, element.innerHTML]));
  const collections = ["spheres", "goals", "tasks", "sessions", "meetings", "habits", "habitMarks", "plans", "history", "wellbeing", "templates", "suggestions"];
  const clone = value => JSON.parse(JSON.stringify(value));
  const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const text = (value, required = false) => typeof value === "string" && value.length <= 10000 && (!required || value.trim().length > 0);
  const number = (value, min = 0, max = 1000000) => Number.isInteger(value) && value >= min && value <= max;
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return Number.isFinite(date.getTime()) && ui.dateKey(date) === value;
  }
  function minutes(value) {
    if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
    const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute;
  }
  function validateIntervals(intervals) {
    assert(Array.isArray(intervals), "Окна доступности должны быть списком");
    let end = -1;
    for (const interval of [...intervals].sort((a, b) => String(a.start).localeCompare(String(b.start)))) {
      assert(record(interval) && minutes(interval.start) < minutes(interval.end), "Некорректное окно доступности");
      assert(minutes(interval.start) >= end, "Окна доступности пересекаются"); end = minutes(interval.end);
    }
  }
  function initialState() {
    return {
      formatVersion: 1, revision: 0,
      settings: { gap: 15, availability: Array.from({ length: 7 }, () => []), exceptions: {}, preferences: [], workSphere: null, restSphere: null },
      ...Object.fromEntries(collections.map(key => [key, []])),
    };
  }
  function validate(state) {
    assert(record(state), "Данные должны быть JSON-объектом");
    assert(state.formatVersion === 1, "Версия формата не поддерживается");
    assert(number(state.revision), "Некорректная ревизия данных");
    assert(record(state.settings), "Нет настроек");
    assert(number(state.settings.gap, 0, 240), "Промежуток должен быть от 0 до 240 минут");
    assert(Array.isArray(state.settings.availability) && state.settings.availability.length === 7, "Нужно семь дней доступности");
    state.settings.availability.forEach(validateIntervals);
    assert(record(state.settings.exceptions), "Некорректные исключения");
    for (const [date, intervals] of Object.entries(state.settings.exceptions)) { assert(validDate(date), "Некорректная дата исключения"); validateIntervals(intervals); }
    const allIds = new Set();
    for (const key of collections) {
      assert(Array.isArray(state[key]), `Нет списка ${key}`);
      for (const item of state[key]) {
        assert(record(item) && text(item.id, true), `Некорректный идентификатор в ${key}`);
        assert(!allIds.has(item.id), "Повтор идентификатора"); allIds.add(item.id);
        assert(typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt)) && typeof item.updatedAt === "string" && Number.isFinite(Date.parse(item.updatedAt)), "Некорректные даты создания/изменения");
        if (["spheres", "goals", "tasks", "meetings", "habits", "templates", "suggestions"].includes(key)) assert(text(item.name, true), "Пустое название");
        if (item.archived !== undefined) assert(typeof item.archived === "boolean", "Некорректный признак архива");
      }
    }
    const ids = key => new Set(state[key].map(item => item.id));
    const sphereIds = ids("spheres"), goalIds = ids("goals"), taskIds = ids("tasks"), habitIds = ids("habits");
    function ref(id, set, optional = false) { assert((optional && (id === null || id === "" || id === undefined)) || set.has(id), "Ссылка на неизвестный объект"); }
    for (const sphere of state.spheres) {
      assert(/^#[\da-f]{6}$/i.test(sphere.color), "Некорректный цвет сферы");
      assert(["minutes", "actions"].includes(sphere.minimumType) && number(sphere.minimum), "Некорректный минимум сферы");
    }
    for (const goal of state.goals) {
      ref(goal.sphereId, sphereIds); assert(text(goal.description) && text(goal.criterion), "Некорректное описание цели");
      assert(!goal.deadline || validDate(goal.deadline), "Некорректный срок цели");
    }
    for (const task of state.tasks) {
      ref(task.sphereId, sphereIds); ref(task.goalId, goalIds, true);
      assert(task.duration === null || number(task.duration, 1), "Длительность должна быть положительной или не задана");
      assert(typeof task.done === "boolean" && typeof task.splittable === "boolean", "Некорректные признаки задачи");
      assert(!task.deadline || validDate(task.deadline), "Некорректный дедлайн");
      assert(!task.deadlineTime || (task.deadline && Number.isFinite(minutes(task.deadlineTime))), "Время дедлайна требует даты");
    }
    const sessionVolume = new Map();
    for (const item of [...state.sessions, ...state.meetings]) {
      assert(validDate(item.date) && minutes(item.start) < minutes(item.end), "Некорректная дата или время занятия/встречи");
    }
    for (const session of state.sessions) {
      ref(session.taskId, taskIds); assert(number(session.volume, 1) && typeof session.done === "boolean", "Некорректная часть задачи");
      assert(session.volume <= minutes(session.end) - minutes(session.start), "Объём части больше временного интервала");
      sessionVolume.set(session.taskId, (sessionVolume.get(session.taskId) || 0) + session.volume);
    }
    for (const task of state.tasks) assert((sessionVolume.get(task.id) || 0) <= (task.duration || 0), "Сумма частей превышает объём задачи");
    for (const habit of state.habits) {
      ref(habit.sphereId, sphereIds);
      assert(record(habit.targets), "Нет целей привычки по неделям");
      for (const [week, target] of Object.entries(habit.targets)) {
        assert(validDate(week) && ui.monday(week) === week && number(target, 0, 7), "Некорректная цель неполной недели");
      }
      assert(Array.isArray(habit.rules) && habit.rules.length > 0, "У привычки нет правил");
      let lastDate = "";
      for (const rule of habit.rules) {
        assert(validDate(rule.from) && rule.from > lastDate, "Даты правил привычки должны возрастать"); lastDate = rule.from;
        assert(["days", "frequency", "paused"].includes(rule.mode), "Неизвестный режим привычки");
        if (rule.mode === "days") assert(Array.isArray(rule.days) && rule.days.length > 0 && new Set(rule.days).size === rule.days.length && rule.days.every(day => number(day, 0, 6)), "Некорректные дни привычки");
        if (rule.mode === "frequency") assert(number(rule.frequency, 1, 7), "Частота должна быть от 1 до 7");
      }
    }
    const markDates = new Set();
    for (const mark of state.habitMarks) {
      ref(mark.habitId, habitIds); assert(validDate(mark.date) && mark.date <= ui.today, "Некорректная дата привычки");
      const pair = `${mark.habitId}:${mark.date}`; assert(!markDates.has(pair), "Две отметки привычки на одну дату"); markDates.add(pair);
    }
    const wellbeingDates = new Set();
    for (const entry of state.wellbeing) {
      assert(validDate(entry.date) && entry.date <= ui.today && number(entry.rating, 1, 5) && text(entry.note), "Некорректное самочувствие");
      assert(!wellbeingDates.has(entry.date), "Две оценки на одну дату"); wellbeingDates.add(entry.date);
    }
    const weeks = new Set();
    for (const plan of state.plans) {
      assert(validDate(plan.week) && ui.monday(plan.week) === plan.week && !weeks.has(plan.week), "Некорректная или повторная неделя"); weeks.add(plan.week);
      assert(["draft", "confirmed"].includes(plan.status) && number(plan.conditionsVersion), "Некорректное состояние плана");
      for (const key of ["candidates", "mandatory"]) { assert(Array.isArray(plan[key]) && new Set(plan[key]).size === plan[key].length, "Некорректный список кандидатов"); plan[key].forEach(id => ref(id, taskIds)); }
      assert(plan.mandatory.every(id => plan.candidates.includes(id)), "Обязательная задача должна быть кандидатом");
      assert(record(plan.conditions) && Array.isArray(plan.violations) && Array.isArray(plan.variants), "Нет условий плана");
      assert(plan.snapshot === null || record(plan.snapshot), "Некорректный снимок");
    }
    assert(Array.isArray(state.settings.preferences), "Нет предпочтений");
    for (const preference of state.settings.preferences) { ref(preference.sphereId, sphereIds); assert(minutes(preference.start) < minutes(preference.end), "Некорректное предпочтение"); }
    ref(state.settings.workSphere, sphereIds, true); ref(state.settings.restSphere, sphereIds, true);
    for (const suggestion of state.suggestions) { ref(suggestion.sphereId, sphereIds); ref(suggestion.goalId, goalIds); assert(number(suggestion.duration, 1), "Нет длительности предложения"); assert(["pending", "accepted", "rejected"].includes(suggestion.state) && text(suggestion.explanation), "Некорректное предложение"); if (suggestion.taskId) ref(suggestion.taskId, taskIds); assert(suggestion.state !== "accepted" || suggestion.taskId, "Принятое предложение должно иметь задачу"); }
    function nestedSessions(sessions, references, relative = false) {
      assert(Array.isArray(sessions), "Нет списка занятий в снимке/варианте"); const seen = new Set();
      for (const session of sessions) {
        assert(record(session) && text(session.id, true) && !seen.has(session.id), "Повтор или ошибка занятия в снимке/варианте"); seen.add(session.id);
        ref(session.taskId, references);
        assert(validDate(session.date) && minutes(session.start) < minutes(session.end) && number(session.volume, 1) && session.volume <= minutes(session.end) - minutes(session.start) && typeof session.done === "boolean", "Некорректное занятие в снимке/варианте");
        if (relative) assert(number(session.relativeDay, 0, 6), "Некорректный относительный день шаблона");
      }
    }
    function nestedConditions(value) {
      assert(record(value) && record(value.settings) && Array.isArray(value.spheres), "Нет условий снимка");
      assert(number(value.settings.gap, 0, 240) && Array.isArray(value.settings.availability) && value.settings.availability.length === 7, "Некорректные настройки снимка");
      value.settings.availability.forEach(validateIntervals);
      assert(record(value.settings.exceptions) && Array.isArray(value.settings.preferences), "Некорректные ограничения снимка");
      for (const [date, intervals] of Object.entries(value.settings.exceptions)) { assert(validDate(date), "Некорректная дата снимка"); validateIntervals(intervals); }
      const refs = new Set();
      for (const sphere of value.spheres) { assert(record(sphere) && text(sphere.id, true) && text(sphere.name, true) && !refs.has(sphere.id) && number(sphere.minimum) && ["minutes", "actions"].includes(sphere.minimumType), "Некорректная сфера снимка"); refs.add(sphere.id); }
      ref(value.settings.workSphere, sphereIds, true); ref(value.settings.restSphere, sphereIds, true);
      for (const p of value.settings.preferences) { ref(p.sphereId, sphereIds); assert(minutes(p.start) < minutes(p.end), "Некорректное предпочтение снимка"); }
    }
    for (const plan of state.plans) {
      nestedConditions(plan.conditions);
      if (plan.snapshot) { nestedSessions(plan.snapshot.sessions, taskIds); nestedConditions(plan.snapshot.conditions); }
      for (const variant of plan.variants) {
        assert(record(variant) && text(variant.id, true) && number(variant.conditionsVersion) && ["balanced", "work", "rest"].includes(variant.mode), "Некорректный вариант");
        nestedSessions(variant.sessions, taskIds);
        assert(Array.isArray(variant.excluded) && Array.isArray(variant.warnings) && Array.isArray(variant.metrics) && number(variant.freeMinutes), "Нет показателей варианта");
        variant.excluded.forEach(item => { ref(item.taskId, taskIds); assert(text(item.reason, true), "Нет причины исключения"); });
      }
    }
    for (const template of state.templates) {
      assert(validDate(template.sourceWeek) && ui.monday(template.sourceWeek) === template.sourceWeek && Array.isArray(template.tasks), "Некорректный шаблон");
      const references = new Set();
      for (const task of template.tasks) {
        assert(record(task) && text(task.id, true) && !references.has(task.id) && text(task.name, true) && number(task.duration, 1), "Некорректная задача шаблона"); references.add(task.id); ref(task.sphereId, sphereIds); ref(task.goalId, goalIds, true);
        assert(!task.deadline || validDate(task.deadline), "Некорректный дедлайн шаблона");
        assert(typeof task.done === "boolean" && typeof task.splittable === "boolean", "Некорректные признаки шаблона");
      }
      nestedSessions(template.sessions, references, true);
      for (const task of template.tasks) assert(template.sessions.filter(s => s.taskId === task.id).reduce((sum, s) => sum + s.volume, 0) <= task.duration, "Объём шаблона превышает задачу");
    }
    return state;
  }
  const store = {
    state: initialState(), dirty: false, blocked: false, raw: null,
    validate, clone, initialState, validDate, minutes, validateIntervals,
    id() { return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; },
    status(message, error = false) {
      document.getElementById("save-status").textContent = message;
      document.getElementById("save-status").classList.toggle("error-message", error);
    },
    save() {
      if (store.blocked) { ui.notify("Повреждённое состояние не заменяем. Сначала скачайте исходный файл или выполните явный сброс."); return false; }
      try {
        validate(store.state);
        localStorage.setItem(KEY, JSON.stringify(store.state));
        store.dirty = false; store.status("сохранено в этом браузере");
        return true;
      } catch (error) {
        store.dirty = true; store.status("не сохранено, доступна выгрузка из памяти", true);
        ui.notify(`Сохранение не удалось (${error.name}). Изменения остались в памяти. Повторите запись или скачайте JSON-копию.`);
        return false;
      }
    },
    change(mutator) {
      if (store.blocked) { ui.notify("Изменения заблокированы до восстановления повреждённых данных."); return false; }
      const next = clone(store.state);
      try {
        mutator(next);
        const inputs = state => JSON.stringify([state.tasks, state.sessions, state.meetings, state.settings]);
        if (inputs(next) !== inputs(store.state)) next.plans.forEach(plan => {
          const prior = store.state.plans.find(p => p.id === plan.id);
          if (prior && plan.conditionsVersion === prior.conditionsVersion) plan.conditionsVersion++;
        });
        next.revision++; validate(next);
      }
      catch (error) { document.getElementById("form-error").textContent = error.message; ui.notify(error.message); return false; }
      store.state = next; store.dirty = true; store.save();
      document.dispatchEvent(new CustomEvent("myweek:state"));
      return true;
    },
    download(value, filename) {
      const blob = new Blob([typeof value === "string" ? value : JSON.stringify(value, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
      // Освобождение привязано к следующему действию, без фонового таймера.
      document.addEventListener("pointerdown", () => URL.revokeObjectURL(url), { once: true });
    },
  };
  window.MyWeekStore = store;
  try {
    store.raw = localStorage.getItem(KEY);
    if (store.raw !== null) {
      store.state = validate(JSON.parse(store.raw)); store.status("загружено из этого браузера");
    } else store.status("новые данные, изменения сохранятся локально");
  } catch (error) {
    if (store.raw !== null) {
      store.blocked = true; store.status("ошибка загрузки, данные не заменены", true);
      ui.notify(`Данные повреждены или не поддерживаются: ${error.message}. В настройках можно скачать исходный файл или явно сбросить данные.`);
    } else {
      store.dirty = true; store.status("хранилище недоступно, работа в памяти", true);
      ui.notify("Хранилище браузера недоступно. Изменения можно выгрузить из памяти; постоянное сохранение не подтверждено.");
    }
  }
  document.getElementById("development-banner").textContent = "Этап 2 - подключено локальное хранилище. Настройки промежутка сохраняются. Создание задач и планирование подключаются на следующих этапах.";
  if (store.blocked) document.querySelectorAll(".empty-state").forEach(element => {
    element.dataset.loadError = "true";
    element.textContent = "Ошибка загрузки. Содержимое данных неизвестно; восстановление доступно в настройках.";
  });
  document.addEventListener("myweek:state", () => {
    if (!store.blocked) for (const [element, markup] of emptyMarkup) {
      if (element.dataset.loadError === "true") { element.innerHTML = markup; delete element.dataset.loadError; }
    }
  });
  document.addEventListener("myweek:action", event => {
    if (event.defaultPrevented) return;
    const name = event.detail.name;
    if (!["export", "retry-save", "reset"].includes(name)) return;
    event.preventDefault();
    if (name === "export") {
      store.download(store.blocked ? store.raw : { ...store.clone(store.state), exportedAt: new Date().toISOString() }, store.blocked ? "my-week-damaged.json" : "my-week-copy.json");
      ui.notify(store.blocked ? "Выгружено исходное повреждённое содержимое. Оно не считается корректной резервной копией." : store.dirty ? "Выгружены текущие данные из памяти, включая несохранённые изменения." : "Выгружена JSON-копия текущих данных.");
    }
    if (name === "retry-save") store.save();
    if (name === "reset" && confirm("Удалить все данные Моя неделя? Сначала скачайте копию. Действие необратимо.")) {
      try {
        localStorage.removeItem(KEY); store.state = initialState(); store.raw = null; store.blocked = false; store.dirty = false;
        store.status("данные приложения удалены"); document.dispatchEvent(new CustomEvent("myweek:state"));
      } catch (error) { ui.notify(`Сброс не выполнен (${error.name}). Данные не заменены.`); }
    }
  });
  document.addEventListener("myweek:submit", event => {
    if (event.defaultPrevented || event.detail.kind !== "preferences") return;
    event.preventDefault();
    const values = event.detail.values;
    if (store.change(state => {
      state.settings.gap = Number(values.gap);
      state.settings.workSphere = values.workSphere || null;
      state.settings.restSphere = values.restSphere || null;
      if (values.preferenceSphere) {
        state.settings.preferences = state.settings.preferences.filter(item => item.sphereId !== values.preferenceSphere);
        state.settings.preferences.push({ sphereId: values.preferenceSphere, start: values.start, end: values.end });
      }
    })) document.getElementById("editor-dialog").close();
  });
  window.addEventListener("beforeunload", event => { if (store.dirty) { event.preventDefault(); event.returnValue = ""; } });
})();

(() => {
  const ui = window.MyWeekUI, store = window.MyWeekStore;
  const $ = id => document.getElementById(id);
  const domain = { ui, store };
  window.MyWeekDomain = domain;
  const collectionFor = { sphere: "spheres", goal: "goals", task: "tasks", meeting: "meetings", session: "sessions" };
  function node(tag, text, cls = "") { const result = document.createElement(tag); result.textContent = text; result.className = cls; return result; }
  function button(text, action, id, cls = "text-button") {
    const result = node("button", text, cls); result.type = "button"; result.dataset.recordAction = action; result.dataset.id = id; return result;
  }
  function stamp(values) { const time = new Date().toISOString(); return { id: store.id(), createdAt: time, updatedAt: time, ...values }; }
  function history(state, type, objectId, detail) { state.history.push(stamp({ type, objectId, detail })); }
  function conditions(state) { return { settings: store.clone(state.settings), spheres: store.clone(state.spheres.filter(s => !s.archived)) }; }
  function ensurePlan(state, week) {
    let plan = state.plans.find(item => item.week === week);
    if (!plan) {
      plan = stamp({ week, status: "draft", conditionsVersion: 1, candidates: [], mandatory: [], conditions: conditions(state), violations: [], variants: [], snapshot: null });
      state.plans.push(plan);
    }
    return plan;
  }
  function planFor(week = ui.week) { return store.state.plans.find(item => item.week === week); }
  function windows(state, date) {
    const plan = state.plans.find(p => p.week === ui.monday(date));
    const settings = plan ? plan.conditions.settings : state.settings;
    const day = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
    return Object.hasOwn(settings.exceptions, date) ? settings.exceptions[date] : settings.availability[day];
  }
  function parseIntervals(value) {
    if (!value.trim()) return [];
    const result = value.split(",").map(part => {
      const match = part.trim().match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
      if (!match) throw new Error("Укажите окна в формате 09:00-12:00, 14:00-18:00");
      return { start: match[1], end: match[2] };
    }).sort((a, b) => a.start.localeCompare(b.start));
    store.validateIntervals(result); return result;
  }
  function conflicts(state, entry, ignoreId = null) {
    const list = [];
    const start = store.minutes(entry.start), end = store.minutes(entry.end);
    const plan = state.plans.find(p => p.week === ui.monday(entry.date));
    const settings = plan ? plan.conditions.settings : state.settings;
    if (!windows(state, entry.date).some(w => start >= store.minutes(w.start) && end <= store.minutes(w.end))) list.push("Выход за доступность");
    const occupied = [...state.sessions, ...state.meetings].filter(item => item.id !== ignoreId && item.date === entry.date);
    for (const other of occupied) {
      if (start < store.minutes(other.end) + settings.gap && end + settings.gap > store.minutes(other.start)) {
        const name = other.name || state.tasks.find(t => t.id === other.taskId)?.name || "занятие";
        list.push(`Пересечение или недостаточный промежуток: ${name}`);
      }
    }
    const task = state.tasks.find(item => item.id === entry.taskId);
    if (task?.deadline && (entry.date > task.deadline || (entry.date === task.deadline && entry.end > (task.deadlineTime || "23:59")))) list.push("После дедлайна задачи");
    return list;
  }
  function remaining(task) { return (task.duration || 0) - store.state.sessions.filter(s => s.taskId === task.id).reduce((sum, s) => sum + s.volume, 0); }
  Object.assign(domain, { node, button, stamp, history, conditions, ensurePlan, planFor, windows, parseIntervals, conflicts, remaining });
  function list(container, items, build, emptyText) {
    container.replaceChildren(); container.classList.remove("empty-state");
    if (!items.length) { container.append(node("p", emptyText, "muted")); return; }
    items.forEach(item => container.append(build(item)));
  }
  function taskCard(task) {
    const card = node("article", "", "record-card");
    const sphere = store.state.spheres.find(s => s.id === task.sphereId);
    card.append(node("h3", task.name), node("p", `${sphere?.name || "сфера"} · ${task.duration === null ? "без длительности" : `${task.duration} мин`} · ${task.done ? "выполнена" : "не выполнена"}${task.archived ? " · архив" : ""}`, "muted"));
    if (task.deadline) card.append(node("p", `Дедлайн - ${task.deadline}${task.deadlineTime ? " " + task.deadlineTime : ""}`, "muted"));
    const actions = node("div", "", "record-actions");
    actions.append(button("Редактировать", "edit-task", task.id), button(task.done ? "Отменить выполнение" : "Выполнить", "done-task", task.id));
    if (!task.archived && !task.done) actions.append(button("Назначить время", "schedule", task.id), button("В кандидаты недели", "candidate", task.id));
    actions.append(button(task.archived ? "Вернуть из архива" : "В архив", "archive-task", task.id));
    card.append(actions);
    const parts = store.state.sessions.filter(s => s.taskId === task.id);
    if (parts.length) {
      card.append(node("p", `Незапланированный остаток - ${remaining(task)} мин`, "muted"));
      parts.forEach(part => {
        const row = node("div", "", "part-row");
        row.append(node("span", `${part.date}, ${part.start}-${part.end} · ${part.volume} мин${part.done ? " · выполнено" : ""}`), button("Перенести", "edit-session", part.id), button(part.done ? "Снять отметку" : "Выполнить", "done-session", part.id), button("Удалить часть", "delete-session", part.id));
        card.append(row);
      });
    }
    return card;
  }
  function basicCard(item, kind, description) {
    const card = node("article", "", "record-card"); card.append(node("h3", item.name), node("p", description, "muted"));
    const actions = node("div", "", "record-actions"); actions.append(button("Редактировать", "edit-" + kind, item.id), button(item.archived ? "Вернуть" : "В архив", "archive-" + kind, item.id));
    if (kind === "goal") actions.append(button(item.done ? "Вернуть в активные" : "Завершить цель", "done-goal", item.id));
    card.append(actions); return card;
  }
  function render() {
    if (store.blocked) return;
    const state = store.state;
    const spheres = state.spheres.filter(s => !s.archived);
    const sphereFilter = $("task-sphere-filter");
    const prior = sphereFilter.value; sphereFilter.replaceChildren(new Option("Все сферы", "")); spheres.forEach(s => sphereFilter.append(new Option(s.name, s.id))); sphereFilter.value = prior;
    const goalFilter = $("task-goal-filter"), priorGoal = goalFilter.value;
    goalFilter.replaceChildren(new Option("Все цели", ""), new Option("Без цели", "none")); state.goals.forEach(g => goalFilter.append(new Option(g.name, g.id))); goalFilter.value = priorGoal;
    const needle = $("task-search").value.toLocaleLowerCase("ru");
    const status = $("task-status-filter").value, scheduled = $("task-schedule-filter").value, deadline = $("task-deadline-filter").value;
    const tasks = state.tasks.filter(t => t.name.toLocaleLowerCase("ru").includes(needle) && (!sphereFilter.value || t.sphereId === sphereFilter.value)
      && (!goalFilter.value || (goalFilter.value === "none" ? !t.goalId : t.goalId === goalFilter.value))
      && (status === "archive" ? t.archived : !t.archived && (!status || (status === "done" ? t.done : !t.done)))
      && (!scheduled || (scheduled === "planned" ? state.sessions.some(s => s.taskId === t.id) : !state.sessions.some(s => s.taskId === t.id)))
      && (!deadline || (deadline === "set" ? t.deadline : deadline === "none" ? !t.deadline : t.deadline && t.deadline < ui.today && !t.done)));
    list($("task-list"), tasks, taskCard, "Задач нет по выбранным условиям. Добавьте задачу кнопкой сверху.");
    list($("goal-list"), state.goals.filter(g => !g.archived && g.name.toLocaleLowerCase("ru").includes(needle)), g => basicCard(g, "goal", `${state.spheres.find(s => s.id === g.sphereId)?.name || ""} · ${g.criterion || "критерий не задан"}`), "Целей пока нет. Добавьте первую цель.");
    list($("sphere-list"), state.spheres, s => basicCard(s, "sphere", `${s.minimum} ${s.minimumType === "minutes" ? "минут" : "действий"} в неделю${s.archived ? " · архив" : ""}`), "Добавьте сферу для задач и целей.");
    const plan = planFor();
    const candidateItems = state.tasks.filter(t => !t.archived && !t.done);
    list($("candidate-list"), candidateItems, task => {
      const row = node("div", "", "candidate-row"); const label = node("label", "", "checkbox-field");
      const input = document.createElement("input"); input.type = "checkbox"; input.checked = Boolean(plan?.candidates.includes(task.id)); input.dataset.candidate = task.id;
      label.append(input, node("span", task.name));
      const required = node("label", "", "checkbox-field"); const check = document.createElement("input"); check.type = "checkbox"; check.checked = Boolean(plan?.mandatory.includes(task.id)); check.dataset.mandatory = task.id; check.disabled = !input.checked;
      required.append(check, node("span", "обязательно")); row.append(label, required); return row;
    }, "Создайте задачи, затем выберите кандидатов.");
    list($("unscheduled-list"), state.tasks.filter(t => !t.archived && !t.done && (t.duration === null || remaining(t) > 0)), task => {
      const row = node("div", "", "record-card"); row.append(node("strong", task.name), node("p", task.duration === null ? "Нужна длительность для планирования" : `Осталось ${remaining(task)} мин`, "muted"), button("Назначить", "schedule", task.id)); return row;
    }, "Незапланированных задач нет.");
    list($("meeting-list"), state.meetings.filter(m => ui.monday(m.date) === ui.week), meeting => {
      const row = node("div", "", "record-card"); row.append(node("strong", meeting.name), node("p", `${meeting.date} ${meeting.start}-${meeting.end}`, "muted"), button("Редактировать", "edit-meeting", meeting.id), button("Удалить", "delete-meeting", meeting.id)); return row;
    }, "Встреч на этой неделе нет.");
    const selectedSettings = plan?.conditions.settings || state.settings;
    $("availability-summary").textContent = selectedSettings.availability.map((windows, day) => `${["пн", "вт", "ср", "чт", "пт", "сб", "вс"][day]}: ${windows.map(w => `${w.start}-${w.end}`).join(", ") || "нет окон"}`).join(" · ");
    ui.updateCalendar();
    const timeBody = document.querySelector(".time-column .day-body"); timeBody.replaceChildren();
    for (let hour = 0; hour < 24; hour++) timeBody.append(node("div", `${String(hour).padStart(2, "0")}:00`, "hour-label"));
    for (const dayBody of document.querySelectorAll("[data-day]")) {
      const date = dayBody.dataset.day;
      for (const interval of windows(state, date)) {
        const block = node("div", "", "available-block"); block.style.top = `${store.minutes(interval.start) * 2 / 3}px`; block.style.height = `${(store.minutes(interval.end) - store.minutes(interval.start)) * 2 / 3}px`; dayBody.append(block);
      }
      const entries = [...state.sessions.filter(s => s.date === date), ...state.meetings.filter(m => m.date === date)];
      entries.forEach(entry => {
        const task = state.tasks.find(t => t.id === entry.taskId);
        const block = button(`${entry.start} · ${task?.name || entry.name}${entry.done ? " ✓" : ""}`, task ? "edit-session" : "edit-meeting", entry.id, "calendar-entry" + (task ? "" : " meeting-entry"));
        block.title = `${task?.name || entry.name}, ${entry.start}-${entry.end}${task ? ", " + entry.volume + " мин" : ""}`;
        block.style.top = `${store.minutes(entry.start) * 2 / 3}px`; block.style.height = `${Math.max(10, (store.minutes(entry.end) - store.minutes(entry.start)) * 2 / 3)}px`; dayBody.append(block);
      });
    }
    const scroll = document.querySelector(".calendar-scroll");
    if (scroll.dataset.week !== ui.week) { scroll.dataset.week = ui.week; scroll.scrollTop = 320; }
    const warnings = state.sessions.filter(s => ui.monday(s.date) === ui.week).flatMap(s => conflicts(state, s, s.id).map(reason => `${state.tasks.find(t => t.id === s.taskId)?.name || "занятие"}: ${reason}`));
    $("week-warnings").textContent = [...new Set(warnings)].join(" · ");
    $("plan-status").textContent = plan?.status === "confirmed" ? "подтверждён" : "черновик";
    list($("minimum-list"), plan?.conditions.spheres || spheres, sphere => {
      const minutes = state.sessions.filter(s => ui.monday(s.date) === ui.week && state.tasks.find(t => t.id === s.taskId)?.sphereId === sphere.id).reduce((total, s) => total + s.volume, 0);
      const actions = state.tasks.filter(t => t.sphereId === sphere.id && t.duration && state.sessions.filter(s => s.taskId === t.id && ui.monday(s.date) === ui.week).reduce((sum, s) => sum + s.volume, 0) === t.duration).length;
      return node("p", `${sphere.name} - ${sphere.minimumType === "minutes" ? minutes : actions} / ${sphere.minimum} ${sphere.minimumType === "minutes" ? "мин" : "действий"}`, "muted");
    }, "Минимумы сфер пока не заданы.");
  }
  domain.render = render;
  document.addEventListener("myweek:submit", event => {
    if (event.defaultPrevented) return;
    const { kind, id, values } = event.detail;
    if (![...Object.keys(collectionFor), "availability", "exception"].includes(kind)) return;
    event.preventDefault();
    try {
      let patch = { ...values, updatedAt: new Date().toISOString() };
      if (kind === "sphere") patch.minimum = Number(values.minimum);
      if (kind === "goal") patch = { ...patch, description: values.description || "", criterion: values.criterion || "", deadline: values.deadline || null };
      if (kind === "task") patch = { ...patch, goalId: values.goalId || null, duration: values.duration ? Number(values.duration) : null, deadline: values.deadline || null, deadlineTime: values.deadlineTime || null, splittable: values.splittable };
      if (kind === "session") {
        patch.volume = Number(values.volume);
        const task = store.state.tasks.find(t => t.id === patch.taskId);
        if (!task || (!id && (task.archived || task.done))) throw new Error("Выберите активную невыполненную задачу");
        if (!(store.minutes(patch.start) < store.minutes(patch.end))) throw new Error("Начало должно быть раньше окончания");
        const parts = store.state.sessions.filter(s => s.taskId === patch.taskId && s.id !== id);
        if (!task.splittable && parts.length) throw new Error("Неделимая задача уже имеет занятие");
        if (!task.splittable && patch.volume !== task.duration) throw new Error("Неделимая задача размещается целиком");
        const existing = id ? store.state.sessions.find(s => s.id === id) : null;
        const issues = conflicts(store.state, patch, id);
        if (existing?.done) issues.push("Перенос выполненного занятия");
        if (issues.length && !confirm(issues.join("\n") + "\nСохранить после предупреждения?")) return;
      }
      if (store.change(state => {
        if (kind === "availability") { state.settings.availability[Number(values.day)] = parseIntervals(values.intervals); history(state, "availability", "settings", values); return; }
        if (kind === "exception") { state.settings.exceptions[values.date] = parseIntervals(values.intervals); history(state, "exception", "settings", values); return; }
        const key = collectionFor[kind];
        const old = state[key].find(item => item.id === id);
        if (old) {
          if (kind === "session" && (old.date !== patch.date || old.start !== patch.start)) history(state, "move", old.id, { old: { date: old.date, start: old.start, end: old.end }, new: { date: patch.date, start: patch.start, end: patch.end }, name: state.tasks.find(t => t.id === old.taskId)?.name });
          Object.assign(old, patch);
        } else state[key].push(stamp({ archived: false, ...(kind === "task" || kind === "session" ? { done: false } : {}), ...patch }));
        if (kind === "task") state.plans.filter(p => p.candidates.includes(id)).forEach(p => p.conditionsVersion++);
        if (kind === "session") ensurePlan(state, ui.monday(patch.date));
        history(state, old ? "edit" : "create", old?.id || state[key].at(-1).id, { kind, name: patch.name || kind });
      })) { $("editor-dialog").close(); ui.notify(store.dirty ? "Изменение осталось в памяти, запись не удалась." : "Изменение сохранено."); }
    } catch (error) { $("form-error").textContent = error.message; }
  });
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-record-action]"); if (!target) return;
    const action = target.dataset.recordAction, id = target.dataset.id;
    const kind = action.split("-").slice(1).join("-");
    if (action.startsWith("edit-") && collectionFor[kind]) {
      const item = store.state[collectionFor[kind]].find(row => row.id === id); if (item) ui.openForm(kind, item, id); return;
    }
    if (action === "schedule") {
      const task = store.state.tasks.find(t => t.id === id);
      if (!task.duration) { ui.notify("Сначала задайте длительность задачи."); return; }
      ui.openForm("session", { taskId: id, date: ui.week, start: "09:00", end: "10:00", volume: remaining(task) }); return;
    }
    if (action === "candidate") {
      store.change(state => { const plan = ensurePlan(state, ui.week); if (!plan.candidates.includes(id)) { plan.candidates.push(id); plan.conditionsVersion++; } }); ui.showStep("prepare"); return;
    }
    if (action.startsWith("archive-") && collectionFor[kind]) {
      const item = store.state[collectionFor[kind]].find(row => row.id === id);
      if (!item) return;
      const sphereTasks = kind === "sphere" ? store.state.tasks.filter(t => t.sphereId === id && !t.archived && !t.done) : [];
      const sphereHabits = kind === "sphere" ? store.state.habits.filter(h => h.sphereId === id && !h.archived) : [];
      if (!item.archived && (sphereTasks.length || sphereHabits.length) && !confirm("В сфере есть активные задачи или привычки. Архивировать их и исключить из будущего планирования?")) return;
      store.change(state => {
        const record = state[collectionFor[kind]].find(row => row.id === id); record.archived = !record.archived;
        const taskIds = new Set(record.archived ? (kind === "task" ? [id] : sphereTasks.map(t => t.id)) : []);
        state.tasks.filter(t => taskIds.has(t.id)).forEach(t => t.archived = true);
        if (kind === "sphere" && record.archived) state.habits.filter(h => h.sphereId === id).forEach(h => h.archived = true);
        state.sessions = state.sessions.filter(s => !taskIds.has(s.taskId) || s.done || s.date < ui.today);
        state.plans.forEach(p => { p.candidates = p.candidates.filter(t => !taskIds.has(t)); p.mandatory = p.mandatory.filter(t => !taskIds.has(t)); p.conditionsVersion++; });
        history(state, "archive", id, { kind, name: item.name });
      }); return;
    }
    if (action === "delete-session" || action === "delete-meeting") {
      if (!confirm(action === "delete-session" ? "Удалить часть? Её объём вернётся в незапланированный остаток." : "Удалить встречу?")) return;
      const key = action === "delete-session" ? "sessions" : "meetings";
      store.change(state => { const item = state[key].find(s => s.id === id); history(state, "delete", id, store.clone(item)); state[key] = state[key].filter(s => s.id !== id); }); return;
    }
    if (action === "done-task") {
      const task = store.state.tasks.find(t => t.id === id);
      if (!task.done && !confirm("Отметить задачу и все существующие части выполненными?")) return;
      store.change(state => {
        const t = state.tasks.find(t => t.id === id); t.done = !t.done;
        state.sessions.filter(s => s.taskId === id).forEach(s => {
          if (t.done && !s.done) { s.done = true; s.completedByTask = true; }
          else if (!t.done && s.completedByTask) { s.done = false; delete s.completedByTask; }
        }); history(state, "completion", id, { done: t.done });
      }); return;
    }
    if (action === "done-session") store.change(state => { const session = state.sessions.find(s => s.id === id); session.done = !session.done; delete session.completedByTask; if (!session.done) state.tasks.find(t => t.id === session.taskId).done = false; history(state, "completion", id, { done: session.done }); });
  });
  document.addEventListener("change", event => {
    const input = event.target;
    if (input.dataset.candidate || input.dataset.mandatory) store.change(state => {
      const plan = ensurePlan(state, ui.week); const id = input.dataset.candidate || input.dataset.mandatory;
      const key = input.dataset.candidate ? "candidates" : "mandatory";
      if (input.checked) { if (!plan[key].includes(id)) plan[key].push(id); }
      else { plan[key] = plan[key].filter(value => value !== id); if (key === "candidates") plan.mandatory = plan.mandatory.filter(value => value !== id); }
      plan.conditionsVersion++;
    });
  });
  document.addEventListener("myweek:action", event => {
    if (event.defaultPrevented || event.detail.name !== "apply-conditions") return;
    event.preventDefault();
    if (confirm("Применить текущие настройки и минимумы к выбранной неделе? Исходный подтверждённый снимок останется прежним.")) store.change(state => {
      const plan = ensurePlan(state, ui.week); plan.conditions = conditions(state); plan.conditionsVersion++;
      history(state, "conditions", plan.id, { week: ui.week });
    });
  });
  document.querySelectorAll('.filter-bar input, .filter-bar select').forEach(input => input.addEventListener("input", render));
  document.addEventListener("myweek:state", render); document.addEventListener("myweek:view", render);
  $("form-submit").textContent = "Сохранить";
  $("development-banner").textContent = "Этап 3 - работает ручное планирование. Автоматические варианты, привычки и расширенные итоги появятся на следующих этапах.";
  render();
})();

(() => {
  const d = window.MyWeekDomain, { ui, store } = d;
  const $ = id => document.getElementById(id);
  const round = value => Math.ceil(value / 15) * 15;
  const time = value => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  const taskOrder = (a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999") || a.id.localeCompare(b.id);
  function metrics(state, plan) {
    const sessions = state.sessions.filter(s => ui.monday(s.date) === plan.week);
    return plan.conditions.spheres.map(sphere => {
      const parts = sessions.filter(s => state.tasks.find(t => t.id === s.taskId)?.sphereId === sphere.id);
      const minutes = parts.reduce((sum, part) => sum + part.volume, 0);
      const actions = state.tasks.filter(t => t.sphereId === sphere.id && t.duration && parts.filter(p => p.taskId === t.id).reduce((sum, p) => sum + p.volume, 0) === t.duration).length;
      const value = sphere.minimumType === "minutes" ? minutes : actions;
      return { ...sphere, minutes, actions, value, missing: Math.max(0, sphere.minimum - value) };
    });
  }
  function check(state, plan, future = false) {
    const warnings = [];
    const now = new Date(), nowDate = ui.dateKey(now), nowMinutes = now.getHours() * 60 + now.getMinutes();
    for (const session of state.sessions.filter(s => ui.monday(s.date) === plan.week)) {
      const task = state.tasks.find(t => t.id === session.taskId);
      warnings.push(...d.conflicts(state, session, session.id).map(issue => `${task.name}: ${issue}`));
      if (future && !session.done && (session.date < nowDate || (session.date === nowDate && store.minutes(session.start) <= nowMinutes))) warnings.push(`${task.name}: начало уже прошло`);
      const preference = plan.conditions.settings.preferences.find(p => p.sphereId === task.sphereId);
      if (preference && !(session.start >= preference.start && session.end <= preference.end)) warnings.push(`${task.name}: вне предпочтительного времени`);
    }
    const rows = metrics(state, plan);
    rows.filter(row => row.missing).forEach(row => warnings.push(`${row.name}: до минимума не хватает ${row.missing} ${row.minimumType === "minutes" ? "мин" : "действий"}`));
    for (const id of plan.mandatory) {
      const task = state.tasks.find(t => t.id === id);
      const planned = state.sessions.filter(s => s.taskId === id && ui.monday(s.date) === plan.week).reduce((sum, s) => sum + s.volume, 0);
      if (planned < (task.duration || Infinity)) warnings.push(`${task.name}: обязательная задача размещена не полностью`);
    }
    return [...new Set(warnings)];
  }
  function freeMinutes(state, week, withSessions = false) {
    let total = 0;
    for (let day = 0; day < 7; day++) {
      const date = ui.addDays(week, day);
      const occupied = state.meetings.filter(m => m.date === date);
      if (withSessions) occupied.push(...state.sessions.filter(s => s.date === date));
      const gap = state.plans.find(p => p.week === week)?.conditions.settings.gap || 0;
      for (const window of d.windows(state, date)) for (let minute = store.minutes(window.start); minute < store.minutes(window.end); minute++) {
        if (!occupied.some(item => minute >= store.minutes(item.start) - (withSessions ? gap : 0) && minute < store.minutes(item.end) + (withSessions ? gap : 0))) total++;
      }
    }
    return total;
  }
  function buildVariant(source, plan, mode) {
    const state = store.clone(source), current = state.plans.find(p => p.id === plan.id);
    const candidateIds = new Set(plan.candidates);
    state.sessions = state.sessions.filter(s => ui.monday(s.date) !== plan.week || s.done || !candidateIds.has(s.taskId));
    const initialIds = new Set(state.sessions.map(s => s.id));
    const excluded = [];
    const tasks = state.tasks.filter(t => candidateIds.has(t.id) && !t.done && !t.archived).sort(taskOrder);
    const tried = new Set();
    const now = new Date(), nowDate = ui.dateKey(now), nowMinutes = now.getHours() * 60 + now.getMinutes();
    function allocate(task) {
      tried.add(task.id);
      if (!task.duration) { excluded.push({ taskId: task.id, reason: "нет длительности" }); return; }
      let left = task.duration - state.sessions.filter(s => s.taskId === task.id).reduce((sum, s) => sum + s.volume, 0);
      if (task.splittable && task.duration >= 30 && left > 0 && left < 30) { excluded.push({ taskId: task.id, reason: "остаток меньше минимальной автоматической части 30 минут", remaining: left }); return; }
      const before = left;
      const preference = plan.conditions.settings.preferences.find(p => p.sphereId === task.sphereId);
      for (const prefer of preference ? [true, false] : [false]) {
        for (let day = 0; day < 7 && left > 0; day++) {
          const date = ui.addDays(plan.week, day);
          if (date < nowDate || (task.deadline && date > task.deadline)) continue;
          for (const interval of d.windows(state, date)) {
            let start = round(Math.max(store.minutes(interval.start), date === nowDate ? nowMinutes + 1 : 0));
            const end = Math.min(store.minutes(interval.end), task.deadline === date ? store.minutes(task.deadlineTime || "23:59") : 1439);
            for (; start < end && left > 0; start += 15) {
              let size = round(left);
              if (task.splittable && left >= 30) size = Math.min(size, Math.floor((end - start) / 15) * 15);
              for (; size >= (task.splittable && left >= 30 ? 30 : round(left)); size -= 15) {
                let volume = Math.min(left, size);
                if (left - volume > 0 && left - volume < 30) volume -= 30 - (left - volume);
                if (volume <= 0 || (left >= 30 && volume < 30) || start + round(volume) > end) continue;
                const entry = { taskId: task.id, date, start: time(start), end: time(start + round(volume)), volume, done: false };
                if (prefer && !(entry.start >= preference.start && entry.end <= preference.end)) continue;
                if (d.conflicts(state, entry).length) continue;
                state.sessions.push(d.stamp(entry)); left -= volume; break;
              }
            }
          }
        }
      }
      if (left > 0) excluded.push({ taskId: task.id, reason: task.deadline ? "не размещено до дедлайна текущим алгоритмом" : !task.splittable && before === task.duration ? "нет подходящего непрерывного окна" : "не размещено текущим алгоритмом", remaining: left });
    }
    tasks.filter(t => plan.mandatory.includes(t.id)).forEach(allocate);
    let progress = true;
    while (progress) {
      progress = false;
      for (const sphere of metrics(state, current).filter(s => s.missing).sort((a, b) => a.id.localeCompare(b.id))) {
        const task = tasks.find(t => t.sphereId === sphere.id && !tried.has(t.id));
        if (task) { allocate(task); progress = true; }
      }
    }
    const baseFree = freeMinutes(state, plan.week);
    while (tasks.some(t => !tried.has(t.id))) {
      const rows = metrics(state, current);
      const load = id => rows.find(s => s.id === id)?.minutes || 0;
      const preferredSphere = mode === "work" ? plan.conditions.settings.workSphere : mode === "rest" ? plan.conditions.settings.restSphere : null;
      const task = tasks.filter(t => !tried.has(t.id)).sort((a, b) => preferredSphere ? Number(b.sphereId === preferredSphere) - Number(a.sphereId === preferredSphere) || taskOrder(a, b) : load(a.sphereId) - load(b.sphereId) || taskOrder(a, b))[0];
      if (mode === "rest") {
        const before = store.clone(state.sessions); allocate(task);
        if (freeMinutes(state, plan.week, true) < baseFree * .25) { state.sessions = before; excluded.push({ taskId: task.id, reason: "ограничение восстановительного режима" }); }
      } else allocate(task);
    }
    const warnings = check(state, current, true);
    if (mode === "rest" && freeMinutes(state, plan.week, true) < baseFree * .25) warnings.push("Обязательные действия и минимумы оставили менее 25% свободного времени");
    return d.stamp({ mode, conditionsVersion: plan.conditionsVersion, sessions: state.sessions.filter(s => !initialIds.has(s.id)), excluded: [...new Map(excluded.map(item => [item.taskId, item])).values()], warnings, metrics: metrics(state, current), freeMinutes: freeMinutes(state, plan.week, true) });
  }
  function generate(state, plan) {
    const modes = ["balanced"];
    if (plan.conditions.settings.workSphere) modes.push("work");
    if (plan.conditions.settings.restSphere) modes.push("rest");
    const variants = modes.map(mode => buildVariant(state, plan, mode));
    const signatures = new Set();
    return variants.filter(variant => {
      const signature = JSON.stringify(variant.sessions.map(s => [s.taskId, s.date, s.start, s.end, s.volume]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
      if (signatures.has(signature)) return false; signatures.add(signature); return true;
    });
  }
  Object.assign(d, { metrics, check, generate });
  function renderVariants() {
    if (store.blocked) return;
    const plan = d.planFor();
    const container = $("variant-list"); container.replaceChildren(); container.className = "card-grid";
    if (!plan?.variants.length) container.append(d.node("p", "Вариантов для этой недели пока нет. Выберите кандидатов и постройте варианты.", "muted"));
    const settings = plan?.conditions.settings || store.state.settings;
    if (!settings.workSphere || !settings.restSphere) container.append(d.node("p", "Для рабочего и восстановительного режимов назначьте соответствующие сферы в настройках и примените условия к неделе. Одинаковые расписания объединяются.", "muted"));
    for (const variant of plan?.variants || []) {
      const card = d.node("article", "", "card");
      card.append(d.node("h3", { balanced: "Сбалансированный", work: "Рабочий", rest: "Восстановительный" }[variant.mode]));
      card.append(d.node("p", `Свободно ${variant.freeMinutes} мин · исключено ${variant.excluded.length}`, "muted"));
      variant.metrics.forEach(s => card.append(d.node("p", `${s.name} - ${s.minutes} мин, ${s.actions} действий${s.missing ? `; до минимума ${s.missing}` : ""}`, "muted")));
      variant.excluded.forEach(item => card.append(d.node("p", `${store.state.tasks.find(t => t.id === item.taskId)?.name || "задача"} - ${item.reason}`, "muted")));
      variant.warnings.forEach(warning => card.append(d.node("p", warning, "error-message")));
      const stale = variant.conditionsVersion !== plan.conditionsVersion;
      if (stale) card.append(d.node("p", "Условия изменились. Постройте варианты заново.", "error-message"));
      const choose = d.button("Выбрать и открыть", "choose-variant", variant.id, "secondary-button"); choose.disabled = stale; card.append(choose); container.append(card);
    }
  }
  document.addEventListener("myweek:action", event => {
    if (event.defaultPrevented || !["generate", "confirm"].includes(event.detail.name)) return;
    event.preventDefault();
    if (event.detail.name === "generate") {
      if (ui.week < ui.monday()) { ui.notify("Для прошлой недели генерация отключена."); return; }
      if (d.planFor()?.status === "confirmed" && !confirm("Построить новые варианты для подтверждённой недели? План изменится только после выбора; выполненные занятия сохранятся.")) return;
      store.change(state => { const plan = d.ensurePlan(state, ui.week); plan.variants = generate(state, plan); }); ui.showStep("variants");
    } else {
      const plan = d.planFor();
      if (!plan) { ui.notify("Сначала подготовьте неделю или добавьте занятия."); return; }
      const warnings = check(store.state, plan, true);
      if (warnings.length && !confirm(warnings.join("\n") + "\nПодтвердить план с этими нарушениями?")) return;
      store.change(state => {
        const p = state.plans.find(item => item.id === plan.id); p.status = "confirmed"; p.violations = warnings;
        if (!p.snapshot) p.snapshot = { confirmedAt: new Date().toISOString(), conditions: store.clone(p.conditions), sessions: store.clone(state.sessions.filter(s => ui.monday(s.date) === p.week).map(s => ({ ...s, name: state.tasks.find(t => t.id === s.taskId)?.name, sphereId: state.tasks.find(t => t.id === s.taskId)?.sphereId }))) };
        d.history(state, "confirm", p.id, { week: p.week, warnings });
      }); ui.notify("План подтверждён. Исходный снимок сохранён.");
    }
  });
  document.addEventListener("click", event => {
    const target = event.target.closest('[data-record-action="choose-variant"]'); if (!target) return;
    const plan = d.planFor(), variant = plan?.variants.find(v => v.id === target.dataset.id);
    if (!variant || variant.conditionsVersion !== plan.conditionsVersion) { ui.notify("Вариант устарел. Постройте заново."); return; }
    const next = store.clone(store.state); const ids = new Set(plan.candidates);
    next.sessions = next.sessions.filter(s => ui.monday(s.date) !== ui.week || s.done || !ids.has(s.taskId)); next.sessions.push(...store.clone(variant.sessions));
    const issues = check(next, plan, true);
    if (issues.some(issue => issue.includes("начало уже прошло"))) { ui.notify("Время варианта уже прошло. Постройте заново."); return; }
    if (store.change(state => { state.sessions = next.sessions; state.plans.find(p => p.id === plan.id).selectedVariant = variant.id; })) ui.showStep("calendar");
  });
  document.addEventListener("myweek:state", renderVariants); document.addEventListener("myweek:view", renderVariants);
  $("development-banner").textContent = "Этап 4 - доступны ручное планирование, варианты и подтверждение. Привычки и расширенные итоги подключаются дальше.";
  renderVariants();
})();

(() => {
  const d = window.MyWeekDomain, { ui, store } = d;
  const $ = id => document.getElementById(id);
  function ruleAt(habit, date) { return habit.rules.filter(r => r.from <= date).at(-1); }
  function habitTarget(habit, week) {
    if (Object.hasOwn(habit.targets || {}, week)) return habit.targets[week];
    const rules = Array.from({ length: 7 }, (_, day) => ruleAt(habit, ui.addDays(week, day)));
    if (rules.every(rule => !rule || rule.mode === "paused")) return 0;
    const frequency = rules.find(rule => rule?.mode === "frequency");
    if (frequency) return frequency.frequency;
    return rules.filter((rule, day) => rule?.mode === "days" && rule.days.includes(day)).length;
  }
  function mark(habitId, date, checked) {
    const habit = store.state.habits.find(h => h.id === habitId), rule = habit && ruleAt(habit, date);
    const day = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
    if (!habit || !store.validDate(date) || date > ui.today) { ui.notify("Будущие даты привычки недоступны."); return; }
    if (checked && (!rule || rule.mode === "paused" || habit.archived || (rule.mode === "days" && !rule.days.includes(day)))) { ui.notify("В этот день привычка не предусмотрена правилом."); return; }
    store.change(state => {
      const exists = state.habitMarks.find(m => m.habitId === habitId && m.date === date);
      if (checked && !exists) state.habitMarks.push(d.stamp({ habitId, date }));
      if (!checked) state.habitMarks = state.habitMarks.filter(m => m.habitId !== habitId || m.date !== date);
    });
  }
  Object.assign(d, { ruleAt, habitTarget, mark });
  function habitCard(habit, week = ui.week, oneDate = null) {
    const card = d.node("article", "", "record-card");
    const marks = store.state.habitMarks.filter(m => m.habitId === habit.id && ui.monday(m.date) === week).length;
    card.append(d.node("h3", habit.name), d.node("p", `${marks} / ${habitTarget(habit, week)} за неделю${habit.archived ? " · архив" : ""}`, "muted"));
    const grid = d.node("div", "", "habit-days");
    const dates = oneDate ? [oneDate] : Array.from({ length: 7 }, (_, day) => ui.addDays(week, day));
    dates.forEach(date => {
      const label = d.node("label", "", "checkbox-field"); const input = document.createElement("input"); input.type = "checkbox"; input.dataset.habitMark = habit.id; input.dataset.date = date;
      input.checked = store.state.habitMarks.some(m => m.habitId === habit.id && m.date === date);
      const rule = ruleAt(habit, date), day = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
      input.disabled = date > ui.today || (!input.checked && (habit.archived || !rule || rule.mode === "paused" || (rule.mode === "days" && !rule.days.includes(day))));
      label.append(input, d.node("span", date.slice(8))); grid.append(label);
    });
    card.append(grid);
    if (!oneDate) {
      const actions = d.node("div", "", "record-actions");
      const paused = ruleAt(habit, ui.today)?.mode === "paused";
      actions.append(d.button("Правила", "edit-habit", habit.id), d.button(paused ? "Возобновить" : "Пауза", "pause-habit", habit.id), d.button(habit.archived ? "Вернуть" : "Архив", "archive-habit", habit.id)); card.append(actions);
    }
    return card;
  }
  function fill(id, items, build, empty) {
    $(id).replaceChildren(); $(id).classList.remove("empty-state");
    if (!items.length) $(id).append(d.node("p", empty, "muted")); else items.forEach(item => $(id).append(build(item)));
  }
  function renderDaily() {
    if (store.blocked) return;
    const state = store.state, date = $("today-date").value || ui.today;
    const entries = [...state.sessions.filter(s => s.date === date), ...state.meetings.filter(m => m.date === date)].sort((a, b) => a.start.localeCompare(b.start));
    fill("today-schedule", entries, entry => {
      const task = state.tasks.find(t => t.id === entry.taskId);
      const card = d.node("div", "", "record-card"); card.append(d.node("strong", `${entry.start}-${entry.end} · ${task?.name || entry.name}${entry.done ? " ✓" : ""}`));
      card.append(d.button("Открыть / перенести", task ? "edit-session" : "edit-meeting", entry.id));
      if (task) card.append(d.button(entry.done ? "Снять отметку" : "Выполнить", "done-session", entry.id)); return card;
    }, "В этот день нет встреч или занятий. Откройте неделю, чтобы составить план.");
    fill("today-habits", state.habits.filter(h => !h.archived), habit => habitCard(habit, ui.monday(date), date), "Привычек пока нет.");
    fill("habit-list", state.habits, habit => habitCard(habit), "Создайте привычку кнопкой сверху.");
    fill("overdue-list", state.tasks.filter(t => !t.done && !t.archived && (!state.sessions.some(s => s.taskId === t.id) || (t.deadline && (t.deadline < date || (t.deadline === ui.today && t.deadlineTime && t.deadlineTime < new Date().toTimeString().slice(0, 5)))))), task => {
      const card = d.node("div", "", "record-card"); card.append(d.node("strong", task.name), d.node("p", task.deadline && task.deadline < date ? "Просрочена" : "Пока не выполнена", "muted")); return card;
    }, "Нет задач, требующих внимания.");
    const wellbeing = state.wellbeing.find(w => w.date === date);
    $("wellbeing-summary").textContent = wellbeing ? `${wellbeing.rating} / 5 · ${wellbeing.note || "без заметки"}` : "Оценка не задана";
    const week = ui.monday($("history-date").value || ui.week);
    const plan = d.planFor(week); const sessions = state.sessions.filter(s => ui.monday(s.date) === week);
    const original = plan?.snapshot?.sessions || [];
    $("history-summary").replaceChildren(); $("history-summary").classList.remove("empty-state");
    const completed = sessions.filter(s => s.done).reduce((sum, s) => sum + s.volume, 0);
    $("history-summary").append(d.node("h2", `Итоги недели от ${week}`), d.node("p", `Исходный план - ${plan?.snapshot ? original.reduce((sum, s) => sum + s.volume, 0) + " мин" : "не подтверждён"}. Текущий план - ${sessions.reduce((sum, s) => sum + s.volume, 0)} мин. Выполнено - ${completed} плановых минут.`, "muted"));
    if (plan) d.metrics(state, plan).forEach(row => $("history-summary").append(d.node("p", `${row.name} - ${row.value} / ${row.minimum} ${row.minimumType === "minutes" ? "мин" : "действий"}`, "muted")));
    const originalList = d.node("details", "", "record-card"); originalList.append(d.node("summary", "Исходный подтверждённый план"));
    original.forEach(s => originalList.append(d.node("p", `${s.date} ${s.start}-${s.end} · ${s.name} · ${s.volume} мин`, "muted"))); $("history-summary").append(originalList);
    const currentList = d.node("details", "", "record-card"); currentList.append(d.node("summary", "Текущий план и выполнение"));
    sessions.forEach(s => currentList.append(d.node("p", `${s.date} ${s.start}-${s.end} · ${state.tasks.find(t => t.id === s.taskId)?.name || "задача"} · ${s.volume} мин${s.done ? " · выполнено" : ""}`, "muted"))); $("history-summary").append(currentList);
    const unplanned = state.history.filter(h => h.type === "completion" && h.detail?.done && ui.monday(ui.dateKey(new Date(h.createdAt))) === week).map(h => state.tasks.find(t => t.id === h.objectId)).filter(t => t?.done && !state.sessions.some(s => s.taskId === t.id));
    if (unplanned.length) $("history-summary").append(d.node("p", `Выполнены без календарного времени - ${[...new Set(unplanned.map(t => t.name))].join(", ")}. В плановые минуты не включены.`, "muted"));
    state.habits.forEach(h => $("history-summary").append(d.node("p", `${h.name} - ${state.habitMarks.filter(m => m.habitId === h.id && ui.monday(m.date) === week).length} / ${habitTarget(h, week)}`, "muted")));
    const mood = state.wellbeing.filter(w => ui.monday(w.date) === week);
    mood.forEach(w => $("history-summary").append(d.node("p", `${w.date} · самочувствие ${w.rating}/5 · ${w.note}`, "muted")));
    fill("history-list", state.history.filter(h => h.detail?.week === week || h.detail?.old?.date && ui.monday(h.detail.old.date) === week || h.detail?.new?.date && ui.monday(h.detail.new.date) === week).slice().reverse(), h => d.node("p", `${new Date(h.createdAt).toLocaleString("ru-RU")} · ${h.type} · ${h.detail?.name || h.objectId}`, "muted"), "Переносов и подтверждений этой недели пока нет.");
  }
  document.addEventListener("myweek:submit", event => {
    if (event.defaultPrevented || !["habit", "wellbeing"].includes(event.detail.kind)) return;
    event.preventDefault(); const { kind, values, id } = event.detail;
    try {
      if (kind === "wellbeing") {
        if (!store.validDate(values.date) || values.date > ui.today) throw new Error("Оценку будущего дня сохранить нельзя");
        if (store.change(state => {
          const item = state.wellbeing.find(w => w.date === values.date);
          const patch = { date: values.date, rating: Number(values.rating), note: values.note || "" };
          if (item) Object.assign(item, patch); else state.wellbeing.push(d.stamp(patch));
        })) $("editor-dialog").close(); return;
      }
      const existing = store.state.habits.find(h => h.id === id);
      if (existing && values.effectiveDate < ui.today) throw new Error("Изменение правила не может переписать прошлые даты");
      const rule = { from: values.effectiveDate, mode: values.mode };
      if (rule.mode === "days") rule.days = [...new Set(values.days.split(",").map(day => Number(day.trim()) - 1))].sort();
      else rule.frequency = Number(values.frequency);
      const week = ui.monday(rule.from);
      if (rule.mode === "frequency" && rule.from !== week && values.partialTarget === "") throw new Error("Явно задайте цель неполной недели");
      const partial = values.partialTarget === "" ? null : Number(values.partialTarget);
      const marks = store.state.habitMarks.filter(m => m.habitId === id && ui.monday(m.date) === week).length;
      if (partial !== null && (!Number.isInteger(partial) || partial < marks || partial > 7)) throw new Error("Цель неполной недели должна быть от числа существующих отметок до 7");
      if (store.change(state => {
        let habit = state.habits.find(h => h.id === id);
        if (!habit) { habit = d.stamp({ name: values.name, sphereId: values.sphereId, archived: false, rules: [], targets: {} }); state.habits.push(habit); }
        habit.name = values.name; habit.sphereId = values.sphereId;
        habit.rules = habit.rules.filter(r => r.from < rule.from); habit.rules.push(rule);
        if (rule.mode === "frequency" && rule.from !== week) habit.targets[week] = partial;
        d.history(state, "habit-rule", habit.id, { week, from: rule.from });
      })) $("editor-dialog").close();
    } catch (error) { $("form-error").textContent = error.message; }
  });
  document.addEventListener("change", event => { if (event.target.dataset.habitMark) mark(event.target.dataset.habitMark, event.target.dataset.date, event.target.checked); });
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-record-action]"); if (!button) return;
    const { recordAction: action, id } = button.dataset;
    if (action === "done-goal") store.change(state => { const goal = state.goals.find(g => g.id === id); goal.done = !goal.done; });
    const habit = store.state.habits.find(h => h.id === id);
    if (action === "edit-habit" && habit) {
      const rule = habit.rules.filter(r => r.mode !== "paused").at(-1);
      ui.openForm("habit", { ...habit, mode: rule.mode, days: rule.days?.map(d => d + 1).join(","), frequency: rule.frequency, effectiveDate: ui.today, partialTarget: habit.targets[ui.monday(ui.today)] }, id);
    }
    if (action === "archive-habit" && habit) store.change(state => { state.habits.find(h => h.id === id).archived = !habit.archived; });
    if (action === "pause-habit" && habit) {
      const prior = ruleAt(habit, ui.today);
      if (!prior) { ui.notify("Привычка ещё не началась. Измените дату начала через правила."); return; }
      const activeRule = habit.resumeRule || habit.rules.filter(r => r.mode !== "paused").at(-1);
      if (prior?.mode === "paused" && !activeRule) { ui.notify("Сначала задайте новое активное правило привычки."); return; }
      const next = prior?.mode === "paused" ? store.clone(activeRule) : { mode: "paused" };
      next.from = ui.today; const week = ui.monday(ui.today);
      let partial = null;
      if (ui.today !== week && habit.rules.some(r => r.mode === "frequency")) {
        const answer = prompt("Явно задайте цель текущей неполной недели (0-7, не меньше уже выполненного)", String(habitTarget(habit, week)));
        if (answer === null) return; partial = Number(answer);
        const count = store.state.habitMarks.filter(m => m.habitId === id && ui.monday(m.date) === week).length;
        if (!Number.isInteger(partial) || partial < count || partial > 7) { ui.notify("Некорректная цель неполной недели."); return; }
      }
      store.change(state => { const h = state.habits.find(h => h.id === id); if (prior?.mode !== "paused") h.resumeRule = store.clone(prior); h.rules = h.rules.filter(r => r.from < ui.today); h.rules.push(next); if (partial !== null) h.targets[week] = partial; d.history(state, "habit-pause", id, { week }); });
    }
    if (action === "done-session") {
      const session = store.state.sessions.find(s => s.id === id), task = store.state.tasks.find(t => t.id === session?.taskId);
      if (task && !task.done && task.duration && store.state.sessions.filter(s => s.taskId === task.id).reduce((sum, s) => sum + s.volume, 0) === task.duration && store.state.sessions.filter(s => s.taskId === task.id).every(s => s.done) && confirm("Все части выполнены. Завершить задачу?")) store.change(state => { state.tasks.find(t => t.id === task.id).done = true; });
    }
  });
  document.addEventListener("myweek:state", renderDaily); document.addEventListener("myweek:view", renderDaily);
  $("development-banner").textContent = "Этап 5 - планирование, выполнение, привычки, самочувствие и итоги. Копирование, шаблоны и импорт подключаются дальше.";
  renderDaily();
})();

(() => {
  const d = window.MyWeekDomain, { ui, store } = d;
  const $ = id => document.getElementById(id);
  ui.schemas.suggestion = { title: "Предложение помощника", fields: [["name", "Название", "text", true], ["sphereId", "Сфера", "sphere", true], ["duration", "Длительность, минут", "number", true, 1], ["explanation", "Пояснение", "textarea"]] };
  function structure(week) {
    const sessions = store.state.sessions.filter(s => ui.monday(s.date) === week);
    const tasks = store.state.tasks.filter(t => sessions.some(s => s.taskId === t.id));
    return { sourceWeek: week, tasks: store.clone(tasks), sessions: sessions.map(s => ({ ...store.clone(s), relativeDay: Math.round((new Date(`${s.date}T12:00:00`) - new Date(`${week}T12:00:00`)) / 86400000) })) };
  }
  function copyStructure(source, targetWeek, includeMeetings = false) {
    if (!source.tasks.length) { ui.notify("В исходной неделе нет задач с занятиями для копирования."); return false; }
    if (source.tasks.some(task => store.state.spheres.find(s => s.id === task.sphereId)?.archived)) { ui.notify("Сначала верните из архива сферы задач, которые хотите скопировать."); return false; }
    const signature = JSON.stringify([source.tasks, source.sessions, includeMeetings]);
    const previous = d.planFor(targetWeek);
    if (previous?.appliedCopies?.includes(signature)) { ui.notify("Копия этой структуры уже добавлена в выбранную неделю."); return false; }
    const state = store.clone(store.state), taskMap = new Map(), created = [];
    for (const original of source.tasks) {
      const copy = { ...store.clone(original), id: store.id(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), done: false, archived: false };
      if (original.deadline) {
        const answer = prompt(`Новый дедлайн для «${original.name}» (YYYY-MM-DD). Пустое поле исключит задачу из копии.`, original.deadline);
        if (answer === null) return false;
        if (!answer.trim()) continue;
        if (!store.validDate(answer)) { ui.notify("Некорректная дата дедлайна. Копирование отменено."); return false; }
        copy.deadline = answer;
      }
      taskMap.set(original.id, copy.id); state.tasks.push(copy); created.push(copy.id);
    }
    if (!created.length) { ui.notify("Все задачи исключены. Копия не создана."); return false; }
    const copiedSessions = source.sessions.filter(s => taskMap.has(s.taskId)).map(session => {
      const copy = { ...store.clone(session), id: store.id(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), taskId: taskMap.get(session.taskId), date: ui.addDays(targetWeek, session.relativeDay), done: false };
      delete copy.relativeDay; delete copy.completedByTask; return copy;
    });
    state.sessions.push(...copiedSessions);
    if (includeMeetings) state.meetings.push(...store.state.meetings.filter(m => ui.monday(m.date) === source.sourceWeek).map(meeting => ({ ...store.clone(meeting), id: store.id(), date: ui.addDays(targetWeek, Math.round((new Date(`${meeting.date}T12:00:00`) - new Date(`${source.sourceWeek}T12:00:00`)) / 86400000)) })));
    const plan = d.ensurePlan(state, targetWeek);
    const issues = [...new Set(copiedSessions.flatMap(s => d.conflicts(state, s, s.id)))];
    if (!confirm(`В неделю от ${targetWeek} будут добавлены ${created.length} задач и ${copiedSessions.length} занятий.\n${issues.length ? "Предупреждения: " + issues.join("; ") + "\n" : ""}Сохранить копию?`)) return false;
    const result = store.change(current => {
      current.tasks = state.tasks; current.sessions = state.sessions; current.meetings = state.meetings;
      const target = d.ensurePlan(current, targetWeek);
      target.status = "draft"; target.appliedCopies = [...(target.appliedCopies || []), signature];
      d.history(current, "copy", target.id, { week: targetWeek, sourceWeek: source.sourceWeek, count: created.length });
    });
    if (result) { ui.week = targetWeek; ui.showStep("calendar"); ui.notify("Копия добавлена как черновик. Выполнение сброшено."); }
    return result;
  }
  Object.assign(d, { structure, copyStructure });
  function targetWeek() {
    const answer = prompt("Дата понедельника новой недели (YYYY-MM-DD)", ui.addDays(ui.week, 7));
    if (answer === null) return null;
    if (!store.validDate(answer) || ui.monday(answer) !== answer) { ui.notify("Введите корректную дату понедельника."); return null; }
    return answer;
  }
  function renderReusable() {
    if (store.blocked) return;
    $("template-list").replaceChildren();
    if (!store.state.templates.length) $("template-list").append(d.node("p", "Сохраните неделю как шаблон в календаре.", "muted"));
    for (const template of store.state.templates) {
      const row = d.node("div", "", "record-card"); row.append(d.node("strong", template.name), d.button("Применить", "apply-template", template.id)); $("template-list").append(row);
    }
    $("suggestion-list").replaceChildren();
    for (const suggestion of store.state.suggestions.filter(s => s.state !== "rejected")) {
      const row = d.node("article", "", "record-card"); row.append(d.node("h3", suggestion.name), d.node("p", `${suggestion.duration} мин · ${suggestion.explanation || ""}`, "muted"));
      if (suggestion.state === "accepted") row.append(d.node("p", "Принято как задача. В кандидаты недели не добавлено автоматически.", "muted"));
      else row.append(d.button("Принять", "accept-suggestion", suggestion.id), d.button("Редактировать", "edit-suggestion", suggestion.id), d.button("Отклонить", "reject-suggestion", suggestion.id));
      $("suggestion-list").append(row);
    }
  }
  document.addEventListener("myweek:action", event => {
    if (event.defaultPrevented || !["copy", "template"].includes(event.detail.name)) return;
    event.preventDefault();
    if (event.detail.name === "copy") {
      const target = targetWeek(); if (!target) return;
      const meetings = store.state.meetings.some(m => ui.monday(m.date) === ui.week) && confirm("Включить ручные встречи в копию? По умолчанию они не копируются.");
      copyStructure(structure(ui.week), target, meetings);
    } else {
      const source = structure(ui.week);
      if (!source.tasks.length) { ui.notify("Добавьте занятия перед созданием шаблона."); return; }
      const name = prompt("Название шаблона", "Моя спокойная неделя"); if (!name?.trim()) return;
      store.change(state => state.templates.push(d.stamp({ name: name.trim(), ...source }))); ui.notify("Шаблон сохранён без встреч и отметок самочувствия.");
    }
  });
  document.addEventListener("myweek:submit", event => {
    if (event.defaultPrevented || !["helper", "suggestion"].includes(event.detail.kind)) return;
    event.preventDefault(); const { kind, id, values } = event.detail;
    if (kind === "suggestion") {
      if (store.change(state => { const suggestion = state.suggestions.find(s => s.id === id); if (suggestion.state === "pending") Object.assign(suggestion, values, { duration: Number(values.duration) }); })) $("editor-dialog").close(); return;
    }
    const goal = store.state.goals.find(g => g.id === values.goalId);
    if (!goal) { $("form-error").textContent = "Выберите существующую цель"; return; }
    if (values.type === "custom") { ui.notify("Для собственной цели используйте ручную форму задачи. Подходящего шаблона нет."); $("editor-dialog").close(); return; }
    const names = { work: ["Определить следующий рабочий шаг", "Поработать над первым результатом"], sport: ["Спокойная тренировка", "Прогулка"], creative: ["Сделать небольшой набросок", "Развить одну творческую идею"], rest: ["Отдохнуть без экрана", "Спокойная прогулка"] };
    if (store.change(state => {
      for (const name of names[values.type]) state.suggestions.push(d.stamp({ name: values.result ? `${name}: ${values.result}` : name, sphereId: goal.sphereId, goalId: goal.id, duration: values.minutes ? Number(values.minutes) : 30, state: "pending", taskId: null, explanation: `Шаг к цели «${goal.name}». ${values.minutes ? "Длительность задана вами." : "Допущение - 30 минут, можно изменить."} ${values.obstacle ? "Учитывайте указанное препятствие: " + values.obstacle : "Препятствия не указаны, оцените предложение самостоятельно."}` }));
    })) $("editor-dialog").close();
  });
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-record-action]"); if (!button) return;
    const { recordAction: action, id } = button.dataset;
    if (action === "apply-template") { const target = targetWeek(); if (target) copyStructure(store.state.templates.find(t => t.id === id), target); }
    if (action === "edit-suggestion") { const suggestion = store.state.suggestions.find(s => s.id === id); ui.openForm("suggestion", suggestion, id); }
    if (action === "reject-suggestion") store.change(state => { state.suggestions.find(s => s.id === id).state = "rejected"; });
    if (action === "accept-suggestion") store.change(state => {
      const suggestion = state.suggestions.find(s => s.id === id);
      if (suggestion.state !== "pending" || suggestion.taskId) return;
      const task = d.stamp({ name: suggestion.name, sphereId: suggestion.sphereId, goalId: suggestion.goalId, duration: suggestion.duration, splittable: false, done: false, archived: false, deadline: null, deadlineTime: null });
      state.tasks.push(task); suggestion.state = "accepted"; suggestion.taskId = task.id;
    });
  });
  document.addEventListener("myweek:state", renderReusable); document.addEventListener("myweek:view", renderReusable);
  $("development-banner").textContent = "Этап 6 - доступны копирование, шаблоны и помощник на правилах. Проверка импорта подключается на следующем этапе.";
  renderReusable();
})();

(() => {
  const d = window.MyWeekDomain, { ui, store } = d;
  const $ = id => document.getElementById(id);
  let pending = null, importRevision = null;
  ui.schemas.importConfirmation = { title: "Восстановление JSON-копии", fields: [["backupSaved", "Я скачал(а) и сохранил(а) текущую копию", "checkbox"], ["declineBackup", "Я явно отказываюсь от страховочной копии", "checkbox"]] };
  function prepareImport(raw) {
    const state = store.validate(JSON.parse(raw));
    pending = store.clone(state); delete pending.exportedAt; importRevision = store.state.revision;
    ui.openForm("importConfirmation");
    $("dialog-description").textContent = `Полная замена текущих данных. В файле ${state.spheres.length} сфер, ${state.goals.length} целей, ${state.tasks.length} задач, ${state.sessions.length} занятий, ${state.plans.length} недель, ${state.habits.length} привычек и ${state.templates.length} шаблонов. История, отметки и исходные снимки также будут восстановлены. Сначала скачайте текущие данные или явно откажитесь от копии.`;
    const download = d.node("button", "Скачать текущие данные", "secondary-button"); download.type = "button"; download.dataset.action = "export"; $("dialog-fields").prepend(download);
    $("form-submit").textContent = "Заменить все данные";
    return state;
  }
  d.prepareImport = prepareImport;
  document.addEventListener("myweek:action", event => {
    if (event.defaultPrevented || event.detail.name !== "import") return;
    event.preventDefault(); $("import-file").value = ""; $("import-file").click();
  });
  $("import-file").addEventListener("change", async event => {
    const file = event.target.files[0]; if (!file) return;
    try { prepareImport(await file.text()); }
    catch (error) { pending = null; ui.notify(`Файл отклонён. Данные не изменены. ${error.message}`); }
  });
  document.addEventListener("myweek:submit", event => {
    if (event.defaultPrevented || event.detail.kind !== "importConfirmation") return;
    event.preventDefault(); const { backupSaved, declineBackup } = event.detail.values;
    try {
      if (Boolean(backupSaved) === Boolean(declineBackup)) throw new Error("Отметьте ровно один пункт - копия сохранена или явный отказ");
      if (!pending) throw new Error("Файл не подготовлен");
      if (store.state.revision !== importRevision) throw new Error("Текущие данные изменились. Проверьте файл заново");
      const state = store.validate(store.clone(pending));
      localStorage.setItem("myWeek.state.v1", JSON.stringify(state));
      store.state = state; store.blocked = false; store.raw = null; store.dirty = false; pending = null;
      store.status("восстановлено и сохранено в этом браузере");
      $("editor-dialog").close(); $("form-submit").textContent = "Сохранить";
      document.dispatchEvent(new CustomEvent("myweek:state")); ui.notify("Данные восстановлены целиком. Идентификаторы, связи и исходные снимки сохранены.");
    } catch (error) { $("form-error").textContent = `Импорт не выполнен, прежние данные сохранены. ${error.message}`; }
  });
  $("editor-dialog").addEventListener("close", () => { if (ui.formKind === "importConfirmation" && !$("editor-dialog").open) { pending = null; $("form-submit").textContent = "Сохранить"; } });
  $("development-banner").hidden = true;
})();

(() => {
  // Этап 0. Изолированная проверка среды, без модели данных планировщика.
  // Основной ключ myWeek.state.v1 на этом этапе не читается и не изменяется.
  const CHECK_KEY = "myWeek.environmentCheck.v1";
  const elements = {
    status: document.getElementById("storage-status"),
    title: document.getElementById("status-title"),
    description: document.getElementById("status-description"),
    detail: document.getElementById("check-detail"),
    button: document.getElementById("run-check"),
    browser: document.getElementById("browser-name"),
    system: document.getElementById("system-name"),
    launchMode: document.getElementById("launch-mode"),
  };

  function showStatus(state, title, description) {
    elements.status.dataset.state = state;
    elements.title.textContent = title;
    elements.description.textContent = description;
  }

  function browserLabel() {
    const agent = navigator.userAgent;
    const candidates = [
      ["Edge", /Edg\/([\d.]+)/],
      ["Opera", /OPR\/([\d.]+)/],
      ["Firefox", /Firefox\/([\d.]+)/],
      ["Chrome / Chromium", /Chrome\/([\d.]+)/],
      ["Safari", /Version\/([\d.]+).*Safari/],
    ];
    for (const [name, pattern] of candidates) {
      const match = agent.match(pattern);
      if (match) return `${name} ${match[1]} (по данным браузера)`;
    }
    return "Не удалось определить; уточните в меню браузера";
  }

  function describeEnvironment() {
    elements.browser.textContent = browserLabel();
    elements.system.textContent = /Windows/.test(navigator.userAgent)
      ? "Windows (версию уточните в настройках системы)"
      : `${navigator.platform || "Не определена"} (по данным браузера)`;
    elements.launchMode.textContent = location.protocol === "file:"
      ? "Файл с диска, без сервера"
      : `Открыто через ${location.protocol}; сценарий приёмки - файл с диска`;
  }

  function isValidCheck(value) {
    return value !== null && typeof value === "object"
      && value.version === 1
      && typeof value.token === "string" && value.token.length > 0
      && typeof value.createdAt === "string"
      && Number.isFinite(Date.parse(value.createdAt))
      && typeof value.pagePath === "string";
  }

  function showStorageError(error, operation) {
    showStatus("error", "Постоянное сохранение недоступно",
      `${operation} не удалось. Проверьте разрешения браузера и используйте обычное окно. Эта среда пока не прошла проверку хранения.`);
    elements.detail.textContent = `Код ошибки - ${error && error.name ? error.name : "неизвестен"}. Успешное сохранение не подтверждено.`;
  }

  function loadCheck() {
    let raw;
    try {
      raw = window.localStorage.getItem(CHECK_KEY);
    } catch (error) {
      showStorageError(error, "Чтение тестовой записи");
      return;
    }
    if (raw === null) return;
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      showStatus("warning", "Тестовая запись повреждена",
        "Старую запись не изменяли. Кнопка проверки явно заменит только тестовую запись; данные планировщика не затрагиваются.");
      return;
    }
    if (!isValidCheck(value)) {
      showStatus("warning", "Формат тестовой записи не распознан",
        "Старую запись не изменяли. Новая проверка заменит только тестовую запись.");
      return;
    }
    if (value.pagePath !== location.pathname) {
      showStatus("warning", "Запись создана для другого пути",
        "Повторите проверку для этой папки. Сохранность после перемещения файлов не подтверждена.");
      return;
    }
    showStatus("success", "Тестовая запись найдена",
      "Запись прочитана после открытия страницы. Если вы закрыли вкладку или браузер и открыли этот же файл, проверка повторного открытия пройдена.");
    elements.detail.textContent = `Запись создана ${new Date(value.createdAt).toLocaleString("ru-RU")}. Закрытие браузера целиком необходимо проверить отдельно.`;
    elements.button.textContent = "Повторить проверку";
  }

  function runCheck() {
    const value = {
      version: 1,
      token: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      pagePath: location.pathname,
    };
    const serialized = JSON.stringify(value);
    try {
      window.localStorage.setItem(CHECK_KEY, serialized);
      if (window.localStorage.getItem(CHECK_KEY) !== serialized) {
        throw new Error("StorageReadBackMismatch");
      }
    } catch (error) {
      showStorageError(error, "Запись и контрольное чтение");
      return;
    }
    showStatus("success", "Запись и чтение работают",
      "Теперь закройте вкладку и снова откройте этот же файл. Ожидаемое сообщение - «тестовая запись найдена».");
    elements.detail.textContent = `Проверено ${new Date(value.createdAt).toLocaleString("ru-RU")}. Сохранность после закрытия ещё не подтверждена.`;
    elements.button.textContent = "Повторить проверку";
  }

  describeEnvironment();
  loadCheck();
  elements.button.addEventListener("click", runCheck);
})();
