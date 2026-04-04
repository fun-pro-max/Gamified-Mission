/**
 * QUESTLOG MASTER SCRIPT - HIGH COMMAND EDITION
 */

// 1. Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDhHTiL8iTkoS7izGOneAY9W8w_aZVApAk",
    authDomain: "questlog-66f75.firebaseapp.com",
    projectId: "questlog-66f75",
    storageBucket: "questlog-66f75.firebasestorage.app",
    messagingSenderId: "529239161658",
    appId: "1:529239161658:web:fc8ef2162d12256ca5ee03"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. Constants & State
const ADMIN_CRED = { user: 'Gourav', pass: 'admin' };
const K_SESSION = 'realm_identity_eternal_final';
let currentUser = null, globalEvents = [], activeWar = null, currentNavDate = new Date(), isDataLoaded = false;
let currentClaimData = null, selectedDateStr = null;

// --- MASTER QUIZ POOL ---
const masterQuizPool = [
    {q: "Which metal is the Alchemist's ultimate goal?", a: ["Silver","Gold","Iron"], c: 1},
    {q: "A fortification built upon a hill is a?", a: ["Motte","Keep","Dungeon"], c: 0},
    {q: "Which metal rusts when kissed by air?", a: ["Gold","Iron","Lead"], c: 1},
    {q: "The code of a Knight is known as?", a: ["Fealty","Heraldry","Chivalry"], c: 2},
    {q: "Alchemy's 'Aqua Regia' can dissolve which metal?", a: ["Iron","Silver","Gold"], c: 2},
    {q: "Ancient paper made from skins is called?", a: ["Parchment","Papyrus","Scroll"], c: 0},
    {q: "A defensive ditch around a castle is a?", a: ["Moat","Trench","Canyon"], c: 0},
    {q: "Which stars guided sailors in the North?", a: ["Orion","Polaris","Sirius"], c: 1},
    {q: "What Bird is the symbol of alchemy's final stage?", a: ["Raven","Phoenix","Eagle"], c: 1},
    {q: "The inner stronghold of a castle is the?", a: ["Keep","Bailey","Turret"], c: 0}
];
let activeQuizSet = [], quizIdx = 0, quizScore = 0;
let archSeq = [], userSeq = [], archRound = 1, isArcherPlaying = false;

// --- 1. INITIALIZATION ---
window.onload = async () => {
    const savedID = localStorage.getItem(K_SESSION);
    startGlobalListeners();
    if (savedID) { await autoLogin(savedID); } 
    else { document.getElementById('auth-overlay').style.display = 'flex'; }
    document.getElementById('evidenceUpload').onchange = handleProofUpload;
};

async function autoLogin(name) {
    if (name === ADMIN_CRED.user) {
        const doc = await db.collection("users").doc("admin_global").get();
        let admin = { name: ADMIN_CRED.user, role: 'admin', gold: 99999, level: 99, xp: 0, tasks: [], avatar: null, markedDates: [] };
        if (doc.exists) admin = { ...admin, ...doc.data() };
        login(admin);
    } else {
        const doc = await db.collection("users").doc(name).get();
        if (doc.exists) login({ name, ...doc.data() });
        else document.getElementById('auth-overlay').style.display = 'flex';
    }
}

async function handleAuth() {
    const name = document.getElementById('username').value.trim(), pass = document.getElementById('password').value.trim();
    if (!name || !pass) return;
    if (name === ADMIN_CRED.user && pass === ADMIN_CRED.pass) { autoLogin(name); return; }
    const ref = db.collection("users").doc(name), doc = await ref.get();
    if (doc.exists) {
        if (doc.data().pass === pass) login({ name, ...doc.data() });
        else alert("Incorrect Passkey.");
    } else {
        const newUser = { pass, role: 'player', gold: 100, level: 1, xp: 0, guild: null, tasks: [], achievements: [], warAppeal: false, markedDates: [], avatar: null };
        await ref.set(newUser); login({ name, ...newUser });
    }
}

function login(user) {
    currentUser = user; isDataLoaded = true;
    localStorage.setItem(K_SESSION, user.name);
    document.getElementById('auth-overlay').style.display = 'none';
    if (user.avatar) document.getElementById('imagePreview').src = user.avatar;
    document.getElementById('sidebar-id').innerText = `ID: ${user.name} // ${user.role}`;
    refreshUI();
}

