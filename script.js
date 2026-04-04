/**
 * QUESTLOG SUPREME - FINAL ARCHITECTURE
 * Features: Real-time Cloud Sync, Evidence-based Approvals, Tactical War, 
 * Responsive Nav, Passport UI, and Optimistic High-Speed Rendering.
 */

// 1. Configuration & Global State
let currentNavDate = new Date();
const ADMIN_CRED = { user: 'Gourav', pass: 'admin' };
const K_SESSION = 'realm_active_session_v5';
let isDataLoaded = false;
let currentClaimData = null; // Temporary storage for event being claimed

const firebaseConfig = {
    apiKey: "AIzaSyDhHTiL8iTkoS7izGOneAY9W8w_aZVApAk",
    authDomain: "questlog-66f75.firebaseapp.com",
    projectId: "questlog-66f75",
    storageBucket: "questlog-66f75.firebasestorage.app",
    messagingSenderId: "529239161658",
    appId: "1:529239161658:web:fc8ef2162d12256ca5ee03"
};

// 2. Initialize Firebase
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("Realm Cloud Linked Successfully");
} catch (error) {
    console.error("Cloud Connection Failure:", error);
}

let currentUser = null;
let globalEvents = [];
let activeWar = null;

// --- INITIALIZATION (Optimized for Speed) ---
window.onload = () => {
    const savedID = localStorage.getItem(K_SESSION);
    
    // Start background listeners immediately (Parallel Processing)
    startGlobalListeners();

    if (savedID) {
        autoLogin(savedID);
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }

    // Attach Event Evidence Listener
    const evidenceInput = document.getElementById('evidenceUpload');
    if(evidenceInput) {
        evidenceInput.onchange = handleEvidenceSelection;
    }
}

