// --- GLOBÁLNÍ PROMĚNNÉ ---
window.SB_URL = "https://iyvvwsnhezjrjrkscbyc.supabase.co";
window.SB_KEY = "sb_publishable_OehKo_l9qTAp-xfmlHpzOA_OYBp4ouc";
window.sb = null;

try { 
    if (window.supabase) window.sb = window.supabase.createClient(window.SB_URL, window.SB_KEY); 
} catch(e) {
    console.error("Nepodařilo se načíst Supabase", e);
}

window.APP_ROLE = "customer";
window.APP_USER = null;
window.STATE = { requests: [], craftJobs: [], marketRequests: [] };

window.poptHistoryText = "";
window.poptBase64 = null;
window.poptMime = null;
window.activeChatId = null;
window.msgSubscription = null;
window.currentRatingValue = 5;

// --- TOAST NOTIFIKACE ---
window.showToast = function(title, text, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    const iconHtml = type === 'success' 
        ? '<i class="fa-solid fa-check-circle text-green-500"></i>' 
        : (type === 'error' ? '<i class="fa-solid fa-circle-exclamation text-red-500"></i>' : '<i class="fa-solid fa-bell text-fixit-500"></i>');
    
    toast.className = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xl flex items-start gap-4 toast-enter pointer-events-auto';
    toast.innerHTML = `
        <div class="text-2xl mt-0.5 drop-shadow-sm">${iconHtml}</div>
        <div class="flex-1">
            <h4 class="font-extrabold text-sm dark:text-white leading-tight">${title}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">${text}</p>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => toast.remove(), 400);
    }, 4500);
}

// --- INIT A SESSION ---
window.addEventListener('load', async () => {
    // Schování loaderu po spuštění stránky
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transform = 'scale(1.05)';
            loader.style.pointerEvents = 'none';
            setTimeout(() => loader.remove(), 700);
        }
    }, 1000); 

    // Kontrola existující relace
    if (window.sb) {
        try {
            const { data: { session } } = await window.sb.auth.getSession();
            if (session && session.user) {
                window.APP_USER = session.user;
                window.APP_ROLE = session.user.user_metadata?.role || "customer";
                const name = session.user.user_metadata?.full_name || "Uživatel";
                
                const authScreen = document.getElementById("auth-screen");
                if (authScreen) authScreen.classList.add("hidden");
                
                const app = document.getElementById("main-app");
                if (app) {
                    app.classList.remove("hidden");
                    app.style.opacity = "1";
                }
                window.initApp(window.APP_ROLE, name);
            }
        } catch(e) {
            console.error("Chyba při kontrole relace", e);
        }
    }
});

// --- POMOCNÁ FUNKCE PRO EXTRAKCI FOTKY Z TEXTU ---
window.extractPhotoFromDesc = function(rawDesc) {
    if (!rawDesc) return { desc: "", photo: null, mime: null };
    const parts = rawDesc.split("||PHOTO||");
    if (parts.length > 1) {
        const desc = parts[0].trim();
        const photoParts = parts[1].split("||MIME||");
        return { desc: desc, photo: photoParts[0], mime: photoParts[1] };
    }
    return { desc: rawDesc, photo: null, mime: null };
}

// --- VYKRESLENÍ KRÁSNÝCH KARET ---
window.createBeautifulCard = function(req, isMarket, i) {
    try {
        const statusMap = { waiting:"Hledáme profíka", active:"Probíhá oprava", done:"Dokončeno" };
        const badgeMap = { waiting:"status-waiting", active:"status-active", done:"status-done" };
        
        let rawDesc = req.description || req.popis || "";
        let extracted = window.extractPhotoFromDesc(rawDesc);
        
        let mainDesc = extracted.desc;
        let reqPhoto = extracted.photo || req.photo; 
        let reqMime = extracted.mime || req.mime;
        
        let detailsHtml = "";
        
        // Zobrazení detailů ve štítcích
        if (mainDesc.includes("---")) {
            const parts = mainDesc.split("---");
            mainDesc = parts[0].trim();
            if (parts.length > 1) {
                let rawDetails = parts[1].replace("📋 DOPLŇUJÍCÍ INFORMACE:", "").trim();
                const detailItems = rawDetails.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                if (detailItems.length > 0) {
                    detailsHtml = `
                    <div class="mt-5 pt-5 border-t border-slate-100 dark:border-slate-700/50">
                        <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Doplňující informace</p>
                        <div class="flex flex-wrap gap-2">
                            ${detailItems.map(item => `<div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">${item}</div>`).join('')}
                        </div>
                    </div>`;
                }
            }
        }

        const photoHtml = reqPhoto ? `
            <div class="w-full md:w-48 h-32 md:h-full shrink-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm relative group cursor-pointer">
                <img src="data:${reqMime||'image/jpeg'};base64,${reqPhoto}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
            </div>` : '';

        if (!isMarket) {
            // KARTA PRO ZÁKAZNÍKA
            return `
            <div class="req-card relative bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 group fade-up overflow-hidden">
                <div class="absolute top-0 left-0 w-1.5 h-full ${req.status === 'done' ? 'bg-slate-300 dark:bg-slate-700' : 'bg-fixit-500'}"></div>
                
                <div class="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onclick="window.deleteRequest(${i}, ${req.sbId || 'null'})" class="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shadow-sm" title="Smazat poptávku"><i class="fa-solid fa-trash-can text-sm"></i></button>
                </div>
                
                <div class="pl-2">
                    <div class="flex items-center gap-3 mb-3 pr-10">
                        <span class="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide"><i class="fa-solid fa-tag mr-1.5 opacity-70"></i>${req.kat}</span>
                        <span class="text-[11px] text-slate-400 font-bold uppercase tracking-wide"><i class="fa-regular fa-clock mr-1.5 opacity-70"></i>${req.time}</span>
                    </div>

                    <div class="flex items-start justify-between gap-4 mb-4">
                        <h4 class="text-xl md:text-2xl font-extrabold dark:text-white leading-tight">${req.title}</h4>
                        <span class="status-badge ${badgeMap[req.status] || 'status-waiting'} shrink-0">${statusMap[req.status] || 'Neznámý stav'}</span>
                    </div>

                    <div class="flex flex-col md:flex-row gap-5 mb-2">
                        ${photoHtml}
                        <div class="flex-1 min-w-0">
                            <p class="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">${mainDesc}</p>
                        </div>
                    </div>

                    ${detailsHtml}

                    <div class="flex flex-wrap gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                        <button onclick="window.loadOffersForRequest(${req.sbId||0},'${(req.title||"").replace(/'/g,"\\'")}')" class="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform shadow-md">Zobrazit nabídky řemeslníků</button>
                        ${req.status !== 'done' ? `<button onclick="window.openRatingModal(${i}, ${req.sbId || 'null'})" class="px-6 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><i class="fa-solid fa-check mr-2"></i>Označit hotovo</button>` : ''}
                    </div>
                </div>
            </div>`;
        } else {
            // KARTA PRO TRŽIŠTĚ
            const iconMap = { "Instalatérství":"fa-faucet-drip","Elektrikář":"fa-bolt","Malíř":"fa-paint-roller","Tesař":"fa-door-open","Zámečník":"fa-lock","default":"fa-screwdriver-wrench" };
            const reqCat = req.category || "Ostatní";
            const reqUrg = req.urgency || "Střední";
            
            return `
            <div class="market-item bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:border-fixit-500/50 hover:shadow-xl transition-all duration-300 cursor-pointer fade-up overflow-hidden relative group" data-kat="${reqCat}" style="animation-delay:${i*60}ms">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-fixit-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="pl-2">
                    <div class="flex items-start gap-5">
                        <div class="w-14 h-14 bg-fixit-50 dark:bg-fixit-500/10 text-fixit-500 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner border border-fixit-100 dark:border-fixit-500/20"><i class="fa-solid ${iconMap[reqCat]||iconMap.default}"></i></div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-3 mb-2">
                                <h4 class="text-xl font-extrabold dark:text-white leading-tight">${req.title}</h4>
                                <span class="status-badge ${reqUrg==="Vysoká"?"bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400":"status-waiting"} shrink-0">${reqUrg}</span>
                            </div>
                            <div class="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">
                                <span class="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"><i class="fa-solid fa-tag mr-1.5 opacity-70"></i>${reqCat}</span>
                                <span class="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"><i class="fa-solid fa-user mr-1.5 opacity-70"></i>${req.customer_name||"Zákazník"}</span>
                                <span class="bg-fixit-50 dark:bg-fixit-500/10 text-fixit-600 dark:text-fixit-400 px-2 py-1 rounded"><i class="fa-solid fa-coins mr-1.5"></i>${req.price_estimate||"Dohodou"}</span>
                            </div>
                            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">${mainDesc}</p>
                            
                            ${detailsHtml}
                            
                            <div class="flex gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                                <button onclick="window.openOfferModal(${i})" class="flex-1 bg-fixit-500 hover:bg-fixit-600 text-white py-3.5 rounded-xl font-bold text-sm transition shadow-md hover:scale-[1.02]">Podat nabídku zákazníkovi</button>
                                <button class="w-12 h-12 border-2 border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-fixit-500 hover:border-fixit-500 hover:bg-fixit-50 dark:hover:bg-fixit-500/10 transition-colors"><i class="fa-regular fa-bookmark"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }
    } catch(err) {
        console.error("Chyba vykresleni karty:", err);
        return `<div class="p-4 bg-red-50 text-red-500 rounded-xl">Chyba vykreslení karty. Prosím, obnovte stránku.</div>`;
    }
}

