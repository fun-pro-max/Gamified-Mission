# 🛡️ QuestLog: Eternal Realm

**QuestLog** is a high-performance, real-time gamified productivity application that transforms personal discipline into a high-fantasy RPG experience. Built with a focus on **Identity Persistence**, **Centralized Economy**, and **Tactical Warfare**.

![QuestLog Banner](https://img.shields.io/badge/Realm-Live-accent--green)
![Firebase](https://img.shields.io/badge/Backend-Firebase_Firestore-orange)
![Design](https://img.shields.io/badge/UI-Glass--Morphism-blue)
![Mobile](https://img.shields.io/badge/Mobile-Responsive-purple)

---

## 🌌 The Philosophy: Identity Till Death

In the Eternal Realm, your identity is not temporary. Once a Hero initializes their name and passkey, they are locked into that session. 
*   **Permanent Sessions:** There is no logout button. Your Hero is your permanent digital twin on your device.
*   **The Command Economy:** Unlike other gamified apps, you cannot "grind" gold by adding easy habits. Gold is a rare resource distributed only by **The Creator** (Admin) or won through sanctioned **Guild Wars**.

---

## 🎭 The Trinity of Roles

### 👑 The Creator (Admin)
*   **Hidden Access:** Exclusive access via secret credentials.
*   **Global Authority:** Posts "World Events" that award gold to all players.
*   **War Arbiter:** Manages the "Approvals" hub to sanction wars, provides custom battle instructions, and declares the final victors.

### 🛡️ Guild Leaders
*   **Promotion:** Heroes who amass **500 Gold** can establish a Guild, promoting them to the rank of Leader.
*   **Command & Control:** Leaders assign guild objectives, manage chats, and appeal to the Creator for War Sanctions.

### 🗡️ The Heroes (Players)
*   **The Grind:** Complete Training and Quests to earn **XP only**. 
*   **Leveling:** Experience leads to Level Ups, unlocking higher Ranks (Novice → Knight → Legend).
*   **Legacy:** Defeating Bosses allows the player to "Frame" trophies in the **Hall of Fame**.

---

## 🚀 Key Features

### 📸 Passport Profile Layout
A professional, aligned info stack featuring:
*   **Passport Image:** A fixed-aspect ratio profile picture.
*   **Info Stack:** Neatly aligned Name, Gold, Rank, and Level.
*   **Visual XP Bar:** A glowing, real-time progress bar that fills as you complete tasks.

### 📅 Interactive Realm Calendar
*   A persistent habit tracker on the dashboard.
*   Mark your progress daily to visualize your consistency across months.
*   Data is synced to the cloud, ensuring your "Marked Dates" follow you everywhere.

### ⚔️ The War Front
*   A restricted, high-stakes tab.
*   Invisible to the public; only accessible by the Admin and the Guild currently authorized for combat.
*   Features custom strategy instructions issued directly by the Admin.

### 🏆 Hall of Fame
*   Boss victories aren't just text—they are trophies.
*   Complete a Boss Raid to generate a "Framed" achievement that stays in your Hall of Fame forever (or until you choose to erase it).

### 📱 Full Responsiveness
*   **Desktop:** Professional glass-morphism sidebar.
*   **Mobile:** Auto-adjusting **Bottom Navigation Bar** with intuitive icons, ensuring the "Realm" feels like a native app on any phone or tablet.

---

## 🛠️ Technical Setup

### 1. Requirements
*   A Firebase Project (Firestore Database).
*   Standard Web Browser (Chrome recommended).

### 2. Firebase Configuration
Update the `firebaseConfig` object in `script.js` with your project credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
