# 🛡️ QuestLog: Eternal Realm

**QuestLog** is a high-octane, real-time gamified task management system built to turn productivity into a competitive RPG experience. Featuring a centralized economy controlled by a "Creator" (Admin), guild-based warfare, and a "Identity till Death" philosophy.

![QuestLog Banner](https://img.shields.io/badge/Status-Beta-accent--blue)
![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)
![Responsive](https://img.shields.io/badge/Design-Responsive-green)

---

## 🌌 The Concept

QuestLog is not just a to-do list; it is a living realm. Unlike standard apps, QuestLog operates on a **command-driven economy**. You cannot "cheat" your way to wealth by adding easy tasks. To gain power, you must level up through personal discipline and earn gold through the Creator's global events.

### 🎭 The Trinity of Roles

1.  **The Creator (Admin):** 
    *   Holds the keys to the realm.
    *   Posts global events that reward players with Gold.
    *   Approves Guild War sanctions and provides custom war strategies.
    *   Manually declares war victors.
2.  **Guild Leaders:** 
    *   Heroes who have earned **500 Gold** and established their own legacy.
    *   Can assign guild-specific objectives and chat with members.
    *   Hold the exclusive right to appeal to the Creator for War Sanctions.
3.  **The Heroes (Players):** 
    *   Start with **100 Gold** and a "Novice" rank.
    *   Complete Training, Quests, and Boss Raids to earn XP and level up.
    *   Must rely on the Creator's events to earn Gold.

---

## 🚀 Key Features

*   **Real-Time Synergy:** Powered by Firebase Firestore. When the Admin posts an event or approves a war, it appears on all players' screens instantly without a refresh.
*   **Identity Till Death:** Once you enter the realm with a name and passkey, that is your identity. There is no logout button; your Hero lives as long as your session exists.
*   **The War Front:** A restricted, high-stakes tab visible only to the Admin and the specific Guild authorized for battle.
*   **Hall of Fame:** Boss victories are "framed" as trophies. Players can curate their legacy by keeping or deleting these frames.
*   **Responsive UI:** 
    *   **Desktop:** Professional glass-morphism sidebar.
    *   **Mobile:** Intuitive bottom navigation bar with icons for a native app feel.

---

## 🛠️ Technical Setup

### 1. Installation
Clone this repository to your local machine:
```bash
git clone https://github.com/yourusername/questlog.git