// --- VEŘEJNÝ PROFIL ŘEMESLNÍKA ---
window.openPublicProfile = async function(craftsmanId, craftsmanName) {
    document.getElementById('pub-prof-name').innerText = craftsmanName;
    document.getElementById('pub-prof-avatar').src = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(craftsmanName) + "&backgroundColor=0f172a";
    
    document.getElementById('pub-prof-jobs').innerText = "...";
    document.getElementById('pub-prof-rating').innerText = "5.0"; 
    
    const modal = document.getElementById('public-profile-modal');
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    modal.classList.add('opacity-100');

    if (window.sb) {
        try {
            const { count, error } = await window.sb.from('offers').select('*', { count: 'exact', head: true }).eq('craftsman_id', craftsmanId).in('status', ['accepted', 'done', 'completed']);
            if (!error && count !== null) {
                document.getElementById('pub-prof-jobs').innerText = count;
            } else {
                document.getElementById('pub-prof-jobs').innerText = "0"; 
            }
        } catch(e) {
            console.error("Chyba public profilu:", e);
            document.getElementById('pub-prof-jobs').innerText = "0"; 
        }
    }
}

window.closePublicProfile = function() {
    const modal = document.getElementById('public-profile-modal');
    if (modal) {
        modal.classList.remove('opacity-100');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// --- HODNOCENÍ (RATING) ---
window.openRatingModal = function(index, sbId) {
    document.getElementById("rating-req-index").value = index;
    document.getElementById("rating-req-sbid").value = sbId;
    window.setRating(5); 
    document.getElementById("rating-comment").value = "";
    
    const modal = document.getElementById("rating-modal");
    modal.classList.remove("hidden");
    void modal.offsetWidth;
    modal.classList.add("opacity-100");
}

window.closeRatingModal = function() {
    const modal = document.getElementById("rating-modal");
    if (modal) {
        modal.classList.remove("opacity-100");
        setTimeout(() => modal.classList.add("hidden"), 300);
    }
}

window.setRating = function(val) {
    window.currentRatingValue = val;
    const container = document.getElementById("star-rating-container");
    const stars = container.querySelectorAll("i");
    stars.forEach((star, idx) => {
        if (idx < val) {
            star.classList.remove("text-slate-300", "dark:text-slate-600");
            star.classList.add("text-yellow-400");
        } else {
            star.classList.remove("text-yellow-400");
            star.classList.add("text-slate-300", "dark:text-slate-600");
        }
    });
}

window.submitRating = async function() {
    const index = document.getElementById("rating-req-index").value;
    const sbId = document.getElementById("rating-req-sbid").value;
    const comment = document.getElementById("rating-comment").value.trim();
    
    const btn = document.getElementById("btn-submit-rating");
    const origText = btn.innerHTML;
    
    btn.innerHTML = "<i class=\"fa-solid fa-circle-notch fa-spin mr-2\"></i>Ukládám...";
    btn.disabled = true;
    
    if (sbId !== "null" && window.sb) {
        try {
            await window.sb.from("requests").update({ status: "done" }).eq("id", sbId);
            
            // Zapsání recenze (bude fungovat, pokud existuje tabulka reviews)
            await window.sb.from("reviews").insert({ 
                request_id: sbId, 
                rating: window.currentRatingValue, 
                comment: comment 
            });
        } catch(e) { 
            console.error("Chyba při ukládání hodnocení do DB:", e); 
        }
    }
    
    if (window.STATE.requests[index]) {
        window.STATE.requests[index].status = "done";
    }
    
    window.refreshRequestsList();
    window.refreshDashboard();
    
    btn.innerHTML = origText;
    btn.disabled = false;
    window.closeRatingModal();
    window.showToast("Skvělé", "Vaše hodnocení bylo úspěšně odesláno. Děkujeme!");
}

// --- AUTH FUNKCE ---
window.goToAuth = function(role) {
    window.APP_ROLE = role;
    document.getElementById("role-icon").className = role === "customer" ? "fa-solid fa-house" : "fa-solid fa-toolbox";
    document.getElementById("role-text").innerText = role === "customer" ? "Zákazník" : "Řemeslník";
    document.getElementById("view-role-select").classList.add("hidden");
    document.getElementById("view-auth-form").classList.remove("hidden");
    window.switchTab("login"); 
    window.clearMsg();
}

window.backToRoles = function() {
    document.getElementById("view-auth-form").classList.add("hidden");
    document.getElementById("view-role-select").classList.remove("hidden");
    window.clearMsg();
}

window.switchTab = function(t) {
    window.clearMsg();
    const slider = document.getElementById("tab-slider");
    if (slider) {
        if (t === 'forgot') {
            slider.style.opacity = '0';
        } else {
            slider.style.opacity = '1';
            slider.style.transform = t === "register" ? "translateX(100%)" : "translateX(0)";
        }
    }
    
    document.getElementById("btn-login").classList.toggle("text-slate-500", t !== "login");
    document.getElementById("btn-login").classList.toggle("dark:text-white", t === "login");
    document.getElementById("btn-reg").classList.toggle("text-slate-500", t !== "register");
    
    document.getElementById("form-login").classList.toggle("hidden", t !== "login");
    document.getElementById("form-reg").classList.toggle("hidden", t !== "register");
    document.getElementById("form-forgot").classList.toggle("hidden", t !== "forgot");
}

window.showErr = function(m) { 
    const e = document.getElementById("auth-error"); 
    e.innerText = m; 
    e.classList.remove("hidden"); 
    document.getElementById("auth-ok").classList.add("hidden"); 
    window.showToast("Chyba", m, "error"); 
}

window.showOk = function(m) { 
    const e = document.getElementById("auth-ok"); 
    e.innerText = m; 
    e.classList.remove("hidden"); 
    document.getElementById("auth-error").classList.add("hidden"); 
    window.showToast("Úspěch", m, "success"); 
}

window.clearMsg = function() { 
    document.getElementById("auth-error").classList.add("hidden"); 
    document.getElementById("auth-ok").classList.add("hidden"); 
}

window.doRegister = async function() {
    if (!window.sb) return window.showErr("Chyba připojení k databázi.");
    
    const btn = document.getElementById("btn-do-reg");
    btn.innerHTML = "<i class=\"fa-solid fa-circle-notch fa-spin mr-2\"></i>Vytvářím..."; 
    btn.disabled = true;
    
    try {
        const { error } = await window.sb.auth.signUp({ 
            email: document.getElementById("reg-email").value, 
            password: document.getElementById("reg-pass").value, 
            options: { 
                data: { full_name: document.getElementById("reg-name").value, role: window.APP_ROLE } 
            } 
        });
        if (error) throw error;
        
        window.showOk("Účet vytvořen! Nyní se přihlaste.");
        setTimeout(() => window.switchTab("login"), 1800);
        
    } catch(e) { 
        window.showErr("Chyba: " + e.message); 
    } finally { 
        btn.innerHTML = "Vytvořit účet"; 
        btn.disabled = false; 
    }
}

window.doLogin = async function() {
    if (!window.sb) return window.showErr("Chyba připojení k databázi.");
    
    const btn = document.getElementById("btn-do-login");
    btn.innerHTML = "<i class=\"fa-solid fa-circle-notch fa-spin mr-2\"></i>Přihlašuji..."; 
    btn.disabled = true;
    
    try {
        const { data, error } = await window.sb.auth.signInWithPassword({ 
            email: document.getElementById("log-email").value, 
            password: document.getElementById("log-pass").value 
        });
        if (error) throw error;
        
        window.APP_USER = data.user;
        const role = window.APP_ROLE;
        const name = data.user.user_metadata?.full_name || "Uživatel";
        
        setTimeout(() => window.launchApp(role, name), 600);
        
    } catch(e) { 
        window.showErr("Špatný e-mail nebo heslo."); 
    } finally { 
        btn.innerHTML = "Přihlásit se"; 
        btn.disabled = false; 
    }
}

window.doResetPassword = async function() {
    if (!window.sb) return window.showErr("Chyba připojení k databázi.");
    
    const email = document.getElementById("forgot-email").value.trim();
    if (!email) return window.showErr("Zadejte prosím svůj e-mail.");
    
    const btn = document.getElementById("btn-do-forgot");
    btn.innerHTML = "<i class=\"fa-solid fa-circle-notch fa-spin mr-2\"></i>Odesílám..."; 
    btn.disabled = true;
    
    try {
        const { error } = await window.sb.auth.resetPasswordForEmail(email);
        if (error) throw error;
        
        window.showOk("Odkaz pro obnovu hesla byl odeslán na váš e-mail.");
        setTimeout(() => window.switchTab("login"), 4000);
        
    } catch(e) { 
        window.showErr("Chyba: " + e.message); 
    } finally { 
        btn.innerHTML = "Odeslat odkaz"; 
        btn.disabled = false; 
    }
}

window.doLogout = async function() { 
    if(window.sb) await window.sb.auth.signOut(); 
    window.location.reload(); 
}

window.launchApp = function(role, name) {
    const as = document.getElementById("auth-screen");
    if (as) {
        as.style.opacity = "0"; 
        as.style.transition = "opacity 0.4s";
        
        setTimeout(() => {
            as.classList.add("hidden");
            const app = document.getElementById("main-app");
            if (app) {
                app.classList.remove("hidden");
                app.style.opacity = "0";
                
                setTimeout(() => { 
                    app.style.transition = "opacity 0.4s"; 
                    app.style.opacity = "1"; 
                }, 50);
            }
            window.initApp(role, name);
        }, 400);
    }
}

window.initApp = function(role, name) {
    const userNameEl = document.getElementById("user-name");
    if(userNameEl) userNameEl.innerText = name;
    
    const userRoleEl = document.getElementById("user-role-lbl");
    if(userRoleEl) userRoleEl.innerText = role === "customer" ? "Zákazník" : "Řemeslník";
    
    const avatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(name) + "&backgroundColor=" + (role === "customer" ? "f59e0b" : "0f172a");
    const userAvatarEl = document.getElementById("user-avatar");
    if(userAvatarEl) userAvatarEl.src = avatarUrl;
    
    const tt = document.getElementById("theme-toggle");
    const ui = () => { 
        const d = document.documentElement.classList.contains("dark"); 
        const dIcon = document.getElementById("theme-toggle-dark-icon");
        const lIcon = document.getElementById("theme-toggle-light-icon");
        if(dIcon) dIcon.classList.toggle("hidden", d); 
        if(lIcon) lIcon.classList.toggle("hidden", !d); 
    };
    
    ui(); 
    
    if(tt) {
        tt.addEventListener("click", () => { 
            document.documentElement.classList.toggle("dark"); 
            localStorage.setItem("color-theme", document.documentElement.classList.contains("dark")?"dark":"light"); 
            ui(); 
        });
    }
    
    if (role === "customer") window.initCustomer(name); 
    else window.initCraftsman(name);
    
    // Načtení profilu
    setTimeout(() => {
        if(window.APP_USER) {
            const meta = window.APP_USER.user_metadata || {};
            const pName = document.getElementById("prof-name"); if(pName) pName.value = name;
            const pEmail = document.getElementById("prof-email"); if(pEmail) pEmail.value = window.APP_USER.email || "";
            const pPhone = document.getElementById("prof-phone"); if(pPhone) pPhone.value = meta.phone || "";
            const pCity = document.getElementById("prof-city"); if(pCity) pCity.value = meta.city || "";
            const pBio = document.getElementById("prof-bio"); if(pBio) pBio.value = meta.bio || "";
            
            const profAvatar = document.getElementById("prof-avatar-img");
            if(profAvatar) profAvatar.src = avatarUrl;
            
            const profBadge = document.getElementById("prof-role-badge");
            if(profBadge) profBadge.innerText = role === "customer" ? "Zákazník" : "Řemeslník";
        }
    }, 100);

    // Načtení dat
    setTimeout(async () => {
        if (role === "customer") { 
            await window.loadCustomerRequestsFromDB(); 
            await window.loadCustomerConversations(); 
        } else { 
            await window.loadCraftsmanJobsFromDB(); 
            await window.loadCraftsmanConversations(); 
            await window.loadMarketFromDB(); 
        }
    }, 500);
}

// --- AI FUNKCE ---
window.callGeminiAPI = async function(parts, systemPrompt, useJson) {
    const res = await fetch('/api/gemini', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ parts, systemPrompt, useJson }) 
    });
    
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'API chyba');
    return data.text;
}

