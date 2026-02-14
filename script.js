let currentNavDate = new Date();
// 1. Firebase Configuration
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
    console.log("Firebase Realm Connected");
} catch (error) {
    console.error("Firebase Init Error:", error);
}

const ADMIN_CRED = { user: 'Gourav', pass: 'admin' };
const K_SESSION = 'realm_active_session';

let currentUser = null;
let globalEvents = [];
let activeWar = null;

// --- INITIALIZATION ---
window.onload = () => {
    const savedID = localStorage.getItem(K_SESSION);
    if (savedID) {
        autoLogin(savedID);
    }
    startGlobalListeners();
}

async function autoLogin(name) {
    if (name === ADMIN_CRED.user) {
        const adminDoc = await db.collection("users").doc("admin_global").get();
        let adminData = createAdminSession();
        if (adminDoc.exists) {
            adminData.avatar = adminDoc.data().avatar;
            adminData.markedDates = adminDoc.data().markedDates || [];
        }
        login(adminData);
    } else if (db) {
        const doc = await db.collection("users").doc(name).get();
        if (doc.exists) login({ name, ...doc.data() });
    }
}

// --- AUTHENTICATION ---
async function handleAuth() {
    const name = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (!name || !pass) return;

    if (name === ADMIN_CRED.user && pass === ADMIN_CRED.pass) {
        login(createAdminSession());
        return;
    }

    if (!db) return alert("Database not connected.");

    try {
        const userRef = db.collection("users").doc(name);
        const doc = await userRef.get();

        if (doc.exists) {
            if (doc.data().pass === pass) {
                login({ name, ...doc.data() });
            } else {
                alert("Passkey Incorrect.");
            }
        } else {
            const newUser = { 
                pass, role: 'player', gold: 100, level: 1, xp: 0, 
                guild: null, tasks: [], achievements: [], warAppeal: false 
            };
            await userRef.set(newUser);
            login({ name, ...newUser });
        }
    } catch (e) { console.error(e); }
}

function createAdminSession() {
    return { name: ADMIN_CRED.user, role: 'admin', gold: 99999, level: 99, xp: 0, tasks: [] };
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

    // Padding for start of month
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div></div>`;
    }

    // Generate Days
    const today = new Date();
    const markedDates = currentUser.markedDates || [];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month + 1}-${day}`;
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        const isMarked = markedDates.includes(dateStr);

        grid.innerHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isMarked ? 'marked' : ''}" 
                 onclick="toggleDateMark('${dateStr}')">
                ${day}
            </div>`;
    }
}

function changeMonth(dir) {
    currentNavDate.setMonth(currentNavDate.getMonth() + dir);
    renderCalendar();
}

async function toggleDateMark(dateStr) {
    if (currentUser.role === 'admin') {
        // Handle Admin Calendar Persistence
        if (!currentUser.markedDates) currentUser.markedDates = [];
        const idx = currentUser.markedDates.indexOf(dateStr);
        if (idx > -1) currentUser.markedDates.splice(idx, 1);
        else currentUser.markedDates.push(dateStr);

        await db.collection("users").doc("admin_global").set({ markedDates: currentUser.markedDates }, { merge: true });
    } else {
        // Handle Player Calendar Persistence
        if (!currentUser.markedDates) currentUser.markedDates = [];
        const idx = currentUser.markedDates.indexOf(dateStr);
        if (idx > -1) currentUser.markedDates.splice(idx, 1);
        else currentUser.markedDates.push(dateStr);

        await db.collection("users").doc(currentUser.name).update({ markedDates: currentUser.markedDates });
    }
    renderCalendar();
}
function login(user) {
    currentUser = user;
    localStorage.setItem(K_SESSION, user.name);
    document.getElementById('auth-overlay').style.display = 'none';
    
    // DISPLAY SAVED AVATAR
    if (user.avatar) {
        document.getElementById('imagePreview').src = user.avatar;
    } else {
        // Default avatar if none exists
        document.getElementById('imagePreview').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;
    }

    const idTag = document.getElementById('sidebar-id');
    if(idTag) idTag.innerText = `ID: ${user.name} // ${user.role}`;
    refreshUI();
    renderCalendar();
}