async function saveState() {
    if (!db || !currentUser || !isDataLoaded) return;
    const docId = (currentUser.role === 'admin') ? "admin_global" : currentUser.name;
    const data = { gold: currentUser.gold, xp: currentUser.xp, level: currentUser.level, guild: currentUser.guild || null, role: currentUser.role, tasks: currentUser.tasks || [], achievements: currentUser.achievements || [], warAppeal: currentUser.warAppeal || false, markedDates: currentUser.markedDates || [], avatar: currentUser.avatar || null };
    await db.collection("users").doc(docId).set(data, { merge: true });
}

// --- 2. UI & LISTENERS ---
function startGlobalListeners() {
    db.collection("events").orderBy("createdAt", "desc").onSnapshot(snap => {
        globalEvents = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderEvents();
    });
    db.collection("submissions").onSnapshot(() => { if(currentUser?.role === 'admin') syncApprovals(); });
    db.collection("warRoom").doc("status").onSnapshot(doc => {
        if (doc.exists) { activeWar = doc.data().activeWar || null; if(currentUser) refreshUI(); }
    });
}

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
        document.getElementById('lvlBar').style.width = currentUser.xp + "%";
        document.getElementById('progressPercent').innerText = currentUser.xp + "%";

        const titles = ["Novice", "Squire", "Knight", "Veteran", "Hero", "Legend", "Demigod"];
        document.getElementById('rankTitle').innerText = titles[Math.min(Math.floor(currentUser.level / 5), 6)] + " Adventurer";

        if (currentUser.guild) {
            document.getElementById('guild-create-zone').style.display = 'none';
            document.getElementById('active-guild').style.display = 'block';
            document.getElementById('gTitle').innerText = currentUser.guild;
            document.getElementById('gInitial').innerText = currentUser.guild[0].toUpperCase();
            if (currentUser.warAppeal) document.getElementById('request-war-btn').style.display = 'none';
        } else {
            document.getElementById('guild-create-zone').style.display = 'block';
            document.getElementById('active-guild').style.display = 'none';
        }
        renderBosses(); renderHallOfFame(); renderCalendar(); renderEvents();
        if (activeWar) renderBattlefield();
    });
}

// --- 3. ALCHEMIST ---
function startQuiz() { 
    activeQuizSet = [...masterQuizPool].sort(() => Math.random() - 0.5).slice(0, 10);
    quizIdx = 0; quizScore = 0; 
    document.getElementById('quiz-start').style.display = 'none'; 
    document.getElementById('quiz-play').style.display = 'block'; 
    showQ();
}
function showQ() {
    const d = activeQuizSet[quizIdx]; document.getElementById('quiz-q').innerText = d.q;
    const o = document.getElementById('quiz-options'); o.innerHTML = "";
    d.a.forEach((a, i) => o.innerHTML += `<button class="quiz-option" onclick="ansQ(${i})">${a}</button>`);
    document.getElementById('quiz-p').innerText = `Riddle ${quizIdx+1} of 10`;
}
async function ansQ(i) {
    if(i === activeQuizSet[quizIdx].c) quizScore++;
    quizIdx++;
    if(quizIdx < 10) showQ();
    else {
        if(quizScore >= 8) { alert("Wise mind! +25 XP"); await grantXP(); }
        else { alert(`Insufficient wisdom. Score: ${quizScore}/10`); }
        document.getElementById('quiz-play').style.display = 'none'; document.getElementById('quiz-start').style.display = 'block';
    }
}