window.handlePhoto = function(input) {
    const file = input.files[0]; 
    if (!file) return;
    
    window.poptMime = file.type;
    const reader = new FileReader();
    
    reader.onload = e => {
        const preview = document.getElementById("photo-preview");
        if(preview) {
            preview.src = e.target.result;
            preview.classList.remove("hidden");
        }
        
        window.poptBase64 = e.target.result.split(",")[1];
        
        const zone = document.getElementById("photo-zone");
        if(zone) {
            const i = zone.querySelector("i");
            const p = zone.querySelector("p");
            if(i) i.classList.add("hidden");
            if(p) p.classList.add("hidden");
        }
    };
    reader.readAsDataURL(file);
}

window.appendChat = function(role, text) {
    const box = document.getElementById("popt-chat-msgs");
    if (!box) return;
    
    const d = document.createElement("div");
    if (role === "user") { 
        d.className = "poptavka-bubble-user text-sm font-medium"; 
        d.innerText = text; 
    } else { 
        d.className = "poptavka-bubble-ai text-sm flex items-start gap-3"; 
        d.innerHTML = "<div class=\"w-8 h-8 bg-fixit-500 rounded-full flex items-center justify-center text-white shrink-0\"><i class=\"fa-solid fa-hard-hat text-xs\"></i></div><div>" + text + "</div>"; 
    }
    
    box.appendChild(d); 
    box.scrollTop = box.scrollHeight;
}

