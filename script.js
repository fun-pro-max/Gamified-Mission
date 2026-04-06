/**
 * QUESTLOG MASTER ENGINE - ULTIMATE SOVEREIGN EDITION
 * Features: High-Stability Archer 2.0, Randomized Alchemist (10 Quest),
 * Identity-Lock, Non-Blocking Admin Login, and Proclamation System.
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

// 2. Constants & Global State
const ADMIN_CRED = { user: 'Gourav', pass: 'admin' };
const K_SESSION = 'realm_identity_eternal_final';
let currentUser = null, globalEvents = [], activeWar = null, currentNavDate = new Date(), isDataLoaded = false;
let currentClaimData = null, selectedDateStr = null;

// ==========================================
// 3. MASTER NOTIFICATION SYSTEM (SCROLLS)
// ==========================================
function showRealmProclamation(text) {
    const banner = document.getElementById('realm-notif');
    const display = document.getElementById('notif-text');
    if(!banner) return;
    display.innerText = text;
    banner.classList.add('active');
    setTimeout(() => { banner.classList.remove('active'); }, 5000);
}

// ==========================================
// 4. INITIALIZATION & STABLE ADMIN FLOW
// ==========================================
window.onload = async () => {
    const savedID = localStorage.getItem(K_SESSION);
    startGlobalListeners();
    
    if (savedID) {
        // Fast-path: Recognize user immediately
        if (savedID === ADMIN_CRED.user) {
            login(createAdminSession());
            syncAdminCloudData();
        } else {
            autoLogin(savedID);
        }
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
    
    const evIn = document.getElementById('evidenceUpload');
    if(evIn) evIn.onchange = handleProofUpload;
};

async function syncAdminCloudData() {
    const doc = await db.collection("users").doc("admin_global").get();
    if (doc.exists) {
        const data = doc.data();
        currentUser.avatar = data.avatar;
        currentUser.markedDates = data.markedDates || [];
        currentUser.tasks = data.tasks || [];
        if (data.avatar) document.getElementById('imagePreview').src = data.avatar;
        refreshUI();
    }
}

async function autoLogin(name) {
    const doc = await db.collection("users").doc(name).get();
    if (doc.exists) login({ name, ...doc.data() });
    else {
        localStorage.removeItem(K_SESSION);
        document.getElementById('auth-overlay').style.display = 'flex';
    }
}

async function handleAuth() {
    const name = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (!name || !pass) return;

    // 1. STACKED LOGIC: Check hardcoded Admin credentials first
    if (name === ADMIN_CRED.user && pass === ADMIN_CRED.pass) {
        // Fetch Admin global data to preserve their individual profile (avatar/ledger)
        const doc = await db.collection("users").doc("admin_global").get();
        let admin = { name: name, role: 'admin', gold: 99999, level: 99, xp: 0, tasks: [], achievements: [] };
        if (doc.exists) admin = { ...admin, ...doc.data() };
        
        login(admin); // Login specifically as admin
        return;
    }

    // 2. PLAYER LOGIC: Fetch from database
    const ref = db.collection("users").doc(name);
    const doc = await ref.get();
    if (doc.exists) {
        if (doc.data().pass === pass) {
            login({ name, ...doc.data() }); // Log in as player (this user profile)
        } else {
            showRealmProclamation("Invalid Secret Key.");
        }
    } else {
        // Register new individual player space
        const hero = { pass, role: 'player', gold: 100, level: 1, xp: 0, guild: null, tasks: [], achievements: [] };
        await ref.set(hero);
        login({ name, ...hero });
    }
}

function createAdminSession() {
    return { name: ADMIN_CRED.user, role: 'admin', gold: 999999, level: 99, xp: 9999, tasks: [], avatar: null, markedDates: [] };
}

function login(user) {
    currentUser = user; isDataLoaded = true;
    localStorage.setItem(K_SESSION, user.name);
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    if (user.avatar) document.getElementById('imagePreview').src = user.avatar;
    document.getElementById('sidebar-id').innerText = `ID: ${user.name} // [${user.role.toUpperCase()}]`;
    refreshUI();
}
function refreshUI() {
    if (!currentUser) return;

    requestAnimationFrame(() => {
        // DEFINE ACCESS LEVEL
        const isAd = (currentUser.role === 'admin');

        // 🛡️ UI GATEKEEPER: THE IRON SEAL
        // Automatically hide or show ALL admin sections across the whole app
        document.querySelectorAll('.admin-only').forEach(element => {
            element.style.setProperty('display', isAd ? 'block' : 'none', 'important');
        });

        // HIDE/SHOW ADMIN-ONLY TABS IN SIDEBAR
        const adminTab = document.getElementById('admin-tab-link');
        if (adminTab) {
            adminTab.style.display = isAd ? 'flex' : 'none';
        }

        // HIDE CREATOR CONSOLE ON THE RIGHT SIDE PANEL
        const creatorConsole = document.getElementById('admin-controls');
        if (creatorConsole) {
            creatorConsole.style.display = isAd ? 'block' : 'none';
        }

        // --- Standard Individual Profile Logic ---
        document.getElementById('heroName').innerText = currentUser.name;
        document.getElementById('goldCount').innerText = currentUser.gold;
        document.getElementById('displayLevel').innerText = currentUser.level;
        document.getElementById('lvlBar').style.width = currentUser.xp + "%";
        
        // Dynamic Ranks (Individual)
        const titles = ["Novice", "Squire", "Knight", "Hero", "Legend", "Demigod"];
        const tIdx = Math.min(Math.floor(currentUser.level / 5), titles.length -1);
        document.getElementById('rankTitle').innerText = titles[tIdx] + " Adventurer";

        // Refresh dynamic list content for the current user
        renderEvents(); 
        renderHallOfFame(); 
        renderCalendar();
    });
}
// ==========================================
// 5. ALCHEMIST’S CHAMBER (REFINED 10-QUEST)
// ==========================================
const masterQuizPool = [
    {q: "Enemy of rust?", a: ["Iron", "Lead", "Gold"], c: 2},
    {q: "Paper born of animal skin?", a: ["Scroll", "Parchment", "Ink"], c: 1},
    {q: "Catalyst stone color?", a: ["Blue", "Gold", "Red"], c: 2},
    {q: "Castle inner stronghold?", a: ["Keep", "Moat", "Motte"], c: 0},
    {q: "The Alchemy solvent 'Aqua Regia' dissolves?", a: ["Silver", "Iron", "Gold"], c: 2},
    {q: "Strongest Siege weapon?", a: ["Catapult", "Trebuchet", "Ballista"], c: 1},
    {q: "Unit of gold purity?", a: ["Bar", "Karat", "Ingot"], c: 1},
    {q: "Mound and courtyard castle style?", a: ["Fortress", "Keep", "Motte & Bailey"], c: 2},
    {q: "Substance called 'Quick-Silver'?", a: ["Silver", "Mercury", "Platinum"], c: 1},
    {q: "Language of the high scrolls?", a: ["English", "Gothic", "Latin"], c: 2},
    {q: "The alchemist's true catalyst?", a: ["Philosopher's Stone", "Silver Bar", "Black Powder"], c: 0},
    {q: "Which metal is heaviest?", a: ["Iron", "Lead", "Gold"], c: 2},
    {q: "Archer's range essential?", a: ["Luck", "Fealty", "Focus"], c: 2},
    {q: "Medieval writing tool?", a: ["Quill", "Pencil", "Chalk"], c: 0},
    {q: "Bird of the rebirth?", a: ["Raven", "Phoenix", "Vulture"], c: 1}
];

let currentActiveSet = [];
let quizIdx = 0;
let quizScore = 0;

function startQuiz() {
    // Pick 10 random questions
    currentActiveSet = [...masterQuizPool].sort(() => 0.5 - Math.random()).slice(0, 10);
    quizIdx = 0;
    quizScore = 0;
    document.getElementById('quiz-start').style.display = 'none';
    document.getElementById('quiz-play').style.display = 'block';
    renderRiddle();
}

function renderRiddle() {
    const data = currentActiveSet[quizIdx];
    document.getElementById('quiz-q').innerText = data.q;
    const optBox = document.getElementById('quiz-options');
    optBox.innerHTML = "";
    
    data.a.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = "quiz-option";
        btn.innerText = choice;
        btn.onclick = () => submitRiddle(i);
        optBox.appendChild(btn);
    });
    document.getElementById('quiz-p').innerText = `Riddle ${quizIdx + 1} of 10`;
}

async function submitRiddle(i) {
    if(i === currentActiveSet[quizIdx].c) quizScore++;
    quizIdx++;

    if(quizIdx < 10) {
        renderRiddle();
    } else {
        document.getElementById('quiz-play').style.display = 'none';
        document.getElementById('quiz-start').style.display = 'block';
        if(quizScore >= 8) {
            showRealmProclamation(`Exceptional Wisdom. Score: ${quizScore}/10. +25 XP.`);
            await grantXP();
        } else {
            showRealmProclamation(`Your mind is clouded. Score: ${quizScore}/10. Try again.`);
        }
    }
}

// ==========================================
// 6. ARCHER RANGE 2.0 (STABLE ASYNC)
// ==========================================
let archSeq = [], userSeq = [], archRound = 1, isArcherPlaying = false;

async function startArcher() { 
    archRound = 1; 
    document.getElementById('archer-start').style.display = 'none'; 
    document.getElementById('archer-play').style.display = 'block'; 
    await nextRound(); 
}

async function nextRound() {
    userSeq = []; archSeq = []; isArcherPlaying = true;
    document.getElementById('archer-r').innerText = `Level ${archRound} of 3`;
    document.getElementById('archer-status').innerText = "WATCH THE ELEMENTS...";
    document.getElementById('rune-grid').classList.add('locked');
    
    for(let i=0; i < (archRound + 2); i++) archSeq.push(Math.floor(Math.random() * 4));
    
    const stones = document.querySelectorAll('.rune-stone');
    for (let id of archSeq) {
        await new Promise(r => setTimeout(r, 600));
        stones[id].classList.add('active');
        await new Promise(r => setTimeout(r, 500));
        stones[id].classList.remove('active');
    }
    
    isArcherPlaying = false;
    document.getElementById('archer-status').innerText = "YOUR SHOT!";
    document.getElementById('rune-grid').classList.remove('locked');
    enableArcherInput();
}

function enableArcherInput() {
    document.querySelectorAll('.rune-stone').forEach(s => s.onclick = async function() {
        if(isArcherPlaying) return;
        const id = parseInt(this.dataset.id); userSeq.push(id);
        this.classList.add('active'); setTimeout(() => this.classList.remove('active'), 200);
        if(userSeq[userSeq.length-1] !== archSeq[userSeq.length-1]) { showRealmProclamation("Target Missed!"); resetArcher(); return; }
        if(userSeq.length === archSeq.length) {
            if(archRound < 3) { archRound++; setTimeout(nextRound, 1000); }
            else { showRealmProclamation("Eagle Focus! +25 XP"); resetArcher(); await grantXP(); }
        }
    });
}
function resetArcher() { document.getElementById('archer-play').style.display = 'none'; document.getElementById('archer-start').style.display = 'block'; }

// ==========================================
// 7. SYSTEM CORES & SYNC
// ==========================================
async function grantXP() { 
    currentUser.xp += 25; 
    if(currentUser.xp >= 100){ currentUser.level++; currentUser.xp = 0; showRealmProclamation("LEVEL UP!"); } 
    refreshUI(); await saveState(); 
}

async function saveState() {
    if (!db || !currentUser || !isDataLoaded) return;
    const docId = (currentUser.role === 'admin') ? "admin_global" : currentUser.name;
    const data = { 
        gold: currentUser.gold, xp: currentUser.xp, level: currentUser.level, 
        guild: currentUser.guild || null, role: currentUser.role, 
        tasks: currentUser.tasks || [], achievements: currentUser.achievements || [], 
        warAppeal: currentUser.warAppeal || false, markedDates: currentUser.markedDates || [], 
        avatar: currentUser.avatar || null 
    };
    await db.collection("users").doc(docId).set(data, { merge: true });
}

function startGlobalListeners() {
    db.collection("events").orderBy("createdAt", "desc").onSnapshot(s => { 
        globalEvents = s.docs.map(d => ({id: d.id, ...d.data()})); 
        renderEvents(); 
    });
    db.collection("submissions").onSnapshot(() => { if(currentUser?.role === 'admin') syncApprovals(); });
}

async function postEvent() {
    const t = document.getElementById('evTitle').value, g = parseInt(document.getElementById('evGold').value);
    if (!t || !g) return;
    await db.collection("events").add({ title: t, gold: g, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('evTitle').value = ""; document.getElementById('evGold').value = "";
}

async function deleteEvent(id) { 
    if (currentUser.role !== 'admin') return;
    if(confirm("Strike proclamation from history?")) {
        const el = document.querySelector(`[data-ev-id="${id}"]`); if(el) el.style.display = 'none';
        await db.collection("events").doc(id).delete();
    }
}

function renderEvents() {
    const l = document.getElementById('event-list'); if(!l) return; l.innerHTML = "";
    globalEvents.forEach(ev => {
        l.innerHTML += `
            <div class="event-item" data-ev-id="${ev.id}">
                <div style="display:flex; justify-content:space-between"><h4>${ev.title}</h4>${currentUser.role==='admin'?`<i class="fas fa-trash-alt" onclick="deleteEvent('${ev.id}')"></i>`:''}</div>
                <p>+ ${ev.gold}g</p>${currentUser.role!=='admin'?`<button class="medieval-btn mini wide" onclick="openProof('${ev.id}','${ev.title}',${ev.gold})">Submit Proof</button>`:''}
            </div>`;
    });
}

function openProof(id, t, g) { currentClaimData = { id, title: t, gold: g }; document.getElementById('evidenceUpload').click(); }
async function handleProofUpload(e) {
    if (!e.target.files[0]) return;
    const r = new FileReader();
    r.onload = async(f) => {
        await db.collection("submissions").add({ user: currentUser.name, title: currentClaimData.title, reward: currentClaimData.gold, proof: f.target.result, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        showRealmProclamation("Proof dispatched to Creator.");
    };
    r.readAsDataURL(e.target.files[0]);
}

async function syncApprovals() {
    const sSnap = await db.collection("submissions").get();
    const l = document.getElementById('approval-list'); if(!l) return; l.innerHTML = "";
    sSnap.docs.forEach(s => {
        const d = s.data();
        l.innerHTML += `
            <div class="profile-card stone-border">
                <h3>${d.user}: ${d.title}</h3>
                <img src="${d.proof}" style="width:100%; margin:10px 0; border:2px solid var(--gold)">
                <button class="medieval-btn wide" onclick="approveClaim('${s.id}','${d.user}',${d.reward})">Grant Gold</button>
            </div>`;
    });
}

async function approveClaim(id, u, g) {
    const r = db.collection("users").doc(u), sn = await r.get();
    if(sn.exists) await r.update({ gold: (sn.data().gold || 0) + g });
    await db.collection("submissions").doc(id).delete();
    showRealmProclamation("Gold rewarded.");
}

// ==========================================
// 8. PROFILE / IMAGE UPLOAD
// ==========================================
function uploadAvatar(input) {
    if (input.files[0]) {
        const r = new FileReader();
        r.onload = (e) => {
            currentUser.avatar = e.target.result;
            document.getElementById('imagePreview').src = e.target.result;
            saveState();
            showRealmProclamation("Identity Portrait Updated.");
        };
        r.readAsDataURL(input.files[0]);
    }
}

// ==========================================
// 9. BOSS / CALENDAR / NAV
// ==========================================
function addTask(type) {
    const v = document.getElementById('bIn').value.trim();
    if(!v) return; currentUser.tasks.push({id: Date.now(), text: v, type: 'boss'});
    document.getElementById('bIn').value = ""; renderBosses(); saveState();
}

function renderBosses() {
    const c = document.getElementById('boss-list'); if(!c) return; c.innerHTML = "";
    (currentUser.tasks || []).filter(x => x.type === 'boss').forEach(t => {
        c.innerHTML += `<div class="profile-card stone-border" style="display:flex; justify-content:space-between"><span>${t.text}</span><button class="medieval-btn mini danger" onclick="delBoss(${t.id})">Erase</button></div>`;
    });
}
function delBoss(id) { currentUser.tasks = currentUser.tasks.filter(x => x.id !== id); renderBosses(); saveState(); }

function renderCalendar() {
    const g = document.getElementById('calendarGrid'); if(!g) return; g.innerHTML = "";
    const y = currentNavDate.getFullYear(), m = currentNavDate.getMonth();
    document.getElementById('calendarMonth').innerText = new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(currentNavDate);
    const s = new Date(y, m, 1).getDay(), e = new Date(y, m+1, 0).getDate();
    for(let i=0; i<s; i++) g.innerHTML += "<div></div>";
    const mkr = currentUser.markedDates || [];
    for(let d=1; d<=e; d++) {
        const str = `${y}-${m+1}-${d}`, h = mkr.find(x => x.date === str);
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${h ? 'marked' : ''} ${h?.note ? 'has-note' : ''}`;
        dayEl.innerText = d; dayEl.onclick = () => openNote(str); g.appendChild(dayEl);
    }
}

function openNote(d) { selectedDateStr = d; const m = (currentUser.markedDates || []).find(x => x.date === d); document.getElementById('day-note-input').value = m?.note || ""; document.getElementById('calendar-modal').style.display='grid'; }
function closeCalendarModal() { document.getElementById('calendar-modal').style.display='none'; }

async function saveDayNote() {
    const v = document.getElementById('day-note-input').value.trim();
    if(!currentUser.markedDates) currentUser.markedDates = [];
    const i = currentUser.markedDates.findIndex(x => x.date === selectedDateStr);
    if(i > -1) { if(!v) currentUser.markedDates.splice(i, 1); else currentUser.markedDates[i].note = v; }
    else { currentUser.markedDates.push({date: selectedDateStr, note: v}); }
    renderCalendar(); await saveState(); closeCalendarModal();
}

function changeMonth(d) { currentNavDate.setMonth(currentNavDate.getMonth() + d); renderCalendar(); }

/** 🔱 MOBILE SIDEBAR LOGIC (ROBUST VERSION) */
function toggleSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    if (!sidebar) return;
    
    // Log for debugging
    console.log("Command: Toggling Realm Gates...");
    
    if (sidebar.classList.contains('mobile-active')) {
        sidebar.classList.remove('mobile-active');
    } else {
        sidebar.classList.add('mobile-active');
    }
}

