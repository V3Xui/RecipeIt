import { auth, db } from '../config.js';
import { createPostCard } from '../components/postCard.js';
import { fetchUserMealPlan } from '../services/plannerService.js';

const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

export const loadAccountSettings = () => {
    const user = auth.currentUser;
    if (!user) return window.router("/");
    
    setTimeout(() => {
        const nameInput = document.getElementById("edit-name");
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const bio = document.getElementById("edit-bio");
                if (bio) bio.value = data.bio || "";
                if (data.displayName && nameInput) nameInput.value = data.displayName;
                const img = document.getElementById("edit-avatar-preview");
                if (img) img.src = data.photoURL || DEFAULT_AVATAR;
            }
        });
    }, 100);
};

export const loadPublicProfile = (targetUserId) => {
    const currentUser = auth.currentUser;
    const nameEl = document.getElementById("profile-name");
    const bioEl = document.getElementById("profile-bio");
    const avatarEl = document.getElementById("profile-avatar");
    const actionArea = document.getElementById("follow-action-area");
    const feed = document.getElementById("user-posts-feed");
    const postCountEl = document.getElementById("profile-post-count");

    db.collection("users").doc(targetUserId).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data(); 
            nameEl.innerText = data.displayName || data.email || "Unknown Chef";
            bioEl.innerText = data.bio || "No bio yet.";
            if (avatarEl) avatarEl.src = data.photoURL || DEFAULT_AVATAR;
            
            if (currentUser && currentUser.uid !== targetUserId) {
                db.collection("users").doc(currentUser.uid).onSnapshot((myDoc) => {
                    const myData = myDoc.data() || { following: [] };
                    const amFollowing = myData.following && myData.following.includes(targetUserId);
                    const safeName = (data.displayName || 'Chef').replace(/'/g, "\\'");
                    const msgBtn = `<button onclick="window.startChat('${targetUserId}', '${safeName}')" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color); margin-left: 10px;">Message</button>`;

                    actionArea.innerHTML = amFollowing 
                        ? `<button onclick="window.toggleFollow('${targetUserId}', false)" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color);">Unfollow</button> ${msgBtn}`
                        : `<button onclick="window.toggleFollow('${targetUserId}', true)" style="background: var(--accent-color); color: white;">Follow Chef</button> ${msgBtn}`;
                });
            } else if (currentUser && currentUser.uid === targetUserId) {
                actionArea.innerHTML = `<button onclick="window.router('/account')" style="font-size:0.9rem;">Edit Profile</button>`;
            }
        }
    });

    db.collection("posts").where("authorId", "==", targetUserId).orderBy("createdAt", "desc").onSnapshot((snap) => {
        feed.innerHTML = "";
        if (postCountEl) postCountEl.innerText = snap.size; 
        if (snap.empty) { feed.innerHTML = "<p>No recipes posted yet.</p>"; return; }
        snap.forEach((doc) => {
            const globalState = { myBookmarks: window.myBookmarks, currentUserData: window.currentUserData };
            feed.innerHTML += createPostCard(doc.data(), doc.id, currentUser, globalState);
        });
    });
};

export const loadSavedPosts = () => {
    const user = auth.currentUser;
    if (!user) return window.router("/");
    const feed = document.getElementById("saved-posts-feed");
    if (!feed) return;
    if (!window.myBookmarks || window.myBookmarks.length === 0) { feed.innerHTML = "<p>No saved recipes yet.</p>"; return; }
    
    db.collection("posts").orderBy("createdAt", "desc").get().then((snap) => {
        feed.innerHTML = "";
        snap.forEach((doc) => {
            if (window.myBookmarks.includes(doc.id)) {
                const globalState = { myBookmarks: window.myBookmarks, currentUserData: window.currentUserData };
                feed.innerHTML += createPostCard(doc.data(), doc.id, user, globalState);
            }
        });
    });
};

/**
 * Compiles and renders the aggregated weekly meal plan dashboard metrics layout.
 */