// --- 4. ARCHER RANGE ---
async function startArcher() { 
    archRound = 1; 
    document.getElementById('archer-start').style.display = 'none'; 
    document.getElementById('archer-play').style.display = 'block'; 
    await nextRound(); 
}
async function nextRound() {
    userSeq = []; archSeq = []; isArcherPlaying = true;
    document.getElementById('archer-r').innerText = `Trial ${archRound} of 3`;
    document.getElementById('archer-status').innerText = "WATCH...";
    document.getElementById('rune-grid').classList.add('locked');
    for(let i=0; i<archRound+2; i++) archSeq.push(Math.floor(Math.random()*4));
    const stones = document.querySelectorAll('.rune-stone');
    for (let id of archSeq) {
        await new Promise(r => setTimeout(r, 600));
        stones[id].classList.add('active');
        await new Promise(r => setTimeout(r, 500));
        stones[id].classList.remove('active');
    }
    isArcherPlaying = false;
    document.getElementById('archer-status').innerText = "YOUR TURN!";
    document.getElementById('rune-grid').classList.remove('locked');
    enableArcherInput();
}
function enableArcherInput() {
    document.querySelectorAll('.rune-stone').forEach(s => s.onclick = async function() {
        if(isArcherPlaying) return;
        const id = parseInt(this.dataset.id); userSeq.push(id);
        this.classList.add('active'); setTimeout(()=>this.classList.remove('active'), 200);
        if(userSeq[userSeq.length-1] !== archSeq[userSeq.length-1]) { alert("Missed!"); resetArcher(); return; }
        if(userSeq.length === archSeq.length) {
            if(archRound < 3) { archRound++; setTimeout(nextRound, 1000); }
            else { alert("Bullseye! +25 XP"); resetArcher(); await grantXP(); }
        }
    });
}
function resetArcher() { document.getElementById('archer-play').style.display = 'none'; document.getElementById('archer-start').style.display = 'block'; }
async function grantXP() { currentUser.xp += 25; if(currentUser.xp>=100){currentUser.level++; currentUser.xp=0;} refreshUI(); await saveState(); }