/** 🔱 NAVIGATION COMMANDS */
function showContent(id, el) {
    // 1. Clear All Map Sectors
    document.querySelectorAll('.content').forEach(c => {
        c.style.display = 'none';
        c.classList.remove('active');
    });
    
    // 2. Clear All Seals (Tabs)
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    // 3. Reveal Selected Chamber
    const target = document.getElementById(id);
    if(target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    // 4. Activate specific tab if provided
    if (el) {
        el.classList.add('active');
    } else {
        // Find tab based on ID for automated clicks
        const matchingTab = Array.from(document.querySelectorAll('.tab'))
            .find(t => t.innerText.toLowerCase().includes(id.substring(0,4)));
        if (matchingTab) matchingTab.classList.add('active');
    }

    // 🛡️ 5. AUTO-CLOSE DRAWER ON SELECTION (Mobile Only)
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) sidebar.classList.remove('mobile-active');
    }
}

async function createGuild() {
    const n = document.getElementById('newGName').value.trim();
    if(currentUser.level < 10 || currentUser.gold < 1000) return showRealmProclamation("Foundations Denied. Requirement Failed.");
    currentUser.gold -= 1000; currentUser.guild = n; currentUser.role = 'leader';
    await saveState(); refreshUI();
}

async function requestWar() { currentUser.warAppeal = true; await saveState(); refreshUI(); showRealmProclamation("War Declaration Sent."); }

