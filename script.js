/**
 * QUESTLOG MASTER SCRIPT - HIGH COMMAND EDITION
 * Fix: Permanent Event Deletion for Admin
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

// 2. State & Admin
const ADMIN_CRED = { user: 'Gourav', pass: 'admin' };
const K_SESSION = 'realm_identity_eternal_final';
let currentUser = null, globalEvents = [], currentNavDate = new Date(), isDataLoaded = false;
let currentClaimData = null, selectedDateStr = null;

// --- ALCHEMIST MASTER QUIZ POOL ---
const masterQuizPool = [
    {q: "Which metal is the Alchemist's ultimate goal?", a: ["Silver","Gold","Iron"], c: 1},
    {q: "A fortification built upon a hill is a?", a: ["Motte","Keep","Dungeon"], c: 0},
    {q: "Which metal rusts when kissed by air?", a: ["Gold","Iron","Lead"], c: 1},
    {q: "The code of a Knight is known as?", a: ["Fealty","Heraldry","Chivalry"], c: 2},
    {q: "Which weapon was used to launch stones at walls?", a: ["Ballista","Trebuchet","Longbow"], c: 1},
    {q: "An apprentice alchemist is often called a?", a: ["Squire","Neophyte","Page"], c: 1},
    {q: "Ancient paper made from skins is called?", a: ["Parchment","Papyrus","Scroll"], c: 0},
    {q: "A defensive ditch around a castle is a?", a: ["Moat","Trench","Canyon"], c: 0},
    {q: "Alchemy's 'Aqua Regia' can dissolve which metal?", a: ["Iron","Silver","Gold"], c: 2},
    {q: "A standard unit of gold purity is the?", a: ["Ounce","Karat","Ingot"], c: 1},
    {q: "What bird is the symbol of alchemy's final stage?", a: ["Raven","Phoenix","Eagle"], c: 1},
    {q: "Which substance was called 'Quick-Silver'?", a: ["Silver","Mercury","Lead"], c: 1},
    {q: "What was used to seal secret scrolls?", a: ["Lead","Wax","Clay"], c: 1},
    {q: "A 'Great Sword' held with two hands is a?", a: ["Rapier","Claymore","Dagger"], c: 1},
    {q: "The study of coat of arms and lineages is?", a: ["Heraldry","Chivalry","Fealty"], c: 0},
    {q: "The inner stronghold of a castle is the?", a: ["Keep","Bailey","Turret"], c: 0},
    {q: "What color is the 'Philosopher's Stone'?", a: ["Gold","Red","Emerald"], c: 1},
    {q: "Which stars guided sailors in the North?", a: ["Orion","Polaris","Sirius"], c: 1},
    {q: "What is the primary ingredient in medieval ink?", a: ["Oak Gall","Berry Juice","Charcoal"], c: 0},
    {q: "A knight's servant and student is a?", a: ["Peasant","Squire","Serf"], c: 1}
];
let activeQuizSet = [], quizIdx = 0, quizScore = 0;

// --- INITIALIZATION FLOW ---
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
        else alert("Passkey Incorrect.");
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
    const data = { gold: currentUser.gold, xp: currentUser.xp, level: currentUser.level, role: currentUser.role, tasks: currentUser.tasks || [], achievements: currentUser.achievements || [], markedDates: currentUser.markedDates || [], avatar: currentUser.avatar };
    await db.collection("users").doc(docId).set(data, { merge: true });
}

// --- CORE UI & LISTENERS ---
function startGlobalListeners() {
    db.collection("events").orderBy("createdAt", "desc").onSnapshot(snap => {
        globalEvents = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderEvents();
    });
    db.collection("submissions").onSnapshot(() => { if(currentUser?.role === 'admin') syncApprovals(); });
}

async function syncApprovals() {
    const subs = (await db.collection("submissions").get()).docs.map(d => ({id: d.id, ...d.data()}));
    renderApprovals(subs);
}

function refreshUI() {
    if (!currentUser) return;
    requestAnimationFrame(() => {
        const isAdmin = currentUser.role === 'admin';
        document.getElementById('admin-tab-link').style.display = isAdmin ? 'flex' : 'none';
        document.querySelectorAll('.admin-only').forEach(e => e.style.display = isAdmin ? 'block' : 'none');

        document.getElementById('heroName').innerText = currentUser.name;
        document.getElementById('goldCount').innerText = currentUser.gold;
        document.getElementById('displayLevel').innerText = currentUser.level;
        document.getElementById('lvlBar').style.width = currentUser.xp + "%";
        document.getElementById('progressPercent').innerText = currentUser.xp + "%";

        const titles = ["Novice", "Squire", "Knight", "Veteran", "Hero", "Legend", "Demigod"];
        document.getElementById('rankTitle').innerText = titles[Math.min(Math.floor(currentUser.level / 5), 6)] + " Adventurer";

        renderBosses(); renderHallOfFame(); renderCalendar(); renderEvents();
    });
}

// --- ALCHEMIST ---
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
        if(quizScore >= 8) { alert("Exceptional Mind! +25 XP"); await grantXP(); }
        else { alert(`Try again. Score: ${quizScore}/10`); }
        document.getElementById('quiz-play').style.display = 'none'; document.getElementById('quiz-start').style.display = 'block';
    }
}

// --- ARCHER ---
// --- ARCHER RANGE 2.0 ENGINE ---
let archSeq = [];
let userSeq = [];
let archRound = 1;
let isSequencePlaying = false;

async function startArcher() { 
    archRound = 1; 
    document.getElementById('archer-start').style.display = 'none'; 
    document.getElementById('archer-play').style.display = 'block'; 
    await nextRound(); 
}

async function nextRound() {
    userSeq = [];
    archSeq = [];
    isSequencePlaying = true;
    
    // UI Feedback
    document.getElementById('archer-r').innerText = `Trial ${archRound} of 3`;
    document.getElementById('archer-status').innerText = "WATCH CAREFULLY...";
    document.getElementById('rune-grid').classList.add('locked');

    // 1. Generate Sequence (gets longer every round)
    const seqLength = archRound + 2; 
    for(let i=0; i < seqLength; i++) {
        archSeq.push(Math.floor(Math.random() * 4));
    }

    // 2. Play Sequence
    await sleep(1000);
    const stones = document.querySelectorAll('.rune-stone');
    
    for (let id of archSeq) {
        stones[id].classList.add('active');
        await sleep(600); // Highlight time
        stones[id].classList.remove('active');
        await sleep(300); // Gap between flashes
    }

    // 3. Enable User Input
    isSequencePlaying = false;
    document.getElementById('archer-status').innerText = "YOUR TURN!";
    document.getElementById('rune-grid').classList.remove('locked');
    enableArcherInput();
}

function enableArcherInput() {
    const stones = document.querySelectorAll('.rune-stone');
    stones.forEach(s => {
        s.onclick = async function() {
            if(isSequencePlaying) return; // Safety check

            const id = parseInt(this.dataset.id);
            userSeq.push(id);
            
            // Visual feedback for click
            this.classList.add('active');
            setTimeout(() => this.classList.remove('active'), 200);

            // Check correctness
            if(userSeq[userSeq.length-1] !== archSeq[userSeq.length-1]) {
                document.getElementById('archer-status').innerText = "MISSED THE MARK!";
                alert("The elements rejected your focus. Start the trial again.");
                resetArcher();
                return;
            }

            // Check if finished sequence
            if(userSeq.length === archSeq.length) {
                if(archRound < 3) {
                    archRound++;
                    document.getElementById('archer-status').innerText = "BULLSEYE!";
                    await sleep(1000);
                    nextRound();
                } else {
                    document.getElementById('archer-status').innerText = "MASTER ARCHER!";
                    alert("The Four Elements have acknowledged your focus! +25 XP");
                    resetArcher();
                    await grantXP(); // Shared function to add XP/Level Up
                }
            }
        };
    });
}

// Utility function for timing
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function resetArcher() {
    isSequencePlaying = false;
    document.getElementById('archer-play').style.display = 'none'; 
    document.getElementById('archer-start').style.display = 'block'; 
    // Clean up listeners
    document.querySelectorAll('.rune-stone').forEach(s => s.onclick = null);
}

// --- EVENT SYSTEM (FIXED PERMANENT DELETE) ---
async function postEvent() {
    const t = document.getElementById('evTitle').value, g = parseInt(document.getElementById('evGold').value);
    if (!t || !g) return;
    await db.collection("events").add({ title: t, gold: g, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('evTitle').value = ""; document.getElementById('evGold').value = "";
}

// --- UPDATED AGGRESSIVE DELETION ---
async function deleteEvent(id) { 
    if (currentUser.role !== 'admin') {
        alert("Only the Creator holds the power to strike down a proclamation.");
        return;
    }

    if(confirm("Creator, shall this event be erased from the scrolls of history forever?")) {
        try {
            // 1. Remove from local memory immediately (Optimistic UI)
            globalEvents = globalEvents.filter(ev => ev.id !== id);
            
            // 2. Clear the UI list immediately so it disappears before the server responds
            const list = document.getElementById('event-list');
            const itemToRemove = list.querySelector(`[data-event-id="${id}"]`);
            if (itemToRemove) itemToRemove.style.display = 'none';

            // 3. Send the execution command to the Cloud
            await db.collection("events").doc(id).delete();
            
            console.log("The proclamation has been eradicated.");
        } catch (error) {
            console.error("The record resisted deletion:", error);
            alert("Connection error: The database resisted the strike. Check your Kingdom's Firestore Rules.");
            // Refresh UI to show the item again since it failed to delete on server
            renderEvents();
        }
    } 
}

function renderEvents() {
    const list = document.getElementById('event-list'); 
    if(!list) return; 
    list.innerHTML = "";
    
    const isAdmin = (currentUser?.role === 'admin');
    
    if (globalEvents.length === 0 && !isAdmin) {
        list.innerHTML = "<p class='small-label' style='text-align:center'>No proclamations in the Kingdom.</p>";
        return;
    }

    globalEvents.forEach(ev => {
        // We add a data-attribute so the delete function can hide it instantly
        list.innerHTML += `
            <div class="event-item" data-event-id="${ev.id}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="margin:0;">${ev.title}</h4>
                    ${isAdmin ? `<i class="fas fa-trash-alt" style="color:var(--danger); cursor:pointer; font-size:0.85rem;" onclick="deleteEvent('${ev.id}')"></i>` : ''}
                </div>
                <p class="gold-reward" style="margin: 5px 0;">+ ${ev.gold}g</p>
                ${!isAdmin ? `<button class="medieval-btn mini wide" onclick="openProof('${ev.id}','${ev.title}',${ev.gold})">Submit Proof</button>` : ''}
            </div>`;
    });
}

// --- APPROVALS ---
function openProof(id, title, gold) { currentClaimData = {id, title, gold}; document.getElementById('evidenceUpload').click(); }
async function handleProofUpload(e) {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        await db.collection("submissions").add({ user: currentUser.name, title: currentClaimData.title, reward: currentClaimData.gold, proof: event.target.result, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        alert("Proof sent for approval.");
    };
    reader.readAsDataURL(e.target.files[0]);
}
async function syncApprovals() {
    const subs = (await db.collection("submissions").get()).docs.map(d => ({id: d.id, ...d.data()}));
    const list = document.getElementById('approval-list'); if(!list) return;
    list.innerHTML = (subs.length === 0) ? "<p style='text-align:center'>No appeals found.</p>" : "";
    subs.forEach(s => {
        list.innerHTML += `<div class="profile-card"><h3>${s.user}: ${s.title}</h3><img src="${s.proof}" style="width:100%; border-radius:4px; margin:10px 0"><button class="medieval-btn" onclick="approveClaim('${s.id}','${s.user}',${s.reward})">Grant Gold</button></div>`;
    });
}
async function approveClaim(id, user, gold) {
    const ref = db.collection("users").doc(user), doc = await ref.get();
    if(doc.exists) await ref.update({ gold: (doc.data().gold || 0) + gold });
    await db.collection("submissions").doc(id).delete(); alert("Gold granted.");
}

// --- CORE ---
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
    for(let d=1; d<=end; d++) {
        const dStr = `${y}-${m+1}-${d}`;
        const has = (currentUser.markedDates || []).includes(dStr);
        grid.innerHTML += `<div class="calendar-day ${has ? 'marked' : ''}" onclick="toggleDate('${dStr}')">${d}</div>`;
    }
}
async function toggleDate(d) {
    if(!currentUser.markedDates) currentUser.markedDates = [];
    const idx = currentUser.markedDates.indexOf(d);
    if(idx > -1) currentUser.markedDates.splice(idx, 1); else currentUser.markedDates.push(d);
    renderCalendar(); await saveState();
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