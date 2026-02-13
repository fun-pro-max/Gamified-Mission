let state = {
    level: 1, xp: 0, gold: 100,
    name: "Legendary Warrior",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    tasks: [], achievements: [],
    events: [
        { id: 1, title: "Grand Crusade: Clear 5 Tasks", reward: 150, approved: false },
        { id: 2, title: "Slay the Code Bug", reward: 300, approved: false }
    ],
    myGuild: null,
    guilds: [
        { name: "Shadow Walkers", members: 12, rank: 1 },
        { name: "Iron Order", members: 8, rank: 2 }
    ]
};

// --- Core Initialization ---
window.onload = () => {
    const saved = localStorage.getItem('questLog_v2');
    if (saved) state = JSON.parse(saved);
    updateUI();
    renderTasks();
    renderAchievements();
    renderEvents();
    renderGuilds();
};

function saveData() { localStorage.setItem('questLog_v2', JSON.stringify(state)); }

function updateUI() {
    document.getElementById('displayLevel').innerText = state.level;
    document.getElementById('progressPercent').innerText = state.xp + "%";
    document.getElementById('lvlBar').style.width = state.xp + "%";
    document.getElementById('goldCount').innerText = state.gold;
    document.getElementById('heroName').innerText = state.name;
    document.getElementById('imagePreview').src = state.avatar;

    if (state.myGuild) {
        document.getElementById('guild-creation-zone').style.display = 'none';
        document.getElementById('active-guild-view').style.display = 'block';
        document.getElementById('myGuildName').innerText = state.myGuild.name;
        document.getElementById('myGuildBanner').innerText = state.myGuild.name[0];
    }
}

// --- Admin Event Logic ---
function adminPostEvent() {
    const title = document.getElementById('newEventTitle').value;
    const gold = parseInt(document.getElementById('newEventGold').value);
    if (!title || !gold) return;

    state.events.push({ id: Date.now(), title, reward: gold, approved: false });
    renderEvents();
    saveData();
}

function renderEvents() {
    const list = document.getElementById('admin-events-list');
    list.innerHTML = "";
    state.events.forEach(ev => {
        const div = document.createElement('div');
        div.className = "event-card";
        div.innerHTML = `
            <h4>${ev.title}</h4>
            <span class="gold-reward"><i class="fas fa-coins"></i> ${ev.reward} Gold</span>
            <button class="approve-btn" onclick="approveEvent(${ev.id})">Claim Reward</button>
        `;
        list.appendChild(div);
    });
}

function approveEvent(id) {
    const idx = state.events.findIndex(e => e.id === id);
    state.gold += state.events[idx].reward;
    state.events.splice(idx, 1);
    updateUI();
    renderEvents();
    saveData();
    alert("Admin approved your request! Gold added.");
}

// --- Guild Logic ---
function openGuildModal() { document.getElementById('guildModal').style.display = 'grid'; }
function closeGuildModal() { document.getElementById('guildModal').style.display = 'none'; }

function confirmCreateGuild() {
    const name = document.getElementById('newGuildName').value;
    if (state.gold < 500) { alert("Not enough gold!"); return; }
    if (!name) return;

    state.gold -= 500;
    state.myGuild = { name: name, members: 1, tasks: [], chat: [] };
    closeGuildModal();
    updateUI();
    saveData();
}

function startGuildWar() {
    if (state.myGuild.members < 5) {
        alert("Requirements not met: Need at least 5 members to declare war!");
        // Simulate recruitment for demo
        if(confirm("Would you like to recruit mercenaries for 100 gold?")) {
            if(state.gold >= 100) {
                state.gold -= 100;
                state.myGuild.members += 4;
                updateUI();
                saveData();
            }
        }
        return;
    }
    alert("GUILD WAR STARTED! Your guild is attacking 'Shadow Walkers'...");
    setTimeout(() => {
        const win = Math.random() > 0.5;
        if(win) {
            alert("VICTORY! Your guild earned 1000 Gold and Rank Points!");
            state.gold += 1000;
        } else {
            alert("DEFEAT! Your defenses were breached.");
        }
        updateUI();
        saveData();
    }, 2000);
}

function sendGuildChat() {
    const input = document.getElementById('chatInput');
    if (!input.value) return;
    const msg = `You: ${input.value}`;
    const div = document.createElement('div');
    div.innerText = msg;
    document.getElementById('guildChat').appendChild(div);
    input.value = "";
}

function renderGuilds() {
    const list = document.getElementById('all-guilds-list');
    state.guilds.forEach(g => {
        const div = document.createElement('div');
        div.className = "task-card quests";
        div.innerHTML = `
            <div class="task-icon"><i class="fas fa-shield"></i></div>
            <div><h3>${g.name}</h3><p>Members: ${g.members}</p></div>
            <button class="complete-btn" onclick="alert('Joined simulated guild!')">Join</button>
        `;
        list.appendChild(div);
    });
}

// --- Existing Task Logic (Condensed) ---
function addTask(type) {
    const input = document.getElementById(`${type === 'boss' ? 'boss' : type}-input`);
    if (!input.value) return;
    state.tasks.push({ id: Date.now(), text: input.value, type, xp: type === 'boss' ? 100 : 25 });
    input.value = ""; renderTasks(); saveData();
}

function finishTask(id) {
    const idx = state.tasks.findIndex(t => t.id === id);
    const task = state.tasks[idx];
    if (task.type === 'boss') state.achievements.push({ title: `Slayer of ${task.text}`, date: new Date().toLocaleDateString() });
    
    // Gain a little gold for every task
    state.gold += 10;
    gainXP(task.xp);
    state.tasks.splice(idx, 1);
    renderTasks(); renderAchievements(); updateUI(); saveData();
}

function gainXP(amt) {
    state.xp += amt;
    if (state.xp >= 100) { state.level++; state.xp -= 100; playLevelAnimation(); }
}

function showContent(id, el) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
}

function renderTasks() {
    ['training', 'quests', 'boss'].forEach(type => {
        const container = document.getElementById(`${type === 'boss' ? 'boss' : type}-list`);
        container.innerHTML = "";
        state.tasks.filter(t => t.type === type).forEach(task => {
            const div = document.createElement('div');
            div.className = `task-card ${type}`;
            div.innerHTML = `<h3>${task.text}</h3><button class="complete-btn" onclick="finishTask(${task.id})">Finish</button>`;
            container.appendChild(div);
        });
    });
}

function renderAchievements() {
    const list = document.getElementById('achievements-list');
    list.innerHTML = state.achievements.map(a => `<div class="achievement-card"><h4>${a.title}</h4></div>`).join('');
}

function resetData() { if(confirm("Reset all?")) { localStorage.clear(); location.reload(); } }