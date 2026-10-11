"use strict";

const STORAGE_KEY = "studybuddy-tasks-v1";

const taskForm = document.querySelector("#taskForm");
const titleInput = document.querySelector("#taskTitle");
const deadlineInput = document.querySelector("#taskDeadline");
const titleError = document.querySelector("#titleError");
const deadlineError = document.querySelector("#deadlineError");
const formFeedback = document.querySelector("#formFeedback");
const tasksList = document.querySelector("#tasksList");
const emptyState = document.querySelector("#emptyState");
const emptyTitle = document.querySelector("#emptyTitle");
const emptyMessage = document.querySelector("#emptyMessage");
const storageNotice = document.querySelector("#storageNotice");
const totalTasks = document.querySelector("#totalTasks");
const completedTasks = document.querySelector("#completedTasks");
const remainingTasks = document.querySelector("#remainingTasks");
const visibleTaskCount = document.querySelector("#visibleTaskCount");
const progressText = document.querySelector("#progressText");
const progressTrack = document.querySelector("#progressTrack");
const progressFill = document.querySelector("#progressFill");
const progressMessage = document.querySelector("#progressMessage");
const filterButtons = document.querySelectorAll("[data-filter]");
const todayDate = document.querySelector("#todayDate");

let currentFilter = "all";
let tasks = loadTasks();

showTodayDate();
render();

// Read saved tasks safely. A damaged or unexpected value should not crash the app.
function loadTasks() {
  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);
    if (!savedValue) return [];

    const parsedTasks = JSON.parse(savedValue);
    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks
      .filter((task) => {
        return task && typeof task.id === "string" &&
          typeof task.title === "string" &&
          typeof task.deadline === "string";
      })
      .map((task) => ({
        id: task.id,
        title: task.title,
        deadline: task.deadline,
        completed: task.completed === true
      }));
  } catch (error) {
    showStorageNotice("Saved tasks couldn't be read. You can still add tasks in this session.");
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageNotice.hidden = true;
    storageNotice.textContent = "";
    return true;
  } catch (error) {
    showStorageNotice("Your browser couldn't save changes. Keep this tab open to avoid losing them.");
    return false;
  }
}

function showStorageNotice(message) {
  storageNotice.textContent = message;
  storageNotice.hidden = false;
}

function showTodayDate() {
  const now = new Date();
  todayDate.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(now).toUpperCase();
}

function clearValidation() {
  titleError.hidden = true;
  deadlineError.hidden = true;
  titleError.textContent = "";
  deadlineError.textContent = "";
  titleInput.removeAttribute("aria-invalid");
  deadlineInput.removeAttribute("aria-invalid");
  formFeedback.textContent = "";
}

function showFieldError(input, errorElement, message) {
  errorElement.textContent = message;
  errorElement.hidden = false;
  input.setAttribute("aria-invalid", "true");
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearValidation();

  const title = titleInput.value.trim();
  const deadline = deadlineInput.value;
  let isValid = true;

  if (!title) {
    showFieldError(titleInput, titleError, "Give your task a name first.");
    isValid = false;
  }

  if (!deadline) {
    showFieldError(deadlineInput, deadlineError, "Choose a deadline for this task.");
    isValid = false;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(new Date(`${deadline}T00:00:00`).getTime())) {
    showFieldError(deadlineInput, deadlineError, "Please choose a valid date.");
    isValid = false;
  }

  if (!isValid) {
    const firstInvalidField = taskForm.querySelector('[aria-invalid="true"]');
    if (firstInvalidField) firstInvalidField.focus();
    return;
  }

  const newTask = {
    id: createTaskId(),
    title,
    deadline,
    completed: false
  };

  tasks.unshift(newTask);
  currentFilter = "all";
  updateFilterButtons();
  const saved = saveTasks();
  render();

  taskForm.reset();
  formFeedback.textContent = saved ? "Task added — one step closer!" : "Task added for this session.";
  titleInput.focus();
});

function createTaskId() {
  // A local ID is enough for this small app; no server or account is needed.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    updateFilterButtons();
    render();
  });
});

function updateFilterButtons() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