window.loadMealPlannerDashboard = async () => {
    const user = auth.currentUser;
    if (!user) return window.router("/");

    const container = document.getElementById("weekly-planner-container");
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:30px;"><i class='bx bx-loader-alt bx-spin' style="font-size:1.5rem; color:var(--accent-color);"></i></div>`;

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const TARGET_CALORIES = 2000;

    try {
        // Utilize the isolated tracker query from our service pipeline
        const snap = await fetchUserMealPlan(user.uid);
        container.innerHTML = "";
        
        const planByDay = {};
        days.forEach(d => planByDay[d] = []);
        snap.forEach(doc => {
            const data = doc.data();
            if (planByDay[data.dayOfWeek]) planByDay[data.dayOfWeek].push({ id: doc.id, ...data });
        });

        days.forEach(day => {
            const plannedMeals = planByDay[day];
            let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
            let mealsListHTML = "";

            if (plannedMeals.length === 0) {
                mealsListHTML = `<p style="font-size:0.8rem; color:var(--text-sec); font-style:italic; padding:4px 0;">No meals scheduled yet.</p>`;
            } else {
                mealsListHTML = plannedMeals.map(meal => {
                    totalCal += meal.calories || 0;
                    totalProtein += meal.protein || 0;
                    totalCarbs += meal.carbs || 0;
                    totalFat += meal.fat || 0;

                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-color); border:1px solid var(--border-color); padding:8px 12px; border-radius:6px; margin-top:6px;">
                            <div>
                                <span style="font-size:0.85rem; font-weight:600; color:var(--accent-color);">${meal.recipeTitle}</span>
                                <div style="font-size:0.7rem; color:var(--text-sec); margin-top:2px;">🔥 ${meal.calories} kcal | P: ${meal.protein}g | C: ${meal.carbs}g | F: ${meal.fat}g</div>
                            </div>
                            <button onclick="window.removeFromMealPlan('${meal.id}')" style="background:transparent; color:#ff4500; padding:4px; border:none; cursor:pointer;"><i class='bx bx-x-circle' style="font-size:1.15rem;"></i></button>
                        </div>
                    `;
                }).join("");
            }

            const progressPercent = Math.min((totalCal / TARGET_CALORIES) * 100, 100);
            const barColor = totalCal > TARGET_CALORIES ? "#ff4500" : "var(--accent-color)";

            const dayCardHTML = `
                <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:10px; padding:12px 14px; box-shadow: 0 1px 3px var(--shadow);">
                    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
                        <h3 style="font-size:1rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-main);">${day}</h3>
                        <span style="font-size:0.75rem; font-weight:bold; color:${totalCal > TARGET_CALORIES ? '#ff4500' : 'var(--text-sec)'}">
                            ${totalCal} / ${TARGET_CALORIES} <small>kcal</small>
                        </span>
                    </div>
                    <div style="width:100%; height:6px; background:var(--bg-color); border-radius:3px; overflow:hidden; margin-bottom:10px;">
                        <div style="width:${progressPercent}%; height:100%; background:${barColor}; transition:width 0.3s ease;"></div>
                    </div>
                    <div style="display:flex; gap:12px; font-size:0.7rem; color:var(--text-sec); font-weight:600; padding:2px 2px; margin-bottom:5px;">
                        <span>💪 P: <b style="color:var(--text-main);">${totalProtein}g</b></span>
                        <span>🍞 C: <b style="color:var(--text-main);">${totalCarbs}g</b></span>
                        <span>🥑 F: <b style="color:var(--text-main);">${totalFat}g</b></span>
                    </div>
                    <div style="margin-top:5px;">${mealsListHTML}</div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', dayCardHTML);
        });
    } catch (err) {
        console.error("Dashboard error:", err);
    }
};

window.loadSavedPosts = loadSavedPosts;
window.loadPublicProfile = loadPublicProfile;
window.loadAccountSettings = loadAccountSettings;