async function autoLogin(name) {
    try {
        if (name === ADMIN_CRED.user) {
            const adminDoc = await db.collection("users").doc("admin_global").get();
            let adminData = createAdminSession();
            if (adminDoc.exists) adminData = { ...adminData, ...adminDoc.data() };
            login(adminData);
        } else if (db) {
            const doc = await db.collection("users").doc(name).get();
            if (doc.exists) login({ name, ...doc.data() });
            else document.getElementById('auth-overlay').style.display = 'flex';
        }
    } catch (e) {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
}

// --- AUTHENTICATION ---
async function handleAuth() {
    const name = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (!name || !pass) return;

    if (name === ADMIN_CRED.user && pass === ADMIN_CRED.pass) {
        const adminDoc = await db.collection("users").doc("admin_global").get();
        let adminData = createAdminSession();
        if (adminDoc.exists) adminData = { ...adminData, ...adminDoc.data() };
        login(adminData);
        return;
    }

    if (!db) return alert("Database offline.");

    try {
        const userRef = db.collection("users").doc(name);
        const doc = await userRef.get();
        if (doc.exists) {
            if (doc.data().pass === pass) login({ name, ...doc.data() });
            else alert("Passkey Incorrect.");
        } else {
            const newUser = { 
                pass, role: 'player', gold: 100, level: 1, xp: 0, 
                guild: null, tasks: [], achievements: [], warAppeal: false,
                markedDates: [], avatar: null
            };
            await userRef.set(newUser);
            login({ name, ...newUser });
        }
    } catch (e) { console.error(e); }
}

function createAdminSession() {
    return { name: ADMIN_CRED.user, role: 'admin', gold: 99999, level: 99, xp: 0, tasks: [], avatar: null, markedDates: [] };
}

function login(user) {
    currentUser = user;
    if (!currentUser.tasks) currentUser.tasks = [];
    localStorage.setItem(K_SESSION, user.name);
    document.getElementById('auth-overlay').style.display = 'none';
    
    if (user.avatar) document.getElementById('imagePreview').src = user.avatar;
    const idTag = document.getElementById('sidebar-id');
    if(idTag) idTag.innerText = `ID: ${user.name} // ${user.role}`;
    
    isDataLoaded = true; 
    refreshUI();
    renderCalendar();
}

// --- CLOUD SYNC ---
async function savePlayer() {
    if (!db || !currentUser || !isDataLoaded) return;
    const docId = currentUser.role === 'admin' ? "admin_global" : currentUser.name;
    const data = (currentUser.role === 'admin') ? {
        avatar: currentUser.avatar || null,
        markedDates: currentUser.markedDates || [],
        tasks: currentUser.tasks || []
    } : {
        gold: currentUser.gold, xp: currentUser.xp, level: currentUser.level,
        guild: currentUser.guild, role: currentUser.role, tasks: currentUser.tasks || [],
        achievements: currentUser.achievements || [], warAppeal: currentUser.warAppeal || false,
        markedDates: currentUser.markedDates || [], avatar: currentUser.avatar || null
    };
    await db.collection("users").doc(docId).set(data, { merge: true });
}

// --- REAL-TIME LISTENERS ---
function startGlobalListeners() {
    if (!db) return;
    
    // Global Events
    db.collection("events").orderBy("createdAt", "desc").onSnapshot(snap => {
        globalEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents();
    });

    // War Room
    db.collection("warRoom").doc("status").onSnapshot(doc => {
        if (doc.exists) {
            activeWar = doc.data().activeWar || null;
            if(currentUser) refreshUI();
        }
    });

    // Combined Admin Approvals (War + Evidence)
    db.collection("users").where("warAppeal", "==", true).onSnapshot(snap => {
        if (currentUser?.role === 'admin') syncAdminApprovals();
    });

    db.collection("submissions").onSnapshot(snap => {
        if (currentUser?.role === 'admin') syncAdminApprovals();
    });
}

async function syncAdminApprovals() {
    const warSnaps = await db.collection("users").where("warAppeal", "==", true).get();
    const subSnaps = await db.collection("submissions").get();
    
    const warAppeals = warSnaps.docs.map(d => ({ name: d.id, ...d.data() }));
    const evidenceSubs = subSnaps.docs.map(d => ({ id: d.id, ...d.data() }));
    
    renderApprovals(warAppeals, evidenceSubs);
}

// --- UI ENGINE ---
function refreshUI() {
    if (!currentUser) return;
    requestAnimationFrame(() => {
        const isAdmin = currentUser.role === 'admin';
        document.getElementById('admin-tab-link').style.display = isAdmin ? 'flex' : 'none';
        document.getElementById('guild-tab-link').style.display = isAdmin ? 'none' : 'flex';
        
        let canSeeWar = (isAdmin && activeWar) || (activeWar && currentUser.guild === activeWar.guild);
        document.getElementById('war-front-link').style.display = canSeeWar ? 'flex' : 'none';

        document.querySelectorAll('.admin-only').forEach(e => e.style.display = isAdmin ? 'block' : 'none');
        document.querySelectorAll('.leader-only').forEach(e => e.style.display = (currentUser.role === 'leader') ? 'block' : 'none');

        document.getElementById('heroName').innerText = currentUser.name;
        document.getElementById('goldCount').innerText = currentUser.gold;
        document.getElementById('displayLevel').innerText = currentUser.level;

        const titles = ["Novice", "Squire", "Knight", "Veteran", "Hero", "Legend", "Demigod"];
        const tIdx = Math.min(Math.floor(currentUser.level / 5), titles.length - 1);
        document.getElementById('rankTitle').innerText = titles[tIdx] + " Adventurer";

        document.getElementById('lvlBar').style.width = currentUser.xp + "%";
        document.getElementById('progressPercent').innerText = currentUser.xp + "%";

        if (currentUser.guild) {
            document.getElementById('guild-create-zone').style.display = 'none';
            document.getElementById('active-guild').style.display = 'block';
            document.getElementById('gTitle').innerText = currentUser.guild;
            document.getElementById('gInitial').innerText = currentUser.guild[0].toUpperCase();
            document.getElementById('roleText').innerText = "Status: " + currentUser.role.toUpperCase();
            if (currentUser.warAppeal) {
                document.getElementById('request-war-btn').style.display = 'none';
                document.getElementById('war-pending-msg').style.display = 'block';
            }
        }
        renderTasks();
        renderHallOfFame();
        if (activeWar) renderBattlefield();
    });
}

// --- TASK ACTIONS ---
function addTask(type) {
    const inputId = type === 'training' ? 'tIn' : (type === 'quests' ? 'qIn' : 'bIn');
    const input = document.getElementById(inputId);
    const val = input.value.trim();
    if (!val) return;
    currentUser.tasks.push({ id: Date.now(), text: val, type });
    input.value = "";
    renderTasks();
    savePlayer();
}

function renderTasks() {
    ['training', 'quests', 'boss'].forEach(type => {
        const container = document.getElementById(`${type}-list`);
        if(!container) return;
        container.innerHTML = "";
        (currentUser.tasks || []).filter(t => t.type === type).forEach(t => {
            container.innerHTML += `
                <div class="profile-card" style="padding:15px; margin-bottom:10px; animation: slideInUp 0.3s ease-out; gap:15px;">
                    <span style="flex:1; font-weight:600;">${t.text}</span>
                    <button class="complete-btn" onclick="finishTask(${t.id}, event)">Finish</button>
                </div>`;
        });
    });
}

function finishTask(id, event) {
    const idx = currentUser.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const card = event.target.closest('.profile-card');
    card.classList.add('task-exit');

    setTimeout(() => {
        const task = currentUser.tasks[idx];
        currentUser.xp += 25;
        if (currentUser.xp >= 100) { currentUser.level++; currentUser.xp = 0; }
        if (task.type === 'boss') {
            if(!currentUser.achievements) currentUser.achievements = [];
            currentUser.achievements.push({ text: task.text, date: new Date().toLocaleDateString() });
        }
        currentUser.tasks.splice(idx, 1);
        refreshUI();
        savePlayer();
    }, 250);
}

// --- ADMIN GLOBAL EVENTS (With Evidence Logic) ---
async function postEvent() {
    const title = document.getElementById('evTitle').value;
    const gold = parseInt(document.getElementById('evGold').value);
    if (!title || !gold) return;
    await db.collection("events").add({ title, gold, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('evTitle').value = ""; document.getElementById('evGold').value = "";
}

async function deleteEvent(id) {
    if(confirm("Erase this event from the Realm?")) {
        await db.collection("events").doc(id).delete();
    }
}

function renderEvents() {
    const list = document.getElementById('event-list');
    if(!list) return;
    list.innerHTML = "";
    if (globalEvents.length === 0) {
        if (currentUser.role !== 'admin') list.innerHTML = `<p class="empty-msg">Waiting for the Creator...</p>`;
        return;
    }
    const isAdmin = currentUser.role === 'admin';
    globalEvents.forEach((ev) => {
        list.innerHTML += `
            <div class="event-item">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="color:var(--accent-blue)">${ev.title}</h4>
                    ${isAdmin ? `<i class="fas fa-trash" style="color:var(--accent-red); cursor:pointer; font-size:0.8rem" onclick="deleteEvent('${ev.id}')"></i>` : ''}
                </div>
                <p style="color:var(--accent-gold)">+ ${ev.gold} Gold</p>
                <button class="complete-btn" style="width:100%; margin-top:10px" onclick="initiateEventClaim('${ev.id}', '${ev.title}', ${ev.gold})">
                    ${isAdmin ? 'Admin View' : 'Complete (Upload Evidence)'}
                </button>
            </div>`;
    });
}

function initiateEventClaim(id, title, gold) {
    if (currentUser.role === 'admin') return;
    currentClaimData = { id, title, gold };
    document.getElementById('evidenceUpload').click();
}

function handleEvidenceSelection(e) {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64 = event.target.result;
            await db.collection("submissions").add({
                user: currentUser.name,
                title: currentClaimData.title,
                reward: currentClaimData.gold,
                evidence: base64,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Evidence sent to High Command. Awaiting Gold approval.");
        };
        reader.readAsDataURL(e.target.files[0]);
    }
}

// --- APPROVALS HUB (War + Evidence) ---
function renderApprovals(warAppeals = [], evidenceSubs = []) {
    const list = document.getElementById('approval-list');
    if (!list) return;
    list.innerHTML = "";

    if (warAppeals.length === 0 && evidenceSubs.length === 0) {
        list.innerHTML = "<p class='empty-msg'>No pending requests for the Creator.</p>";
        return;
    }

    // Render Evidence Submissions
    evidenceSubs.forEach(sub => {
        list.innerHTML += `
            <div class="profile-card vertical-align" style="gap:15px; border-color:var(--accent-blue);">
                <div style="text-align:center; width:100%;">
                    <h4>${sub.user} Claims "${sub.title}"</h4>
                    <p style="color:var(--accent-gold); font-size:0.8rem;">Potential Reward: ${sub.reward}g</p>
                </div>
                <img src="${sub.evidence}" style="width:100%; border-radius:12px; border:1px solid var(--glass);">
                <div style="display:flex; gap:10px; width:100%;">
                    <button class="complete-btn" style="background:var(--accent-green); flex:1" onclick="approveClaim('${sub.id}', '${sub.user}', ${sub.reward})">Accept</button>
                    <button class="complete-btn" style="background:var(--accent-red); flex:1" onclick="rejectClaim('${sub.id}')">Deny</button>
                </div>
            </div>`;
    });

    // Render War Appeals
    warAppeals.forEach(u => {
        list.innerHTML += `
            <div class="profile-card hero-centered" style="border-color:var(--accent-red);">
                <h4>War Appeal: ${u.guild}</h4>
                <p style="font-size:0.8rem;">Led by ${u.name}</p>
                <button class="complete-btn" style="background:var(--accent-blue); width:100%;" onclick="approveWar('${u.name}', '${u.guild}')">Sanction War</button>
            </div>`;
    });
}

async function approveClaim(id, user, reward) {
    const ref = db.collection("users").doc(user);
    const doc = await ref.get();
    if(doc.exists) {
        await ref.update({ gold: (doc.data().gold || 0) + reward });
    }
    await db.collection("submissions").doc(id).delete();
    alert("Gold Distributed.");
}

async function rejectClaim(id) {
    await db.collection("submissions").doc(id).delete();
    alert("Claim Rejected.");
}

async function approveWar(leader, guild) {
    const cmds = prompt(`Strategy for ${guild}:`);
    if (!cmds) return;
    await db.collection("warRoom").doc("status").set({ activeWar: { guild, leader, instructions: cmds } });
    await db.collection("users").doc(leader).update({ warAppeal: false });
}

// --- THE REST OF THE ENGINE (Calendar, Avatar, Hall of Fame) ---
function renderHallOfFame() {
    const container = document.getElementById('ach-list');
    if (!container) return;
    container.innerHTML = "";
    (currentUser.achievements || []).forEach((ach, i) => {
        container.innerHTML += `<div class="boss-frame"><button class="delete-trophy" onclick="deleteTrophy(${i})"><i class="fas fa-trash"></i></button><i class="fas fa-dragon" style="font-size:2rem; color:var(--accent-gold); margin-bottom:10px;"></i><h3>${ach.text}</h3><p>Slayed on ${ach.date}</p></div>`;
    });
}

async function deleteTrophy(i) {
    if(confirm("Erase this victory?")) {
        currentUser.achievements.splice(i, 1);
        renderHallOfFame();
        savePlayer();
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('calendarMonth');
    if (!grid) return;
    grid.innerHTML = "";
    const year = currentNavDate.getFullYear();
    const month = currentNavDate.getMonth();
    monthLabel.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentNavDate);
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;
    const marked = currentUser.markedDates || [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${year}-${month + 1}-${d}`;
        grid.innerHTML += `<div class="calendar-day ${marked.includes(dStr) ? 'marked' : ''}" onclick="toggleDateMark('${dStr}')">${d}</div>`;
    }
}

function toggleDateMark(dStr) {
    if (!currentUser.markedDates) currentUser.markedDates = [];
    const idx = currentUser.markedDates.indexOf(dStr);
    if (idx > -1) currentUser.markedDates.splice(idx, 1);
    else currentUser.markedDates.push(dStr);
    renderCalendar();
    savePlayer();
}

function changeMonth(dir) {
    currentNavDate.setMonth(currentNavDate.getMonth() + dir);
    renderCalendar();
}

function uploadAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        document.getElementById('imagePreview').style.filter = "blur(5px)";
        reader.onload = function(e) {
            const b64 = e.target.result;
            document.getElementById('imagePreview').src = b64;
            document.getElementById('imagePreview').style.filter = "blur(0)";
            currentUser.avatar = b64;
            savePlayer();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function renderBattlefield() {
    if (!activeWar) return;
    const n = document.getElementById('war-guild-name');
    const i = document.getElementById('war-instructions-text');
    if(n) n.innerText = activeWar.guild + " Strategy";
    if(i) i.innerText = activeWar.instructions;
}

async function declareWinner() {
    if (!activeWar) return;
    const leaderRef = db.collection("users").doc(activeWar.leader);
    const doc = await leaderRef.get();
    if (doc.exists) await leaderRef.update({ gold: (doc.data().gold || 0) + 1000 });
    await db.collection("warRoom").doc("status").update({ activeWar: null });
    alert("Campaign Concluded. Victory declared.");
}

async function createGuild() {
    const name = document.getElementById('newGName').value.trim();
    if (currentUser.gold < 500) return alert("System Error: 500 Gold required.");
    currentUser.gold -= 500;
    currentUser.guild = name;
    currentUser.role = 'leader';
    refreshUI();
    savePlayer();
}

function showContent(id, el) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
}