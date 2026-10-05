# firebase-realtime-todo-analytics
Real-time task manager with Firestore, Google Auth, and a custom analytics dashboard. Deployed on Firebase Hosting.

# 📊 Task Analytics Dashboard

A **real-time task manager** with a built-in **analytics dashboard**, built with vanilla JavaScript and Firebase. Live at **[todo-app-div.web.app](https://todo-app-div.web.app)**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-10.12-orange.svg)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4-red.svg)

---

## ✨ Features

### Task Management
- 🔐 **Google Authentication** — secure sign-in with OAuth 2.0
- ⚡ **Real-time sync** — tasks update instantly across devices
- 🎯 **Priority levels** (High / Medium / Low) with color-coded borders
- 📅 **Due dates** with automatic overdue detection and "Due Today" highlighting
- ✅ **Completion tracking** with `completedAt` timestamps
- 🔍 **Live search** and filter tabs (All / Active / Completed)
- 🧹 **Bulk clear** completed tasks
- 🌙 **Dark mode** with system preference detection and persistence
- 🎉 **Confetti celebrations** on task completion

### Analytics Dashboard
- 📊 **7-day completion chart** (bar chart)
- 🍩 **Priority distribution** (doughnut chart)
- 🔥 **Streak counter** — consecutive days of activity
- 📈 **Live summary cards** — total, completed, overdue, and streak

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3 (custom properties), Vanilla JavaScript (ES6 modules) |
| **Authentication** | Firebase Authentication (Google OAuth 2.0) |
| **Database** | Cloud Firestore (real-time NoSQL) |
| **Data Visualization** | Chart.js |
| **Animations** | canvas-confetti |
| **Hosting** | Firebase Hosting |
| **Security** | Firestore Security Rules (row-level access control) |

---

## 🏗️ Architecture

The app is a **client-side single-page application** that talks directly to Firebase services — no custom backend required.