window.processPopt = async function(text) {
    const loading = document.getElementById("popt-loading");
    const replyArea = document.getElementById("popt-reply-area");
    
    if(loading) loading.classList.remove("hidden");
    if(replyArea) replyArea.classList.add("hidden");
    
    const sp = "Jsi Bořek, profesionální technik. Vytvoř zadání pro řemeslníka.\nODPOVÍDEJ PŘESNĚ V TOMTO JSON FORMÁTU BEZ DALŠÍHO TEXTU:\n{\"status\":\"question\",\"message\":\"otázka\"} nebo {\"status\":\"done\",\"nazev\":\"titulek\",\"kategorie\":\"obor\",\"popis\":\"popis\",\"nalehavost\":\"Vysoká/Střední/Nízká\",\"odhad_ceny\":\"cena Kč\",\"rada\":\"rada\"}";
    let parts = [{text}];
    
    if (window.poptBase64 && window.poptMime) {
        parts.push({inlineData:{mimeType:window.poptMime,data:window.poptBase64}});
    }
    
    try {
        const raw = await window.callGeminiAPI(parts, sp, true);
        let clean = raw.replace(/```json/gi,"").replace(/```/g,"").trim();
        const s = clean.indexOf("{");
        const e = clean.lastIndexOf("}");
        
        if (s !== -1 && e !== -1) {
            clean = clean.substring(s, e+1);
        }
        
        const d = JSON.parse(clean);
        
        if(loading) loading.classList.add("hidden");
        
        if (d.status === "question") { 
            window.appendChat("ai", d.message.replace(/[*]/g,"")); 
            if(replyArea) replyArea.classList.remove("hidden");
            const replyInp = document.getElementById("popt-reply");
            if(replyInp) replyInp.focus();
        } else if (d.status === "done") {
            const setText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.replace(/[*]/g,""); }
            
            setText("r-nazev", d.nazev);
            setText("r-kat", d.kategorie);
            setText("r-nal", d.nalehavost);
            setText("r-cena", d.odhad_ceny);
            setText("r-popis", d.popis);
            
            if (d.rada && d.rada.trim()) { 
                setText("popt-tip-text", d.rada);
                const tipEl = document.getElementById("popt-tip");
                if(tipEl) tipEl.classList.remove("hidden");
            }
            
            const resultEl = document.getElementById("popt-result");
            if(resultEl) resultEl.classList.remove("hidden");
        }
    } catch(err) { 
        if(loading) loading.classList.add("hidden");
        if(replyArea) replyArea.classList.remove("hidden");
        window.showToast("Chyba AI", "Nepodařilo se spojit s asistentem.", "error"); 
    }
}

window.startAI = function() {
    const inp = document.getElementById("popt-input");
    const txt = inp ? inp.value.trim() : "";
    
    if (!txt && !window.poptBase64) { 
        alert("Popište závadu nebo nahrajte fotku."); 
        return; 
    }
    
    const formEl = document.getElementById("popt-form");
    if(formEl) formEl.classList.add("hidden");
    
    const chatEl = document.getElementById("popt-chat");
    if(chatEl) chatEl.classList.remove("hidden");
    
    window.poptHistoryText = txt || "Posílám fotografii k analýze.";
    window.appendChat("user", window.poptHistoryText);
    window.processPopt(window.poptHistoryText);
}

window.replyAI = function() {
    const inp = document.getElementById("popt-reply");
    if(!inp) return;
    
    const txt = inp.value.trim();
    if (!txt) return;
    
    window.appendChat("user", txt);
    window.poptHistoryText += "\nUpřesnění od uživatele: " + txt;
    inp.value = "";
    window.processPopt(window.poptHistoryText);
}

window.showFinalizeForm = function() {
    const btn = document.getElementById('btn-show-finalize');
    if(btn) btn.classList.add('hidden');
    
    const fin = document.getElementById('popt-finalize');
    if(fin) {
        fin.classList.remove('hidden');
        fin.scrollIntoView({ behavior: 'smooth' });
    }
}

