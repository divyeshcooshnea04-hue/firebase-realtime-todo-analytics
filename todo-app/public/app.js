// 0. Theme Toggle
const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
document.documentElement.setAttribute("data-theme", initialTheme);
updateThemeIcon(initialTheme);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  themeToggle.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

// 1. Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, query, where,
  onSnapshot, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 2. Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCGz-xkYW1uNVym_ST5bUdPZ6rhrfvkoCw",
  authDomain: "todo-app-div.firebaseapp.com",
  projectId: "todo-app-div",
  storageBucket: "todo-app-div.firebasestorage.app",
  messagingSenderId: "1065843300791",
  appId: "1:1065843300791:web:4d99d527b870cdb7e27032"
};

// 3. Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 4. DOM elements
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const userPhoto = document.getElementById("user-photo");
const userName = document.getElementById("user-name");
const greeting = document.getElementById("greeting");
const taskInput = document.getElementById("task-input");
const priorityInput = document.getElementById("priority-input");
const dueDateInput = document.getElementById("due-date-input");
const addBtn = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");
const searchInput = document.getElementById("search-input");
const filterButtons = document.querySelectorAll(".filter-btn");
const clearCompletedBtn = document.getElementById("clear-completed-btn");

// Stats elements
const statsToggle = document.getElementById("stats-toggle");
const statsContent = document.getElementById("stats-content");
const statTotal = document.getElementById("stat-total");
const statCompleted = document.getElementById("stat-completed");
const statOverdue = document.getElementById("stat-overdue");
const statStreak = document.getElementById("stat-streak");

// 5. State
let allTasks = [];
let currentFilter = "all";
let currentSearch = "";
let weekChart = null;
let priorityChart = null;

// 6. Login / Logout
loginBtn.addEventListener("click", () => signInWithPopup(auth, provider));
logoutBtn.addEventListener("click", () => signOut(auth));

// 7. Watch auth state
let unsubscribeTasks = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.style.display = "none";
    appSection.style.display = "block";
    userPhoto.src = user.photoURL;
    userName.textContent = user.displayName;

    const hour = new Date().getHours();
    const firstName = user.displayName.split(" ")[0];
    if (hour < 12) greeting.textContent = `☀️ Good morning, ${firstName}!`;
    else if (hour < 18) greeting.textContent = `👋 Good afternoon, ${firstName}!`;
    else greeting.textContent = `🌙 Good evening, ${firstName}!`;

    loadTasks(user.uid);
  } else {
    loginSection.style.display = "block";
    appSection.style.display = "none";
    taskList.innerHTML = "";
    if (unsubscribeTasks) unsubscribeTasks();
  }
});

// Priority order
const priorityOrder = { high: 1, medium: 2, low: 3 };