/** 🏆 HALL OF FAME - LEGENDARY DECORATIONS & USER TROPHIES */
function renderHallOfFame() {
    const list = document.getElementById('ach-list');
    if (!list) return;
    
    // Clear previous dynamic entries
    list.innerHTML = "";

    // 🏴‍☠️ 1. PERMANENT DECORATIONS (The Great Pirate Posters)
    const legends = [
        { 
            name: "Monkey D. Luffy", 
            img: "luffy.jpg", // Update with your direct link
            bounty: "3,000,000,000",
            status: "MOST WANTED" 
        },
        { 
            name: "Roronoa Zoro", 
            img: "zoro.jpg", // Update with your direct link
            bounty: "1,111,000,000",
            status: "BLADE MASTER" 
        }
    ];

    legends.forEach(hero => {
        list.innerHTML += `
            <div class="boss-frame legendary-bounty">
                <p class="bounty-label">${hero.status}</p>
                <img src="${hero.img}" class="legendary-img">
                <h3>${hero.name}</h3>
                <p style="color:#5e0000; font-weight:bold; font-family:'MedievalSharp';">
                    <i class="fas fa-coins"></i> ${hero.bounty}
                </p>
            </div>`;
    });

    // ⚔️ 2. DYNAMIC USER TROPHIES (Bosses the player actually slayed)
    const myAchievements = currentUser.achievements || [];
    
    myAchievements.forEach((ach, i) => {
        list.innerHTML += `
            <div class="boss-frame stone-border">
                <!-- Delete only exists for user trophies, not Legends -->
                <button class="medieval-btn mini danger" style="position:absolute; top:8px; right:8px; padding:2px 6px;" onclick="delAch(${i})">
                    <i class="fas fa-eraser"></i>
                </button>
                <i class="fas fa-dragon" style="font-size:2rem; color:var(--gold); margin-bottom:10px;"></i>
                <h3>${ach.text}</h3>
                <p style="font-size:0.7rem; color:var(--text-dim);">Etched on: ${ach.date}</p>
            </div>`;
    });
}

// Logic: Concluded. Realm Stabilized.