// --- GLOBAL LISTENERS ---
function startGlobalListeners() {
    if (!db) return;
    
    db.collection("events").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        globalEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents();
    });

    db.collection("warRoom").doc("status").onSnapshot((doc) => {
        if (doc.exists) {
            activeWar = doc.data().activeWar || null;
            if(currentUser) refreshUI();
        }
    });

    db.collection("users").where("warAppeal", "==", true).onSnapshot((snapshot) => {
        if (currentUser && currentUser.role === 'admin') {
            const appeals = snapshot.docs.map(doc => ({ name: doc.id, ...doc.data() }));
            renderApprovals(appeals);
        }
    });
}

// --- UI ENGINE ---
function refreshUI() {
    if (!currentUser) return;
    const isAdmin = currentUser.role === 'admin';
    
    document.getElementById('admin-tab-link').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('guild-tab-link').style.display = isAdmin ? 'none' : 'flex';
    
    let canSeeWar = (isAdmin && activeWar) || (activeWar && currentUser.guild === activeWar.guild);
    document.getElementById('war-front-link').style.display = canSeeWar ? 'flex' : 'none';

    document.querySelectorAll('.admin-only').forEach(e => e.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.leader-only').forEach(e => e.style.display = (currentUser.role === 'leader') ? 'block' : 'none');

  // --- Update Text Info ---
    document.getElementById('heroName').innerText = currentUser.name;
    document.getElementById('goldCount').innerText = currentUser.gold;
    document.getElementById('displayLevel').innerText = currentUser.level;

    // ADD THESE 3 LINES to make the Rank update when you level up
    const titles = ["Novice", "Squire", "Knight", "Knight Captain", "Hero", "Legend", "Demigod"];
    const tIdx = Math.min(Math.floor(currentUser.level / 5), titles.length - 1);
    document.getElementById('rankTitle').innerText = titles[tIdx] + " Adventurer";

    // --- Update XP Bar (Make sure these IDs match your new HTML) ---
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
}

// --- GAME LOGIC ---
async function savePlayer() {
    if (currentUser.role !== 'admin' && db) {
        await db.collection("users").doc(currentUser.name).update({
            gold: currentUser.gold, xp: currentUser.xp, level: currentUser.level,
            guild: currentUser.guild, role: currentUser.role, tasks: currentUser.tasks,
            achievements: currentUser.achievements, warAppeal: currentUser.warAppeal || false
        });
    }
}

async function postEvent() {
    const title = document.getElementById('evTitle').value;
    const gold = parseInt(document.getElementById('evGold').value);
    if (!title || !gold || !db) return;

    await db.collection("events").add({
        title, gold, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('evTitle').value = "";
    document.getElementById('evGold').value = "";
}

function renderEvents() {
    const list = document.getElementById('event-list');
    if(!list) return;
    list.innerHTML = "";
    if (globalEvents.length === 0) {
        if (currentUser && currentUser.role !== 'admin') {
            list.innerHTML = `<p class="empty-msg">Waiting for the Creator to post events...</p>`;
        }
        return;
    }
    globalEvents.forEach((ev) => {
        list.innerHTML += `<div class="event-item"><h4>${ev.title}</h4><p>+ ${ev.gold} Gold</p><button class="complete-btn" style="width:100%" onclick="claimEvent('${ev.id}', ${ev.gold})">Complete</button></div>`;
    });
}

async function claimEvent(id, reward) {
    if (currentUser.role === 'admin') return;
    currentUser.gold += reward;
    await savePlayer();
    refreshUI();
}

function addTask(type) {
    const inputId = type === 'training' ? 'tIn' : (type === 'quests' ? 'qIn' : 'bIn');
    const val = document.getElementById(inputId).value;
    if (!val) return;
    currentUser.tasks.push({ id: Date.now(), text: val, type });
    document.getElementById(inputId).value = "";
    savePlayer(); renderTasks();
}

function renderTasks() {
    ['training', 'quests', 'boss'].forEach(type => {
        const container = document.getElementById(`${type}-list`);
        if(!container) return;
        container.innerHTML = "";
        currentUser.tasks.filter(t => t.type === type).forEach(t => {
            container.innerHTML += `<div class="profile-card" style="padding:15px; margin-bottom:10px;"><span style="flex:1">${t.text}</span><button class="complete-btn" onclick="finishTask(${t.id})">Finish</button></div>`;
        });
    });
}

async function finishTask(id) {
    const idx = currentUser.tasks.findIndex(t => t.id === id);
    const task = currentUser.tasks[idx];
    currentUser.xp += 25;
    if (currentUser.xp >= 100) { currentUser.level++; currentUser.xp = 0; }
    if (task.type === 'boss') {
        if(!currentUser.achievements) currentUser.achievements = [];
        currentUser.achievements.push({ text: task.text, date: new Date().toLocaleDateString() });
    }
    currentUser.tasks.splice(idx, 1);
    await savePlayer(); refreshUI();
}

function renderHallOfFame() {
    const container = document.getElementById('ach-list');
    if (!container) return;
    container.innerHTML = "";
    if (!currentUser.achievements || currentUser.achievements.length === 0) return;
    currentUser.achievements.forEach((ach, i) => {
        container.innerHTML += `<div class="boss-frame"><button class="delete-trophy" onclick="deleteTrophy(${i})"><i class="fas fa-trash"></i></button><i class="fas fa-dragon"></i><h3>${ach.text}</h3><p>Slayed on ${ach.date}</p></div>`;
    });
}

async function deleteTrophy(i) {
    currentUser.achievements.splice(i, 1);
    await savePlayer(); renderHallOfFame();
}

// --- WAR & APPROVALS ---
async function requestWar() {
    currentUser.warAppeal = true;
    await savePlayer(); refreshUI();
}

function renderApprovals(appeals = []) {
    const list = document.getElementById('approval-list');
    if (!list) return;
    list.innerHTML = appeals.length === 0 ? "<p class='empty-msg'>No appeals.</p>" : "";
    appeals.forEach(u => {
        list.innerHTML += `<div class="profile-card hero-centered"><h4>Guild: ${u.guild}</h4><p>Leader: ${u.name}</p><button class="complete-btn" onclick="approveWar('${u.name}', '${u.guild}')">Approve</button></div>`;
    });
}

async function approveWar(leaderName, guildName) {
    const commands = prompt(`Strategy for ${guildName}:`);
    if (!commands || !db) return;
    await db.collection("warRoom").doc("status").set({ activeWar: { guild: guildName, leader: leaderName, instructions: commands } });
    await db.collection("users").doc(leaderName).update({ warAppeal: false });
}

function renderBattlefield() {
    if (!activeWar) return;
    const gName = document.getElementById('war-guild-name');
    const gInst = document.getElementById('war-instructions-text');
    if(gName) gName.innerText = activeWar.guild + " Front";
    if(gInst) gInst.innerText = activeWar.instructions;
}

async function declareWinner() {
    if (!activeWar || !db) return;
    const leaderRef = db.collection("users").doc(activeWar.leader);
    const doc = await leaderRef.get();
    if (doc.exists) await leaderRef.update({ gold: doc.data().gold + 1000 });
    await db.collection("warRoom").doc("status").update({ activeWar: null });
    alert("Victory Declared.");
}

async function createGuild() {
    const name = document.getElementById('newGName').value;
    if (currentUser.gold < 500) return alert("Need 500 Gold.");
    currentUser.gold -= 500;
    currentUser.guild = name;
    currentUser.role = 'leader';
    await savePlayer(); refreshUI();
}

function showContent(id, el) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
}
// --- Avatar Upload Logic ---
function uploadAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            const base64Image = e.target.result;
            
            // 1. Update UI immediately
            document.getElementById('imagePreview').src = base64Image;
            
            // 2. Save to State
            currentUser.avatar = base64Image;
            
            // 3. Save to Database
            if (currentUser.role === 'admin') {
                // For Admin, we save to a special global doc
                await db.collection("users").doc("admin_global").set({ avatar: base64Image }, { merge: true });
            } else {
                // For Players, we update their user doc
                await db.collection("users").doc(currentUser.name).update({ avatar: base64Image });
            }
            alert("Identity Visual Updated.");
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}