// 8. Load tasks in real time
function loadTasks(userId) {
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  unsubscribeTasks = onSnapshot(q, (snapshot) => {
    allTasks = [];
    snapshot.forEach((docSnap) => {
      allTasks.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderTasks();
    updateStats();
  });
}

// ============================================
// DUE DATE HELPERS
// ============================================
function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return dueDate < getTodayStr();
}

function isDueToday(dueDate) {
  if (!dueDate) return false;
  return dueDate === getTodayStr();
}

// ============================================
// RENDER TASKS
// ============================================
function renderTasks() {
  taskList.innerHTML = "";

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.completed).length;
  const activeTasks = totalTasks - completedTasks;

  taskCount.textContent = `${activeTasks} task${activeTasks !== 1 ? "s" : ""} left`;
  progressText.textContent = `${completedTasks}/${totalTasks} done`;
  const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  progressBar.style.width = `${percent}%`;

  let visible = allTasks.filter((task) => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  if (currentSearch.trim()) {
    const s = currentSearch.toLowerCase();
    visible = visible.filter(t => t.text.toLowerCase().includes(s));
  }

  visible.sort((a, b) => {
    const aOverdue = !a.completed && isOverdue(a.dueDate);
    const bOverdue = !b.completed && isOverdue(b.dueDate);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pA = priorityOrder[a.priority] || 2;
    const pB = priorityOrder[b.priority] || 2;
    if (pA !== pB) return pA - pB;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  if (visible.length === 0) {
    let msg = "No tasks yet! Add one above ☝️";
    if (currentSearch.trim()) msg = "No tasks match your search 🔍";
    else if (currentFilter === "active") msg = "No active tasks. Great job! 🎉";
    else if (currentFilter === "completed") msg = "No completed tasks yet.";
    taskList.innerHTML = `<p class="empty-state">${msg}</p>`;
    return;
  }

  visible.forEach((task) => {
    const isCompleted = task.completed || false;
    const priority = task.priority || "medium";
    const dueDate = task.dueDate || "";

    const overdue = !isCompleted && isOverdue(dueDate);
    const dueToday = !isCompleted && isDueToday(dueDate);

    const classes = ["task-item", `priority-${priority}`];
    if (isCompleted) classes.push("completed");
    if (overdue) classes.push("overdue");
    if (dueToday) classes.push("due-today");

    const li = document.createElement("li");
    li.className = classes.join(" ");

    let statusBadge = "";
    if (overdue) statusBadge = `<span class="status-badge status-overdue">⚠️ OVERDUE</span>`;
    else if (dueToday) statusBadge = `<span class="status-badge status-today">🔥 DUE TODAY</span>`;

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${isCompleted ? "checked" : ""} />
      <div class="task-content">
        <div class="task-text-row">
          <span class="task-text">${task.text}</span>
          ${statusBadge}
        </div>
        ${dueDate ? `<span class="task-due ${overdue ? "task-due-overdue" : ""}">📅 ${formatDate(dueDate)}</span>` : ""}
      </div>
      <span class="priority-badge priority-badge-${priority}">${priority}</span>
      <button class="delete-btn" title="Delete task">🗑️</button>
    `;

    li.querySelector(".task-checkbox").addEventListener("change", () => {
      toggleTask(task.id, !isCompleted);
    });
    li.querySelector(".delete-btn").addEventListener("click", () => {
      deleteTask(task.id);
    });

    taskList.appendChild(li);
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// 10. Add task
addBtn.addEventListener("click", async () => {
  const text = taskInput.value.trim();
  if (!text) return;
  await addDoc(collection(db, "tasks"), {
    text,
    userId: auth.currentUser.uid,
    completed: false,
    priority: priorityInput.value,
    dueDate: dueDateInput.value || "",
    createdAt: serverTimestamp()
  });
  taskInput.value = "";
  dueDateInput.value = "";
  priorityInput.value = "medium";
});

taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addBtn.click();
});

// 11. Toggle complete (with CONFETTI! + completedAt timestamp)
async function toggleTask(id, completed) {
  const updates = {
    completed,
    completedAt: completed ? new Date().toISOString() : null
  };
  await updateDoc(doc(db, "tasks", id), updates);

  if (completed) {
    const stillActive = allTasks.filter(t => t.id !== id && !t.completed).length;
    if (stillActive === 0 && allTasks.length > 0) {
      fireBigConfetti();
    } else {
      fireConfetti();
    }
  }
}

// 🎉 Confetti
function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#4285f4', '#34a853', '#fbbc05', '#ea4335', '#a259ff', '#00c9db']
  });
  setTimeout(() => {
    confetti({
      particleCount: 40, angle: 60, spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#4285f4', '#34a853', '#fbbc05']
    });
    confetti({
      particleCount: 40, angle: 120, spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#ea4335', '#a259ff', '#00c9db']
    });
  }, 150);
}

function fireBigConfetti() {
  const duration = 2500;
  const end = Date.now() + duration;
  (function frame() {
    confetti({
      particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
      colors: ['#4285f4', '#34a853', '#fbbc05', '#ea4335', '#a259ff']
    });
    confetti({
      particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
      colors: ['#4285f4', '#34a853', '#fbbc05', '#ea4335', '#a259ff']
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({
    particleCount: 150, spread: 100, origin: { y: 0.6 },
    colors: ['#4285f4', '#34a853', '#fbbc05', '#ea4335', '#a259ff']
  });
}

// 12. Delete task
async function deleteTask(id) {
  await deleteDoc(doc(db, "tasks", id));
}

// 13. Search
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value;
  renderTasks();
});

// 14. Filter buttons
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

// 15. Clear completed
clearCompletedBtn.addEventListener("click", async () => {
  const completed = allTasks.filter(t => t.completed);
  if (completed.length === 0) return;
  if (!confirm(`Delete ${completed.length} completed task(s)?`)) return;
  for (const task of completed) {
    await deleteDoc(doc(db, "tasks", task.id));
  }
});

// ============================================
// 16. STATISTICS DASHBOARD
// ============================================

// Toggle the stats panel open/closed
statsToggle.addEventListener("click", () => {
  const isOpen = statsContent.style.display !== "none";
  statsContent.style.display = isOpen ? "none" : "block";
  statsToggle.setAttribute("aria-expanded", !isOpen);
  statsToggle.querySelector(".stats-toggle-arrow").textContent = isOpen ? "▼" : "▲";

  // If opening, render the charts (in case they weren't visible before)
  if (!isOpen) {
    updateStats();
  }
});

// Calculate streak — consecutive days ending today with at least 1 completed task
function calculateStreak() {
  const completedDates = new Set();
  allTasks.forEach((task) => {
    if (task.completedAt) {
      completedDates.add(task.completedAt.slice(0, 10)); // "YYYY-MM-DD"
    }
  });

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;

    if (completedDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      // Skip today if no completions yet — allow yesterday to continue the streak
      break;
    }
  }
  return streak;
}

// Update all stats (numbers + charts)
function updateStats() {
  // --- Summary numbers ---
  const total = allTasks.length;
  const completed = allTasks.filter(t => t.completed).length;
  const overdue = allTasks.filter(t => !t.completed && isOverdue(t.dueDate)).length;
  const streak = calculateStreak();

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statOverdue.textContent = overdue;
  statStreak.textContent = streak;

  // --- Get current theme colors for charts ---
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  // --- Last 7 Days bar chart ---
  const last7Labels = [];
  const last7Counts = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { weekday: "short" });

    last7Labels.push(label);

    const count = allTasks.filter(t =>
      t.completedAt && t.completedAt.slice(0, 10) === dateStr
    ).length;
    last7Counts.push(count);
  }

  if (weekChart) weekChart.destroy();
  weekChart = new Chart(document.getElementById("weekChart"), {
    type: "bar",
    data: {
      labels: last7Labels,
      datasets: [{
        label: "Completed",
        data: last7Counts,
        backgroundColor: isDark ? "#5a9bff" : "#4285f4",
        borderRadius: 6,
        barThickness: 24
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: textColor, stepSize: 1, precision: 0 },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: textColor },
          grid: { display: false }
        }
      }
    }
  });

  // --- By Priority donut chart ---
  const highCount = allTasks.filter(t => t.priority === "high").length;
  const mediumCount = allTasks.filter(t => t.priority === "medium").length;
  const lowCount = allTasks.filter(t => t.priority === "low").length;

  if (priorityChart) priorityChart.destroy();
  priorityChart = new Chart(document.getElementById("priorityChart"), {
    type: "doughnut",
    data: {
      labels: ["High", "Medium", "Low"],
      datasets: [{
        data: [highCount, mediumCount, lowCount],
        backgroundColor: ["#e74c3c", "#f39c12", "#2ecc71"],
        borderColor: isDark ? "#1e1e1e" : "#ffffff",
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, padding: 12, font: { size: 12 } }
        }
      },
      cutout: "65%"
    }
  });
}

// 17. Re-render charts when theme changes so colors update
themeToggle.addEventListener("click", () => {
  // Wait for the theme switch to apply, then re-render charts
  setTimeout(updateStats, 50);
});

// 18. Auto-refresh at midnight
function scheduleMidnightRefresh() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const msUntilMidnight = tomorrow - now;
  setTimeout(() => {
    renderTasks();
    updateStats();
    scheduleMidnightRefresh();
  }, msUntilMidnight);
}
scheduleMidnightRefresh();