// --- 5. EVENTS & APPROVALS ---
async function postEvent() {
    const t = document.getElementById('evTitle').value, g = parseInt(document.getElementById('evGold').value);
    if (!t || !g) return;
    await db.collection("events").add({ title: t, gold: g, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('evTitle').value = ""; document.getElementById('evGold').value = "";
}
async function deleteEvent(id) { 
    if (currentUser.role !== 'admin') return;
    if(confirm("Creator, permanently strike this proclamation?")) {
        const el = document.querySelector(`[data-ev-id="${id}"]`);
        if(el) el.style.display = 'none';
        await db.collection("events").doc(id).delete();
    }
}
function renderEvents() {
    const list = document.getElementById('event-list'); if(!list) return; list.innerHTML = "";
    const isAdmin = currentUser?.role === 'admin';
    globalEvents.forEach(ev => {
        list.innerHTML += `<div class="event-item" data-ev-id="${ev.id}">
            <div style="display:flex; justify-content:space-between"><h4>${ev.title}</h4>${isAdmin ? `<i class="fas fa-trash-alt" style="color:var(--danger); cursor:pointer" onclick="deleteEvent('${ev.id}')"></i>` : ''}</div>
            <p class="gold-reward" style="margin:5px 0;">+ ${ev.gold}g</p>
            ${!isAdmin ? `<button class="medieval-btn mini wide" onclick="openProof('${ev.id}','${ev.title}',${ev.gold})">Proof</button>` : ''}
        </div>`;
    });
}
function openProof(id, title, gold) { currentClaimData = {id, title, gold}; document.getElementById('evidenceUpload').click(); }
async function handleProofUpload(e) {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        await db.collection("submissions").add({ user: currentUser.name, title: currentClaimData.title, reward: currentClaimData.gold, proof: event.target.result, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        alert("Sent for approval.");
    };
    reader.readAsDataURL(e.target.files[0]);
}
async function syncApprovals() {
    const subs = (await db.collection("submissions").get()).docs.map(d => ({id: d.id, ...d.data()}));
    const wars = (await db.collection("users").where("warAppeal", "==", true).get()).docs.map(d => ({ name: d.id, ...d.data() }));
    const list = document.getElementById('approval-list'); if(!list) return;
    list.innerHTML = (subs.length === 0 && wars.length === 0) ? "<p style='text-align:center'>Quiet...</p>" : "";
    subs.forEach(s => {
        list.innerHTML += `<div class="profile-card"><h3>${s.user}: ${s.title}</h3><img src="${s.proof}" style="width:100%; border-radius:4px; margin:10px 0"><button class="medieval-btn" onclick="approveClaim('${s.id}','${s.user}',${s.reward})">Grant Gold</button></div>`;
    });
    wars.forEach(w => {
        list.innerHTML += `<div class="profile-card"><h3>War Appeal: ${w.guild}</h3><button class="medieval-btn" onclick="approveWar('${w.name}','${w.guild}')">Sanction War</button></div>`;
    });
}
async function approveClaim(id, user, gold) {
    const ref = db.collection("users").doc(user), doc = await ref.get();
    if(doc.exists) await ref.update({ gold: (doc.data().gold || 0) + gold });
    await db.collection("submissions").doc(id).delete();
}

// --- 6. GUILD & WAR ---
async function createGuild() {
    const n = document.getElementById('newGName').value.trim();
    if (currentUser.level < 10) return alert("Level 10 required.");
    if (currentUser.gold < 1000) return alert("1,000 Gold required.");
    currentUser.gold -= 1000; currentUser.guild = n; currentUser.role = 'leader';
    await saveState(); refreshUI();
}
async function requestWar() { currentUser.warAppeal = true; await saveState(); refreshUI(); }
async function approveWar(leader, guild) {
    const type = prompt("Enter Trial: 'archer' or 'alchemist'");
    const cmds = prompt("Strategy:");
    await db.collection("warRoom").doc("status").set({ activeWar: { guild, leader, instructions: cmds, type } });
    await db.collection("users").doc(leader).update({ warAppeal: false });
}
function renderBattlefield() {
    if (!activeWar) return;
    document.getElementById('war-guild-name').innerText = `${activeWar.guild} : Trial of ${activeWar.type}`;
    document.getElementById('war-instructions-text').innerText = activeWar.instructions;
}
async function declareWinner() {
    if (!activeWar) return;
    const ref = db.collection("users").doc(activeWar.leader);
    const doc = await ref.get();
    if (doc.exists) await ref.update({ gold: (doc.data().gold || 0) + 2000 });
    await db.collection("warRoom").doc("status").update({ activeWar: null });
    alert("Victory Declared.");
}

// --- 7. CORE MODULES ---
function addTask(type) {
    const val = document.getElementById('bIn').value.trim();
    if(!val) return; currentUser.tasks.push({id:Date.now(), text:val, type:'boss'});
    document.getElementById('bIn').value = ""; renderBosses(); saveState();
}
function renderBosses() {
    const cont = document.getElementById('boss-list'); if(!cont) return; cont.innerHTML = "";
    (currentUser.tasks || []).filter(t => t.type === 'boss').forEach(t => {
        cont.innerHTML += `<div class="profile-card" style="display:flex; justify-content:space-between"><span>${t.text}</span><button class="medieval-btn mini" onclick="deleteBoss(${t.id})">Remove</button></div>`;
    });
}
function deleteBoss(id) { currentUser.tasks = currentUser.tasks.filter(t => t.id !== id); renderBosses(); saveState(); }

function renderCalendar() {
    const grid = document.getElementById('calendarGrid'); if(!grid) return; grid.innerHTML = "";
    const y = currentNavDate.getFullYear(), m = currentNavDate.getMonth();
    document.getElementById('calendarMonth').innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentNavDate);
    const start = new Date(y, m, 1).getDay(), end = new Date(y, m+1, 0).getDate();
    for(let i=0; i<start; i++) grid.innerHTML += `<div></div>`;
    const marked = currentUser.markedDates || [];
    for(let d=1; d<=end; d++) {
        const dStr = `${y}-${m+1}-${d}`;
        const hasNote = (currentUser.markedDates || []).find(x => x.date === dStr);
        grid.innerHTML += `<div class="calendar-day ${hasNote ? 'marked' : ''}" onclick="openNote('${dStr}')">${d}</div>`;
    }
}
function openNote(d) { selectedDateStr = d; document.getElementById('calendar-modal').style.display='grid'; }
function closeCalendarModal() { document.getElementById('calendar-modal').style.display='none'; }
async function saveDayNote() {
    const n = document.getElementById('day-note-input').value.trim();
    if(!currentUser.markedDates) currentUser.markedDates = [];
    currentUser.markedDates.push({date: selectedDateStr, note: n});
    renderCalendar(); await saveState(); closeCalendarModal();
}
function changeMonth(d) { currentNavDate.setMonth(currentNavDate.getMonth() + d); renderCalendar(); }

function uploadAvatar(input) {
    if (input.files[0]) {
        const r = new FileReader();
        r.onload = (e) => { currentUser.avatar = e.target.result; document.getElementById('imagePreview').src = e.target.result; saveState(); };
        r.readAsDataURL(input.files[0]);
    }
}

function showContent(id, el) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active'); el.classList.add('active');
}

function renderHallOfFame() {
    const list = document.getElementById('ach-list'); if(!list) return; list.innerHTML = "";
    (currentUser.achievements || []).forEach((ach) => {
        list.innerHTML += `<div class="boss-frame"><i class="fas fa-dragon" style="font-size:2rem; color:var(--gold); margin-bottom:10px;"></i><h3>${ach.text}</h3></div>`;
    });
}