tasksList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) return;

  const taskId = actionButton.dataset.taskId;
  const action = actionButton.dataset.action;

  if (action === "toggle") {
    tasks = tasks.map((task) => task.id === taskId
      ? { ...task, completed: !task.completed }
      : task
    );
  } else if (action === "delete") {
    tasks = tasks.filter((task) => task.id !== taskId);
  } else {
    return;
  }

  saveTasks();
  render();
});

function render() {
  renderStats();
  renderTaskList();
}

function renderStats() {
  const completedCount = tasks.filter((task) => task.completed).length;
  const remainingCount = tasks.length - completedCount;
  const percentage = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  totalTasks.textContent = String(tasks.length);
  completedTasks.textContent = String(completedCount);
  remainingTasks.textContent = String(remainingCount);
  progressText.textContent = `${percentage}% complete`;
  progressFill.style.width = `${percentage}%`;
  progressTrack.setAttribute("aria-valuenow", String(percentage));

  if (tasks.length === 0) {
    progressMessage.textContent = "Every task you finish is progress worth celebrating.";
  } else if (percentage === 100) {
    progressMessage.textContent = "All tasks complete. Take a breath — you earned it!";
  } else if (percentage >= 50) {
    progressMessage.textContent = "You’re past the halfway mark. Keep that momentum going!";
  } else {
    progressMessage.textContent = "One small step at a time adds up to something big.";
  }
}

function renderTaskList() {
  const visibleTasks = tasks.filter((task) => {
    if (currentFilter === "pending") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  tasksList.replaceChildren();
  visibleTaskCount.textContent = String(visibleTasks.length);
  emptyState.hidden = visibleTasks.length > 0;

  if (visibleTasks.length === 0) {
    if (currentFilter === "pending" && tasks.length > 0) {
      emptyTitle.textContent = "Nothing left on your to-do list.";
      emptyMessage.textContent = "Nice work — every task is checked off. Enjoy that feeling.";
    } else if (currentFilter === "completed") {
      emptyTitle.textContent = "Your wins will show up here.";
      emptyMessage.textContent = "Complete a task and it’ll be saved here for a little victory lap.";
    } else {
      emptyTitle.textContent = "Your next chapter starts here.";
      emptyMessage.textContent = "Add your first task and give that goal a place to land.";
    }
    return;
  }

  visibleTasks.forEach((task) => {
    tasksList.appendChild(createTaskElement(task));
  });
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-complete" : ""}`;

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "task-check";
  toggleButton.dataset.action = "toggle";
  toggleButton.dataset.taskId = task.id;
  toggleButton.setAttribute("aria-pressed", String(task.completed));
  toggleButton.setAttribute("aria-label", task.completed
    ? `Mark “${task.title}” as not complete`
    : `Mark “${task.title}” as complete`
  );
  toggleButton.innerHTML = task.completed
    ? '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m3 8 3.1 3.1L13 4.8" /></svg>'
    : "";

  const details = document.createElement("div");
  details.className = "task-details";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const deadline = document.createElement("span");
  deadline.className = "deadline-label";
  const deadlineInfo = getDeadlineLabel(task.deadline, task.completed);
  deadline.textContent = deadlineInfo.text;
  if (deadlineInfo.state) deadline.classList.add(`is-${deadlineInfo.state}`);

  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = task.completed ? "Done" : "To do";

  meta.append(deadline, status);
  details.append(title, meta);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.taskId = task.id;
  deleteButton.setAttribute("aria-label", `Delete “${task.title}”`);
  deleteButton.title = "Delete task";
  deleteButton.textContent = "×";

  item.append(toggleButton, details, deleteButton);
  return item;
}

function getDeadlineLabel(deadlineValue, isCompleted) {
  // App date inputs use YYYY-MM-DD, so create the date at local midnight.
  const deadlineDate = new Date(`${deadlineValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const differenceInDays = Math.round((deadlineDate.getTime() - today.getTime()) / 86400000);
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: deadlineDate.getFullYear() === today.getFullYear() ? undefined : "numeric"
  }).format(deadlineDate);

  if (isCompleted) return { text: `Due ${formattedDate}`, state: "complete" };
  if (differenceInDays < 0) return { text: `Overdue · ${formattedDate}`, state: "overdue" };
  if (differenceInDays === 0) return { text: "Due today", state: "today" };
  if (differenceInDays === 1) return { text: "Due tomorrow", state: "normal" };
  return { text: `Due ${formattedDate}`, state: "normal" };
}
