/**
 * QUESTLOG SUPREME ENGINE
 */

const ADMIN_CRED = { user: 'admin', pass: 'admin123' };

// Persistence Keys
const K_USERS = 'realm_u_v5';
const K_EVENTS = 'realm_e_v5';
const K_WARS = 'realm_w_v5';
const K_SESSION = 'realm_s_v5';

// State
let users = JSON.parse(localStorage.getItem(K_USERS)) || [];
let globalEvents = JSON.parse(localStorage.getItem(K_EVENTS)) || [];
let activeWar = JSON.parse(localStorage.getItem(K_WARS)) || null; // { guild, instructions, winner: null }
let currentUser = null;

window.onload = () => {
    const session = localStorage.getItem(K_SESSION);
    if (session) {
        let user = (session === ADMIN_CRED.user) ? createAdmin() : users.find(u => u.name === session);
        if (user) login(user);
    }
}

function handleAuth() {
    const name = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (!name || !pass) return;

    if (name === ADMIN_CRED.user && pass === ADMIN_CRED.pass) {
        login(createAdmin());
    } else {
        let user = users.find(u => u.name === name);
        if (user) {
            if (user.pass === pass) login(user);
            else alert("Passkey Incorrect.");
        } else {
            user = { 
                name, pass, role: 'player', gold: 100, 
                level: 1, xp: 0, guild: null, tasks: [], achievements: [], warAppeal: false 
            };
            users.push(user);
            saveDB();
            login(user);
        }
    }
}

function createAdmin() {
    return { name: ADMIN_CRED.user, role: 'admin', gold: 99999, level: 99, xp: 0, guild: null, tasks: [] };
}

function login(user) {
    currentUser = user;
    localStorage.setItem(K_SESSION, user.name);
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('sidebar-id').innerText = `ID: ${user.name} // ${user.role}`;
    
    refreshUI();
}

function saveDB() {
    if (currentUser && currentUser.role !== 'admin') {
        const idx = users.findIndex(u => u.name === currentUser.name);
        if (idx > -1) users[idx] = currentUser;
    }
    localStorage.setItem(K_USERS, JSON.stringify(users));
    localStorage.setItem(K_EVENTS, JSON.stringify(globalEvents));
    localStorage.setItem(K_WARS, JSON.stringify(activeWar));
}