window.publishRequest = async function(btnNode) {
    let originalText = "Zveřejnit poptávku na Fixit";
    
    try {
        if (btnNode && btnNode.tagName) {
            originalText = btnNode.innerHTML;
            btnNode.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Zpracovávám...';
            btnNode.disabled = true;
        }
        
        const getText = (id, def) => { const el = document.getElementById(id); return el ? el.innerText.trim() : def; };
        const getValue = (id, def) => { const el = document.getElementById(id); return el ? el.value.trim() : def; };

        const title = getText("r-nazev", "Nová poptávka");
        const kat = getText("r-kat", "Ostatní");
        const popis = getText("r-popis", "");
        const nal = getText("r-nal", "Střední");
        const cena = getText("r-cena", "Dohodou");

        const street = getValue("f-street", "");
        const city = getValue("f-city", "");
        const phone = getValue("f-phone", "");
        const timeframe = getValue("f-timeframe", "Během několika dnů");
        const property = getValue("f-property", "Byt");
        const parking = getValue("f-parking", "Bezproblémové (vlastní / volná ulice)");

        if (!street || !city || !phone) {
            window.showToast("Chybí údaje", "Prosím, vyplňte ulici, město a telefon.", "error");
            if (btnNode && btnNode.tagName) { btnNode.innerHTML = originalText; btnNode.disabled = false; }
            return;
        }

        const detailInfo = [
            `📍 Adresa: ${street}, ${city}`,
            `📞 Telefon: ${phone}`,
            `📅 Termín: ${timeframe}`,
            `🏠 Typ objektu: ${property}`,
            `🚗 Parkování: ${parking}`
        ].join('\n');

        let finalPopis = `${popis}\n\n---\n📋 DOPLŇUJÍCÍ INFORMACE:\n${detailInfo}`;
        
        if (window.poptBase64 && window.poptMime) {
            finalPopis += `\n||PHOTO||${window.poptBase64}||MIME||${window.poptMime}`;
        }

        let sbId = null;

        if (window.sb && window.APP_USER) {
            const userNameEl = document.getElementById("user-name");
            const cName = userNameEl ? userNameEl.textContent : "Zákazník";
            
            const { data, error } = await window.sb.from("requests").insert({
                 customer_id: window.APP_USER.id,
                 customer_name: cName,
                 title: title, category: kat, description: finalPopis, urgency: nal, price_estimate: cena, status: "waiting"
            }).select();
            
            if (error) {
                console.error("Supabase chyba:", error);
            } else if (data && data.length > 0) {
                sbId = data[0].id;
            }
        }
        
        const now = new Date().toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"});
        window.STATE.requests.unshift({ sbId: sbId, title: title, kat: kat, popis: finalPopis, time: now, status: "waiting", photo: window.poptBase64, mime: window.poptMime });
        
        window.refreshRequestsList(); 
        window.refreshDashboard();
        
        window.poptHistoryText = ""; window.poptBase64 = null; window.poptMime = null;
        
        ["popt-input", "f-street", "f-city", "f-phone"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        
        const msgsEl = document.getElementById("popt-chat-msgs");
        if (msgsEl) msgsEl.innerHTML = "";
        
        const previewEl = document.getElementById("photo-preview");
        if (previewEl) previewEl.classList.add("hidden");
        
        const pZone = document.getElementById("photo-zone");
        if (pZone) {
            const iEl = pZone.querySelector("i");
            const pEl = pZone.querySelector("p");
            if (iEl) iEl.classList.remove("hidden");
            if (pEl) pEl.classList.remove("hidden");
        }
        
        ["popt-result","popt-tip","popt-chat","popt-finalize"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add("hidden");
        });
        
        const btnShow = document.getElementById("btn-show-finalize");
        if (btnShow) btnShow.classList.remove("hidden");
        
        const pForm = document.getElementById("popt-form");
        if (pForm) pForm.classList.remove("hidden");
        
        if (btnNode && btnNode.tagName) { btnNode.innerHTML = originalText; btnNode.disabled = false; }
        
        window.showToast("Výborně!", "Vaše poptávka byla úspěšně zveřejněna.", "success");
        window.goTab("requests", "Moje poptávky");
        
    } catch(err) {
        console.error("Kritická chyba při odesílání:", err);
        window.showToast("Chyba", "Nepodařilo se zveřejnit poptávku.", "error");
        if (btnNode && btnNode.tagName) { btnNode.innerHTML = originalText; btnNode.disabled = false; }
    }
}

window.deleteRequest = async function(index, sbId) {
    if(!confirm("Opravdu chcete tuto poptávku smazat?")) return;
    if (sbId && window.sb) {
        try {
            await window.sb.from("requests").delete().eq("id", sbId);
            await window.sb.from("offers").delete().eq("request_id", sbId);
            await window.sb.from("messages").delete().eq("conversation_id", String(sbId));
        } catch(e) { 
            console.error("Chyba při mazání z DB:", e); 
        }
    }
    window.STATE.requests.splice(index, 1);
    window.refreshRequestsList();
    window.refreshDashboard();
    window.showToast("Smazáno", "Poptávka byla odstraněna.");
}

window.saveProfile = async function(btnNode) {
    if (!window.sb || !window.APP_USER) return;
    const origText = btnNode.innerHTML;
    btnNode.innerHTML = "<i class=\"fa-solid fa-circle-notch fa-spin mr-2\"></i>Ukládám...";
    btnNode.disabled = true;
    
    const name = document.getElementById("prof-name").value.trim();
    const phone = document.getElementById("prof-phone").value.trim();
    const city = document.getElementById("prof-city").value.trim();
    
    const bioEl = document.getElementById("prof-bio");
    const bio = bioEl ? bioEl.value.trim() : "";
    
    try {
        const { data, error } = await window.sb.auth.updateUser({
            data: { full_name: name, phone: phone, city: city, bio: bio }
        });
        if (error) throw error;
        
        window.APP_USER = data.user;
        const userNameEl = document.getElementById("user-name");
        if (userNameEl) userNameEl.innerText = name;
        
        const avatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(name) + "&backgroundColor=" + (window.APP_ROLE === "customer" ? "f59e0b" : "0f172a");
        const userAvatar = document.getElementById("user-avatar");
        const profAvatar = document.getElementById("prof-avatar-img");
        
        if (userAvatar) userAvatar.src = avatarUrl;
        if (profAvatar) profAvatar.src = avatarUrl;
        
        window.showToast("Uloženo", "Váš profil byl úspěšně aktualizován.");
    } catch(e) {
        window.showToast("Chyba", e.message, "error");
    } finally {
        btnNode.innerHTML = origText;
        btnNode.disabled = false;
    }
}

// --- MODALY ---
window.openOfferModal = function(index) {
    const req = window.STATE.marketRequests[index];
    if (!req) return;
    
    document.getElementById('co-req-id').value = req.id;
    document.getElementById('co-req-title').value = req.title;
    
    document.getElementById('co-title').innerText = req.title;
    document.getElementById('co-cat').innerText = req.category || 'Ostatní';
    document.getElementById('co-urg').innerText = req.urgency || 'Střední';
    
    let extracted = window.extractPhotoFromDesc(req.description);
    document.getElementById('co-desc').innerHTML = extracted.desc.replace(/\n/g, '<br>');
    
    document.getElementById('co-price').value = req.price_estimate || 'Dohodou';
    document.getElementById('co-msg').value = `Dobrý den, mám zájem o vaši zakázku "${req.title}". Mám čas a vybavení, mohu pomoci.`;
    
    const photoWrap = document.getElementById('co-photo-wrap');
    const photoImg = document.getElementById('co-photo');
    
    if (extracted.photo) {
         photoImg.src = `data:${extracted.mime||'image/jpeg'};base64,${extracted.photo}`;
         photoWrap.classList.remove('hidden');
    } else {
         photoWrap.classList.add('hidden');
    }
    
    const modal = document.getElementById('craftsman-offer-modal');
    if(modal) {
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.add('opacity-100');
    }
}