function refreshUI() {
    // 1. Role Tabs
    const isAdmin = currentUser.role === 'admin';
    document.getElementById('admin-tab-link').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('guild-tab-link').style.display = isAdmin ? 'none' : 'flex';
    
    // 2. War Front Restricted Access
    let showWar = false;
    if (isAdmin && activeWar) showWar = true;
    if (activeWar && currentUser.guild === activeWar.guild) showWar = true;
    
    document.getElementById('war-front-link').style.display = showWar ? 'flex' : 'none';

    // 3. Admin Only Visuals
    document.querySelectorAll('.admin-only').forEach(e => e.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.leader-only').forEach(e => e.style.display = (currentUser.role === 'leader') ? 'block' : 'none');

    // 4. Dashboard Stats
    document.getElementById('heroName').innerText = currentUser.name;
    document.getElementById('goldCount').innerText = currentUser.gold;
    document.getElementById('displayLevel').innerText = currentUser.level;
    document.getElementById('progressPercent').innerText = currentUser.xp + "%";
    document.getElementById('lvlBar').style.width = currentUser.xp + "%";

    // 5. Guild Logic
    if (currentUser.guild) {
        document.getElementById('guild-create-zone').style.display = 'none';
        document.getElementById('active-guild').style.display = 'block';
        document.getElementById('gTitle').innerText = currentUser.guild;
        document.getElementById('gInitial').innerText = currentUser.guild[0].toUpperCase();
        document.getElementById('roleText').innerText = "Status: " + currentUser.role.toUpperCase();
        
        // Appeal Status
        if (currentUser.warAppeal) {
            document.getElementById('request-war-btn').style.display = 'none';
            document.getElementById('war-pending-msg').style.display = 'block';
        }
    }

    renderTasks();
    renderEvents();
    renderHallOfFame();
    renderApprovals();
    renderBattlefield();
}

// --- Admin Approvals & War Logic ---
function requestWar() {
    currentUser.warAppeal = true;
    saveDB();
    refreshUI();
    alert("Appeal sent to the Creator.");
}

function renderApprovals() {
    const list = document.getElementById('approval-list');
    if (!list) return;
    list.innerHTML = "";
    
    const appeals = users.filter(u => u.warAppeal);
    if (appeals.length === 0) {
        list.innerHTML = "<p class='empty-msg'>No pending war appeals.</p>";
        return;
    }

    appeals.forEach(u => {
        list.innerHTML += `
            <div class="profile-card hero-centered">
                <h4>Guild: ${u.guild}</h4>
                <p>Leader: ${u.name}</p>
                <button class="complete-btn" onclick="approveWar('${u.name}', '${u.guild}')">Approve War</button>
            </div>`;
    });
}

function approveWar(leaderName, guildName) {
    const instructions = prompt(`Enter War Instructions for ${guildName}:`);
    if (instructions === null) return;

    activeWar = { guild: guildName, leader: leaderName, instructions: instructions };
    
    // Reset the appeal status
    const uIdx = users.findIndex(u => u.name === leaderName);
    users[uIdx].warAppeal = false;
    
    saveDB();
    refreshUI();
}

function renderBattlefield() {
    if (!activeWar) return;
    document.getElementById('war-guild-name').innerText = activeWar.guild + " Strategy";
    document.getElementById('war-instructions-text').innerText = activeWar.instructions;
}

function declareWinner() {
    if (!activeWar) return;
    const gName = activeWar.guild;
    const lName = activeWar.leader;

    alert(`ADMIN: Declaring ${gName} as Victor! War concluded.`);
    
    // Grant Reward to Leader
    const uIdx = users.findIndex(u => u.name === lName);
    if (uIdx > -1) users[uIdx].gold += 1000;
    
    activeWar = null;
    saveDB();
    refreshUI();
    showContent('dashboard', document.querySelector('.tab'));
}

// --- Admin Events ---
function postEvent() {
    const title = document.getElementById('evTitle').value;
    const gold = parseInt(document.getElementById('evGold').value);
    if (!title || !gold) return;
    globalEvents.unshift({ title, gold });
    saveDB();
    renderEvents();
}

function renderEvents() {
    const list = document.getElementById('event-list');
    list.innerHTML = "";
    if (globalEvents.length === 0) {
        if (currentUser.role !== 'admin') {
            list.innerHTML = `<p class="empty-msg">Waiting for the Creator to post events...</p>`;
        }
        return;
    }
    globalEvents.forEach((ev, i) => {
        list.innerHTML += `
            <div class="event-item">
                <h4 style="color:var(--accent-blue)">${ev.title}</h4>
                <p style="color:var(--accent-gold)">+ ${ev.gold} Gold</p>
                <button class="complete-btn" style="width:100%; margin-top:10px" onclick="claimEvent(${i})">Complete</button>
            </div>`;
    });
}

function claimEvent(i) {
    if (currentUser.role === 'admin') return;
    currentUser.gold += globalEvents[i].gold;
    alert("Reward Claimed!");
    updateUI();
    saveDB();
}

// --- Tasks ---
function addTask(type) {
    const inputId = type === 'training' ? 'tIn' : (type === 'quests' ? 'qIn' : 'bIn');
    const val = document.getElementById(inputId).value;
    if (!val) return;
    currentUser.tasks.push({ id: Date.now(), text: val, type });
    document.getElementById(inputId).value = "";
    saveDB(); renderTasks();
}

function renderTasks() {
    ['training', 'quests', 'boss'].forEach(type => {
        const container = document.getElementById(`${type}-list`);
        if(!container) return;
        container.innerHTML = "";
        currentUser.tasks.filter(t => t.type === type).forEach(t => {
            container.innerHTML += `
                <div class="profile-card" style="padding:15px; margin-bottom:10px;">
                    <span style="flex:1">${t.text}</span>
                    <button class="complete-btn" onclick="finishTask(${t.id})">Finish</button>
                </div>`;
        });
    });
}

function finishTask(id) {
    const idx = currentUser.tasks.findIndex(t => t.id === id);
    const task = currentUser.tasks[idx];
    currentUser.xp += 25;
    if (currentUser.xp >= 100) { currentUser.level++; currentUser.xp = 0; }
    if (task.type === 'boss') {
        currentUser.achievements.push({ text: task.text, date: new Date().toLocaleDateString() });
    }
    currentUser.tasks.splice(idx, 1);
    refreshUI();
    saveDB();
}

function renderHallOfFame() {
    const container = document.getElementById('ach-list');
    if (!container) return;
    container.innerHTML = "";
    if (!currentUser.achievements || currentUser.achievements.length === 0) return;
    currentUser.achievements.forEach((ach, i) => {
        container.innerHTML += `
            <div class="boss-frame">
                <button class="delete-trophy" onclick="deleteTrophy(${i})"><i class="fas fa-trash"></i></button>
                <i class="fas fa-dragon" style="font-size: 2rem; color: var(--accent-gold); margin-bottom: 10px;"></i>
                <h3>${ach.text}</h3>
                <p style="font-size:0.7rem; color:var(--text-dim)">Slayed on ${ach.date}</p>
            </div>`;
    });
}

function deleteTrophy(i) {
    currentUser.achievements.splice(i, 1);
    saveDB(); renderHallOfFame();
}

function createGuild() {
    const name = document.getElementById('newGName').value;
    if (currentUser.gold < 500) return alert("Insufficient Gold.");
    currentUser.gold -= 500;
    currentUser.guild = name;
    currentUser.role = 'leader';
    saveDB(); refreshUI();
}

function showContent(id, el) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
}