window.closeOfferModal = function() {
    const modal = document.getElementById('craftsman-offer-modal');
    if (modal) {
        modal.classList.remove('opacity-100');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

window.submitCraftsmanOffer = async function() {
    const btn = document.getElementById("co-submit-btn");
    const originalText = btn.innerHTML;
    
    const requestId = document.getElementById("co-req-id").value;
    const title = document.getElementById("co-req-title").value;
    const price = document.getElementById("co-price").value.trim();
    const msg = document.getElementById("co-msg").value.trim();
    
    if (!msg) {
        window.showToast("Chybí zpráva", "Napište zákazníkovi alespoň krátkou zprávu.", "error");
        return;
    }
    
    if (!window.sb || !window.APP_USER) return;
    
    btn.innerHTML = "<i class=\"fa-solid fa-circle-notch fa-spin mr-2\"></i>Odesílám..."; 
    btn.disabled = true;
    
    try {
        const { error } = await window.sb.from("offers").insert({ 
            request_id: requestId, 
            craftsman_id: window.APP_USER.id, 
            craftsman_name: document.getElementById("user-name").innerText, 
            message: msg, 
            price: price || "Dohodou", 
            status: "pending" 
        });
        if (error) throw error;
        
        btn.innerHTML = "<i class=\"fa-solid fa-check mr-2\"></i>Odesláno!";
        btn.className = btn.className.replace("bg-fixit-500 hover:bg-fixit-600","bg-green-500"); 
        
        window.STATE.craftJobs.push({ 
            title: title, 
            requestId: requestId, 
            status: "pending", 
            time: new Date().toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"}) 
        });
        
        window.refreshCraftsmanJobs(); 
        window.activeChatId = String(requestId);
        
        window.showToast("Výborně!", "Vaše nabídka byla odeslána zákazníkovi.", "success");
        
        setTimeout(() => {
            window.closeOfferModal();
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.className = btn.className.replace("bg-green-500","bg-fixit-500 hover:bg-fixit-600");
            window.goTab('c-messages', 'Zprávy');
            window.openConversation(requestId, 'Zákazník', 'customer'+requestId);
        }, 1000);
        
    } catch(e) { 
        btn.innerHTML = originalText; 
        btn.disabled = false; 
        window.showToast("Chyba", e.message, "error"); 
    }
}

window.loadOffersForRequest = async function(requestId, requestTitle) {
    if (!window.sb) return;
    const { data: offers } = await window.sb.from("offers").select("*").eq("request_id", requestId).order("created_at", { ascending: false });
    
    const titleEl = document.getElementById("offers-modal-title");
    if(titleEl) titleEl.innerText = requestTitle;
    
    const modalList = document.getElementById("offers-modal-list");
    if(!modalList) return;
    
    if (!offers || offers.length === 0) { 
        modalList.innerHTML = "<div class=\"text-center text-slate-400 py-12\"><i class=\"fa-solid fa-inbox text-4xl mb-4 block\"></i><p>Zatím žádné nabídky.</p></div>"; 
    } else { 
        modalList.innerHTML = offers.map(o => `
        <div class="p-5 border border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50">
            <div class="flex items-center gap-4 mb-4 cursor-pointer group" onclick="window.openPublicProfile('${o.craftsman_id}', '${(o.craftsman_name||"").replace(/'/g,"\\'")}')">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(o.craftsman_name)}&backgroundColor=0f172a" class="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform">
                <div>
                    <p class="font-extrabold dark:text-white group-hover:text-fixit-500 transition-colors">${o.craftsman_name} <i class="fa-solid fa-circle-check text-green-500 ml-1 text-xs" title="Ověřeno"></i></p>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">${new Date(o.created_at).toLocaleDateString("cs")} • Ukázat profil</p>
                </div>
                <span class="ml-auto font-black text-lg text-fixit-500">${o.price}</span>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300 mb-5 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-slate-700">${o.message}</p>
            <button onclick="window.acceptOffer(${o.id},${requestId},'${(o.craftsman_name||"").replace(/'/g,"\\'")}'); window.closeOffersModal();" class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-xl font-bold text-sm transition shadow-md hover:scale-[1.02]">Přijmout a zahájit zprávy</button>
        </div>`).join(""); 
    }
    
    const modal = document.getElementById("offers-modal"); 
    if(modal) {
        modal.classList.remove("hidden"); 
        void modal.offsetWidth; 
        modal.classList.add("opacity-100");
    }
}

window.acceptOffer = async function(offerId, requestId, craftsmanName) {
    if (!window.sb) return;
    
    await window.sb.from("offers").update({ status: "accepted" }).eq("id", offerId);
    await window.sb.from("requests").update({ status: "active" }).eq("id", requestId);
    
    const req = window.STATE.requests.find(r => r.sbId === requestId); 
    if(req) req.status = "active";
    
    window.refreshRequestsList(); 
    window.refreshDashboard(); 
    
    window.showToast("Skvělé!", `Nabídka od řemeslníka ${craftsmanName} byla přijata.`);
    
    window.activeChatId = String(requestId); 
    window.goTab("messages", "Zprávy"); 
    
    setTimeout(() => window.openConversation(requestId, craftsmanName, "craftsman" + requestId), 300);
}

window.closeOffersModal = function() { 
    const modal = document.getElementById("offers-modal"); 
    if (modal) { 
        modal.classList.remove("opacity-100");
        setTimeout(() => modal.classList.add("hidden"), 300);
    } 
}

window.openPublicProfile = async function(craftsmanId, craftsmanName) {
    document.getElementById('pub-prof-name').innerText = craftsmanName;
    document.getElementById('pub-prof-avatar').src = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(craftsmanName) + "&backgroundColor=0f172a";
    
    document.getElementById('pub-prof-jobs').innerText = "..."; 
    document.getElementById('pub-prof-rating').innerText = "5.0"; 
    
    const modal = document.getElementById('public-profile-modal'); 
    if(modal) {
        modal.classList.remove('hidden'); 
        void modal.offsetWidth; 
        modal.classList.add('opacity-100');
    }

    if (window.sb) {
        try {
            const { count, error } = await window.sb.from('offers').select('*', { count: 'exact', head: true }).eq('craftsman_id', craftsmanId).in('status', ['accepted', 'done', 'completed']);
            if (!error && count !== null) { 
                document.getElementById('pub-prof-jobs').innerText = count; 
            } else { 
                document.getElementById('pub-prof-jobs').innerText = "0"; 
            }
        } catch(e) {
            document.getElementById('pub-prof-jobs').innerText = "0"; 
        }
    }
}

window.closePublicProfile = function() { 
    const modal = document.getElementById('public-profile-modal'); 
    if (modal) { 
        modal.classList.remove('opacity-100'); 
        setTimeout(() => modal.classList.add('hidden'), 300); 
    } 
}

// --- ZPRÁVY A CHAT ---
window.openConversation = async function(requestId, partnerName, partnerSeed) {
    window.activeChatId = String(requestId);
    
    const nameEl = document.getElementById("chat-partner-name") || document.getElementById("chat-partner-name-c"); 
    if (nameEl) nameEl.innerText = partnerName;
    
    const avatarEl = document.getElementById("chat-partner-avatar"); 
    if (avatarEl) avatarEl.style.backgroundImage = "url(https://api.dicebear.com/7.x/avataaars/svg?seed=" + partnerSeed + ")";
    
    document.querySelectorAll(".conv-item").forEach(el => el.classList.remove("bg-white","dark:bg-slate-800/50","border-fixit-500"));
    const ac = document.getElementById("conv-" + requestId); 
    if(ac) ac.classList.add("bg-white","dark:bg-slate-800/50","border-fixit-500");
    
    await window.loadMessages(requestId); 
    window.subscribeMessages(requestId);
}

window.loadMessages = async function(requestId) {
    const boxId = window.APP_ROLE === "customer" ? "chat-msgs" : "chat-msgs-c";
    const box = document.getElementById(boxId); 
    if (!box) return;
    
    box.innerHTML = "<div class=\"text-center text-slate-400 text-sm py-8\"><i class=\"fa-solid fa-circle-notch fa-spin text-2xl text-fixit-500 mb-3 block\"></i>Načítám zprávy...</div>";
    
    if (!window.sb) { 
        box.innerHTML = "<div class=\"text-center text-slate-400 text-sm py-8\">Nepřipojeno k databázi.</div>"; 
        return; 
    }
    
    try {
        const { data, error } = await window.sb.from("messages").select("*").eq("conversation_id", String(requestId)).order("created_at", { ascending: true });
        
        if (error) throw error;
        
        box.innerHTML = "";
        
        if (data.length === 0) { 
            box.innerHTML = "<div class=\"text-center text-slate-400 text-sm py-10\"><i class=\"fa-regular fa-comments text-4xl mb-3 block opacity-50\"></i>Zatím žádné zprávy. Napište první!</div>"; 
            return; 
        }
        
        data.forEach(m => window.renderMessage(m, boxId)); 
        box.scrollTop = box.scrollHeight;
    } catch(e) {
        box.innerHTML = "<div class=\"text-center text-red-400 text-sm py-8\">Chyba načítání.</div>";
    }
}

window.renderMessage = function(m, boxId) {
    const box = document.getElementById(boxId); 
    if (!box) return;
    
    const isMe = m.sender_id === window.APP_USER?.id; 
    const time = new Date(m.created_at).toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"});
    
    const tc = box.querySelector(".text-center");
    if(tc) tc.remove(); 
    
    const d = document.createElement("div"); 
    d.className = "flex " + (isMe ? "justify-end" : "justify-start");
    d.innerHTML = "<div class=\"max-w-[75%]\">" + (!isMe ? "<p class=\"text-[10px] font-bold text-slate-400 mb-1.5 ml-2 uppercase tracking-wide\">" + (m.sender_name||"Uživatel") + "</p>" : "") + "<div class=\"px-5 py-3 rounded-2xl text-sm shadow-sm " + (isMe ? "bg-fixit-500 text-white rounded-br-sm" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 rounded-bl-sm") + "\"><p class=\"leading-relaxed\">" + m.text + "</p><p class=\"text-[10px] opacity-50 mt-1.5 font-medium " + (isMe?"text-right":"") + "\">" + time + "</p></div></div>";
    
    box.appendChild(d); 
    box.scrollTop = box.scrollHeight;
}

window.subscribeMessages = function(requestId) {
    if (window.msgSubscription) { 
        try { window.sb.removeChannel(window.msgSubscription); } catch(e) {} 
    }
    
    if (!window.sb) return; 
    
    const boxId = window.APP_ROLE === "customer" ? "chat-msgs" : "chat-msgs-c";
    
    window.msgSubscription = window.sb.channel("msgs-" + requestId).on("postgres_changes", { event:"INSERT", schema:"public", table:"messages", filter:"conversation_id=eq." + requestId }, payload => { 
        if (payload.new.sender_id !== window.APP_USER?.id) { 
            window.renderMessage(payload.new, boxId); 
            window.showToast("Nová zpráva", "Máte novou zprávu v chatu", "info"); 
        }
    }).subscribe();
}

window.sendMsg = async function() {
    const inp = document.getElementById("msg-input"); 
    const txt = inp ? inp.value.trim() : ""; 
    
    if (!txt) return;
    if (!window.activeChatId) { alert("Vyberte konverzaci."); return; }
    
    inp.value = ""; 
    const msgData = { conversation_id: window.activeChatId, sender_id: window.APP_USER?.id, sender_name: document.getElementById("user-name").innerText, text: txt };
    
    window.renderMessage({ ...msgData, created_at: new Date().toISOString() }, "chat-msgs");
    
    if (window.sb) await window.sb.from("messages").insert(msgData);
}

window.sendMsgC = async function() {
    const inp = document.getElementById("msg-input-c"); 
    const txt = inp ? inp.value.trim() : ""; 
    
    if (!txt) return;
    if (!window.activeChatId) { alert("Vyberte konverzaci."); return; }
    
    inp.value = ""; 
    const msgData = { conversation_id: window.activeChatId, sender_id: window.APP_USER?.id, sender_name: document.getElementById("user-name").innerText, text: txt };
    
    window.renderMessage({ ...msgData, created_at: new Date().toISOString() }, "chat-msgs-c");
    
    if (window.sb) await window.sb.from("messages").insert(msgData);
}

// --- DATA LOADING & LISTS ---
window.refreshCraftsmanJobs = function() {
    const completedJobs = window.STATE.craftJobs.filter(j => j.status === 'done' || j.status === 'completed').length;
    const allActive = window.STATE.craftJobs.length - completedJobs;
    
    const cnt = document.getElementById("jobs-active-count"); 
    if(cnt) cnt.innerText = allActive;
    
    const doneCnt = document.getElementById("jobs-done-count"); 
    if(doneCnt) doneCnt.innerText = completedJobs;
    
    const list = document.getElementById("my-jobs-list"); 
    if(!list) return;
    
    const tc = list.querySelector(".text-center");
    if(tc) tc.remove(); 
    
    list.innerHTML = "";
    
    window.STATE.craftJobs.forEach(job => {
        const d = document.createElement("div"); 
        d.className = "bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm fade-up";
        
        let statusBadge = `<span class="status-badge status-waiting">Čekám na odpověď</span>`;
        if (job.status === 'accepted' || job.status === 'active') statusBadge = `<span class="status-badge status-active">Aktivní zakázka</span>`;
        if (job.status === 'done' || job.status === 'completed') statusBadge = `<span class="status-badge status-done">Dokončeno</span>`;
        
        d.innerHTML = `<div class="flex items-start justify-between mb-4"><div><h4 class="font-extrabold text-lg dark:text-white leading-tight">${job.title}</h4><p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">${job.time}</p></div>${statusBadge}</div><button onclick="window.activeChatId='${job.requestId}'; window.goTab('c-messages','Zprávy'); setTimeout(()=>window.openConversation('${job.requestId}','Zákazník','customer${job.requestId}'),300);" class="text-sm font-bold text-fixit-500 hover:text-fixit-600 transition flex items-center gap-2"><i class="fa-regular fa-comment-dots"></i> Napsat zákazníkovi</button>`;
        list.appendChild(d);
    });
}

window.loadCraftsmanJobsFromDB = async function() {
    if (!window.sb || !window.APP_USER) return;
    try {
        const { data } = await window.sb.from("offers").select("*, requests(title, category, status)").eq("craftsman_id", window.APP_USER.id);
        if (data && data.length > 0) { 
            window.STATE.craftJobs = data.map(o => {
                let finalStatus = o.status; 
                if (o.requests?.status === 'done') finalStatus = 'done';
                return { title: o.requests?.title||"Zakázka", requestId: o.request_id, status: finalStatus, time: new Date(o.created_at).toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"}) };
            }); 
            window.refreshCraftsmanJobs(); 
        }
    } catch(e) {}
}

window.loadCustomerRequestsFromDB = async function() {
    if (!window.sb || !window.APP_USER) return;
    try {
        const { data } = await window.sb.from("requests").select("*").eq("customer_id", window.APP_USER.id).order("created_at", { ascending: false });
        if (data && data.length > 0) { 
            window.STATE.requests = data.map(r => ({ sbId: r.id, title: r.title, kat: r.category, popis: r.description, time: new Date(r.created_at).toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"}), status: r.status })); 
            window.refreshRequestsList(); 
            window.refreshDashboard(); 
        }
    } catch(e) {}
}

window.loadMarketFromDB = async function() {
    const list = document.getElementById("market-list"); 
    if (!list || !window.sb) return;
    
    try {
        const { data, error } = await window.sb.from("requests").select("*").eq("status","waiting").order("created_at", { ascending: false });
        
        if (error || !data || data.length === 0) { 
            list.innerHTML = "<div class=\"text-center p-16 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl\"><i class=\"fa-solid fa-inbox text-5xl text-slate-300 dark:text-slate-600 mb-5 block\"></i><p class=\"font-bold text-slate-500 text-lg\">Zatím žádné poptávky ve vašem okolí.</p></div>"; 
            return; 
        }
        
        window.STATE.marketRequests = data;
        
        list.innerHTML = data.map((r,i) => {
            return window.createBeautifulCard({ 
                id: r.id, sbId: r.id, title: r.title, kat: r.category || 'Ostatní', 
                popis: r.description || '', time: new Date(r.created_at).toLocaleDateString("cs"), 
                status: r.status, urgency: r.urgency || 'Střední', category: r.category, 
                customer_name: r.customer_name || 'Zákazník', price_estimate: r.price_estimate || 'Dohodou' 
            }, true, i);
        }).join("");
    } catch(e) {}
}

window.filterMarket = function(kat) {
    document.querySelectorAll(".filter-btn").forEach(b => { 
        b.className = b.className.replace("bg-fixit-500 text-white shadow-md hover:scale-105","bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-fixit-500 transition hover:scale-105"); 
    });
    
    if(event && event.target) {
        event.target.className = event.target.className.replace("bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-fixit-500 transition hover:scale-105","bg-fixit-500 text-white shadow-md hover:scale-105 transition");
    }
    
    document.querySelectorAll(".market-item").forEach(item => { 
        item.style.display = (kat === "all" || item.dataset.kat === kat) ? "" : "none"; 
    });
}

window.loadCustomerConversations = async function() {
    const list = document.getElementById("conv-list"); 
    if (!list || !window.sb || !window.APP_USER) return;
    
    try {
        const { data: reqs } = await window.sb.from("requests").select("*").eq("customer_id", window.APP_USER.id).order("created_at", { ascending: false });
        if (!reqs || reqs.length === 0) { 
            list.innerHTML = "<div class=\"p-8 text-center text-sm text-slate-400\"><i class=\"fa-regular fa-comments text-4xl mb-3 block opacity-50\"></i>Žádné zprávy.<br>Vytvořte poptávku!</div>"; 
            return; 
        }
        
        list.innerHTML = reqs.map(r => `<div id="conv-${r.id}" onclick="window.openConversation(${r.id},'Řemeslník','craftsman${r.id}')" class="conv-item p-5 cursor-pointer hover:bg-white dark:hover:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800 border-l-2 border-l-transparent transition"><p class="font-extrabold text-sm dark:text-white truncate">${r.title}</p><p class="text-xs text-slate-400 mt-1">${r.category} • <span class="text-fixit-500 font-bold">${r.status==="waiting"?"Hledáme":r.status==="active"?"Probíhá":"Hotovo"}</span></p></div>`).join("");
    } catch(e) {}
}

window.loadCraftsmanConversations = async function() {
    const list = document.getElementById("conv-list-c"); 
    if (!list || !window.sb || !window.APP_USER) return;
    
    try {
        const { data: offers } = await window.sb.from("offers").select("*, requests(*)").eq("craftsman_id", window.APP_USER.id).order("created_at", { ascending: false });
        if (!offers || offers.length === 0) { 
            list.innerHTML = "<div class=\"p-8 text-center text-sm text-slate-400\"><i class=\"fa-regular fa-comments text-4xl mb-3 block opacity-50\"></i>Žádné zprávy.<br>Podejte nabídku!</div>"; 
            return; 
        }
        
        list.innerHTML = offers.map(o => `<div id="conv-${o.request_id}" onclick="window.openConversation(${o.request_id},'${(o.requests?.customer_name||"Zákazník").replace(/'/g,"\\'")}','customer${o.request_id}')" class="conv-item p-5 cursor-pointer hover:bg-white dark:hover:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800 border-l-2 border-l-transparent transition"><p class="font-extrabold text-sm dark:text-white truncate">${o.requests?.title||"Poptávka"}</p><p class="text-xs text-slate-400 mt-1">${o.requests?.category||""} • ${o.requests?.customer_name||"Zákazník"}</p></div>`).join("");
    } catch(e) {}
}
