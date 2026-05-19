import { auth, db } from '../config.js';
import { createPostCard } from '../components/postCard.js';

const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

export const loadAccountSettings = () => {
  const user = auth.currentUser;
  if (!user) return window.router("/");
  
  setTimeout(() => {
    const nameInput = document.getElementById("edit-name");
    if (nameInput) nameInput.value = user.displayName || "";
    
    db.collection("users").doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const bio = document.getElementById("edit-bio");
            if(bio) bio.value = data.bio || "";
            if(data.displayName && nameInput) nameInput.value = data.displayName;
            const img = document.getElementById("edit-avatar-preview");
            if(img) img.src = data.photoURL || DEFAULT_AVATAR;
        }
    });
  }, 100);
};

window.previewAvatar = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('edit-avatar-preview').src = e.target.result;
        reader.readAsDataURL(input.files[0]);
    }
};

window.saveProfile = () => {
  const user = auth.currentUser;
  const newName = document.getElementById("edit-name").value;
  const newBio = document.getElementById("edit-bio").value;
  const newPass = document.getElementById("edit-pass").value;
  const file = document.getElementById("edit-avatar").files[0];
  const promises = [];

  if (newName && newName !== user.displayName) promises.push(user.updateProfile({ displayName: newName }));
  if (newPass) promises.push(user.updatePassword(newPass));

  const saveToFirestore = (photoURL) => {
      const updateData = { bio: newBio, email: user.email, displayName: newName };
      if (photoURL) updateData.photoURL = photoURL;
      promises.push(db.collection("users").doc(user.uid).set(updateData, { merge: true }));
      Promise.all(promises).then(() => { 
          window.showToast("Profile updated successfully!", "success"); 
          window.router("/dashboard"); 
      }).catch((e) => window.showToast(e.message, "error"));
  };

  if (file) {
      const reader = new FileReader();
      reader.onloadend = () => saveToFirestore(reader.result);
      reader.readAsDataURL(file);
  } else { saveToFirestore(null); }
};

export const loadPublicProfile = (targetUserId) => {
    const currentUser = auth.currentUser;
    const nameEl = document.getElementById("profile-name");
    const bioEl = document.getElementById("profile-bio");
    const avatarEl = document.getElementById("profile-avatar");
    const actionArea = document.getElementById("follow-action-area");
    const feed = document.getElementById("user-posts-feed");
    const postCountEl = document.getElementById("profile-post-count");
    const followerCountEl = document.getElementById("profile-follower-count");

    db.collection("users").doc(targetUserId).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data(); 
            nameEl.innerText = data.displayName || data.email || "Unknown Chef";
            bioEl.innerText = data.bio || "No bio yet.";
            if (avatarEl) avatarEl.src = data.photoURL || DEFAULT_AVATAR;
            
            if (currentUser && currentUser.uid !== targetUserId) {
                db.collection("users").doc(currentUser.uid).onSnapshot((myDoc) => {
                    // FIX: Provide a fallback layout if the current user profile data is uninitialized
                    const myData = myDoc.data() || { following: [] };
                    const amFollowing = myData.following && myData.following.includes(targetUserId);
                    const safeName = (data.displayName || 'Chef').replace(/'/g, "\\'");
                    const msgBtn = `<button onclick="window.startChat('${targetUserId}', '${safeName}')" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color); margin-left: 10px;">Message</button>`;

                    if (amFollowing) {
                        actionArea.innerHTML = `<button onclick="window.toggleFollow('${targetUserId}', false)" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color);">Unfollow</button> ${msgBtn}`;
                    } else {
                        actionArea.innerHTML = `<button onclick="window.toggleFollow('${targetUserId}', true)" style="background: var(--accent-color); color: white;">Follow Chef</button> ${msgBtn}`;
                    }
                });
            } else if (currentUser && currentUser.uid === targetUserId) {
                actionArea.innerHTML = `<button onclick="window.router('/account')" style="font-size:0.9rem;">Edit Profile</button>`;
            }
        } else {
            nameEl.innerText = "User not found";
        }
    });

    db.collection("posts").where("authorId", "==", targetUserId).orderBy("createdAt", "desc").onSnapshot((snap) => {
        feed.innerHTML = "";
        if(postCountEl) postCountEl.innerText = snap.size; 
        if (snap.empty) { feed.innerHTML = "<p>No recipes posted yet.</p>"; return; }
        snap.forEach((doc) => {
            feed.innerHTML += createPostCard(doc.data(), doc.id, currentUser);
        });
    });

    db.collection("users").where("following", "array-contains", targetUserId).onSnapshot((snap) => {
        if(followerCountEl) followerCountEl.innerText = snap.size;
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
          if (window.myBookmarks.includes(doc.id)) feed.innerHTML += createPostCard(doc.data(), doc.id, user);
      });
  });
};

export const loadShoppingList = () => {
    const user = auth.currentUser;
    if (!user) return window.router("/");
    const listContainer = document.getElementById("shopping-list-items");
    if (!listContainer) return;

    db.collection("users").doc(user.uid).onSnapshot((doc) => {
        if (!doc.exists) return;
        const items = doc.data().shoppingList || [];
        if (items.length === 0) { listContainer.innerHTML = "<p style='text-align:center; color: var(--text-sec); padding: 20px;'>Your list is empty.</p>"; return; }
        listContainer.innerHTML = "";
        items.forEach((item) => {
            const safeItem = item.replace(/"/g, "&quot;").replace(/'/g, "\\'");
            listContainer.innerHTML += `
            <div style="display:flex; align-items:center; padding: 12px; border-bottom: 1px solid var(--border-color); background: var(--card-bg);">
                <input type="checkbox" class="shopping-checkbox" value="${safeItem}" onchange="window.updateSelectedCount()" style="margin-right: 15px; width: 18px; height: 18px; display: none; cursor: pointer;">
                <span style="font-size: 1rem; flex: 1;">${item}</span>
                <button class="single-delete-btn" onclick="window.removeShoppingItem('${safeItem}')" style="background:transparent; color: #ff4500; padding: 5px;"><i class='bx bx-trash' style="font-size: 1.2rem;"></i></button>
            </div>`;
        });
        const bulkRow = document.getElementById("bulk-action-row");
        if(bulkRow && bulkRow.style.display !== "none") window.applySelectModeStyles(true);
    });
};

window.toggleSelectionMode = () => {
    const addRow = document.getElementById("add-item-row");
    const bulkRow = document.getElementById("bulk-action-row");
    if (addRow.style.display !== "none") {
        addRow.style.display = "none";
        bulkRow.style.display = "flex";
        window.applySelectModeStyles(true);
    } else {
        addRow.style.display = "flex";
        bulkRow.style.display = "none";
        window.applySelectModeStyles(false);
        document.querySelectorAll('.shopping-checkbox').forEach(cb => cb.checked = false);
        window.updateSelectedCount();
    }
};

window.applySelectModeStyles = (isSelectMode) => {
    const checkboxes = document.querySelectorAll('.shopping-checkbox');
    const deleteBtns = document.querySelectorAll('.single-delete-btn');
    checkboxes.forEach(cb => cb.style.display = isSelectMode ? "block" : "none");
    deleteBtns.forEach(btn => btn.style.display = isSelectMode ? "none" : "block");
};

window.updateSelectedCount = () => {
    const count = document.querySelectorAll('.shopping-checkbox:checked').length;
    const span = document.getElementById("selected-count");
    if(span) span.innerText = `${count} selected`;
};

window.toggleSelectAll = () => {
    const checkboxes = document.querySelectorAll('.shopping-checkbox');
    if (checkboxes.length === 0) return;
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => { cb.checked = !allSelected; });
    window.updateSelectedCount();
};

window.deleteSelectedItems = () => {
    const user = auth.currentUser;
    if (!user) return;
    const checkboxes = document.querySelectorAll('.shopping-checkbox:checked');
    if (checkboxes.length === 0) return window.showToast("No items selected", "error");
    if (confirm(`Delete ${checkboxes.length} items?`)) {
        const itemsToDelete = Array.from(checkboxes).map(cb => cb.value);
        db.collection("users").doc(user.uid).update({ shoppingList: firebase.firestore.FieldValue.arrayRemove(...itemsToDelete) }).then(() => window.toggleSelectionMode());
    }
};

window.addManualItem = () => {
    const input = document.getElementById("manual-item-input");
    const val = input.value.trim();
    if (val && auth.currentUser) db.collection("users").doc(auth.currentUser.uid).update({ shoppingList: firebase.firestore.FieldValue.arrayUnion(val) }).then(() => input.value = "");
};

window.removeShoppingItem = (itemText) => {
    if (auth.currentUser && confirm("Remove this item?")) db.collection("users").doc(auth.currentUser.uid).update({ shoppingList: firebase.firestore.FieldValue.arrayRemove(itemText) });
};

window.toggleFollow = async (targetUserId, targetUserName) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        window.showToast("Please log in to follow chefs!", "error");
        return;
    }

    const myDocRef = db.collection("users").doc(currentUser.uid);
    const theirDocRef = db.collection("users").doc(targetUserId);

    try {
        const myDoc = await myDocRef.get();
        // Fallback array handling if document is uninitialized
        const myData = myDoc.data() || { following: [] };
        const isFollowing = myData.following && myData.following.includes(targetUserId);

        if (isFollowing) {
            // Unfollow logic: Switch .update() to .set(..., { merge: true })
            await myDocRef.set({
                following: firebase.firestore.FieldValue.arrayRemove(targetUserId)
            }, { merge: true });

            await theirDocRef.set({
                followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
            }, { merge: true });

            window.showToast(`Unfollowed ${targetUserName}`);
        } else {
            // Follow logic: Switch .update() to .set(..., { merge: true })
            await myDocRef.set({
                following: firebase.firestore.FieldValue.arrayUnion(targetUserId)
            }, { merge: true });

            await theirDocRef.set({
                followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            }, { merge: true });

            window.showToast(`Following ${targetUserName}!`, "success");
        }
    } catch (error) {
        console.error("Follow Toggle Error:", error);
        window.showToast("Could not complete follow action.", "error");
    }
};

export const loadMenu = () => {
    const user = auth.currentUser;
    if (!user) return window.router("/");
    
    setTimeout(() => {
        const img = document.getElementById("menu-avatar");
        const name = document.getElementById("menu-name");
        const themeIcon = document.getElementById("menu-theme-icon");
        const optionsList = document.getElementById("menu-options-list"); // Defined correctly here!
        
        if (img) img.src = user.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
        if (name) name.innerText = user.displayName || user.email;
        
        // 🛡️ FIX 1: Safe Meal Planner Option Injection Block
        if (optionsList && !document.getElementById("planner-menu-item")) {
            const plannerItem = document.createElement("div");
            plannerItem.id = "planner-menu-item";
            plannerItem.className = "menu-item-styled";
            plannerItem.style.borderBottom = "1px solid var(--border-color)";
            plannerItem.onclick = () => window.router('/planner');
            plannerItem.innerHTML = `<i class='bx bx-calendar-heart' style='font-size:1.2rem; color:var(--accent-color);'></i> Daily Meal Planner`;
            
            // Inserts it cleanly right at the top of the option drawer list
            optionsList.insertBefore(plannerItem, optionsList.firstChild);
        }
        
        // 🛡️ FIX 2: Real-time authorization check injection block for Admins
        if (optionsList && window.currentUserData && window.currentUserData.role === 'admin') {
            if (!document.getElementById("admin-menu-item")) {
                const adminItem = document.createElement("div");
                adminItem.id = "admin-menu-item";
                adminItem.className = "menu-item-styled";
                adminItem.style.borderBottom = "1px solid var(--border-color)";
                adminItem.style.background = "#ff450010";
                adminItem.style.fontWeight = "bold";
                adminItem.onclick = () => window.router('/admin');
                adminItem.innerHTML = `<i class='bx bx-shield-quarter' style='font-size:1.2rem; color:var(--accent-color);'></i> Moderation Control`;
                
                optionsList.prepend(adminItem);
            }
        }
        
        const currentTheme = localStorage.getItem('theme') || 'light';
        if(themeIcon) themeIcon.className = currentTheme === 'dark' ? 'bx bx-sun' : 'bx bx-moon';
    }, 50);
};

// ==========================================================================
// MODULE 4 MASTER FEATURE: CALENDAR SCHEDULER & HEALTH AGGREGATOR ENGINE
// ==========================================================================

window.openMealPlannerModal = (event, postId, recipeTitle) => {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    
    const user = auth.currentUser;
    if (!user) return window.showToast("Please log in to plan meals!", "error");

    let modal = document.getElementById('meal-planner-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'meal-planner-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayButtonsHTML = days.map(day => `
        <button onclick="window.saveToMealPlan('${postId}', '${recipeTitle.replace(/'/g, "\\'")}', '${day}')" 
                style="width:100%; background:var(--bg-color); color:var(--text-main); border:1px solid var(--border-color); text-align:left; padding:12px 15px; border-radius:8px; margin-bottom:6px; font-size:0.9rem; display:flex; justify-content:space-between; align-items:center;">
            <span>${day}</span> <i class='bx bx-chevron-right' style="color:var(--accent-color);"></i>
        </button>
    `).join("");

    modal.innerHTML = `
        <div class="modal-card" style="max-width:340px;">
            <h3 style="margin-bottom:4px;"><i class='bx bx-calendar-plus' style='color:var(--accent-color);'></i> Schedule Meal</h3>
            <p style="margin-bottom:15px; font-size:0.8rem; color:var(--text-sec);">Add "${recipeTitle}" to your daily health pipeline routines.</p>
            <div style="max-height:280px; overflow-y:auto; padding-right:2px;">
                ${dayButtonsHTML}
            </div>
            <button onclick="document.getElementById('meal-planner-modal').style.display='none'" 
                    style="width:100%; background:transparent; color:var(--text-sec); border:1px solid var(--border-color); margin-top:10px; font-size:0.85rem; padding:8px;">Cancel</button>
        </div>
    `;

    modal.style.display = 'flex';
};

window.saveToMealPlan = (postId, recipeTitle, day) => {
    const user = auth.currentUser;
    if (!user) return;

    document.getElementById('meal-planner-modal').style.display = 'none';

    // Fetch the target post document first to ensure we lock in precise snapshot macros
    db.collection("posts").doc(postId).get().then((doc) => {
        if (!doc.exists) return window.showToast("Recipe entry no longer exists.", "error");

        const data = doc.data();
        const nut = data.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };

        // WRITE MAP TO USER STATE ACCORDING TO ACCESSED PATHWAYS
        db.collection("users").doc(user.uid).collection("mealPlan").add({
            postId,
            recipeTitle,
            dayOfWeek: day,
            calories: parseInt(nut.calories) || 0,
            protein: parseInt(nut.protein) || 0,
            carbs: parseInt(nut.carbs) || 0,
            fat: parseInt(nut.fat) || 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            window.showToast(`Added to ${day}'s Meal Plan!`, "success");
        })
        .catch(err => window.showToast("Planner save error: " + err.message, "error"));
    });
};

window.removeFromMealPlan = (planId) => {
    const user = auth.currentUser;
    if (!user) return;

    db.collection("users").doc(user.uid).collection("mealPlan").doc(planId).delete()
    .then(() => {
        window.showToast("Meal removed from schedule.", "normal");
        window.loadMealPlannerDashboard(); // Live canvas update refresh
    })
    .catch(err => window.showToast("Removal failed: " + err.message, "error"));
};

window.loadMealPlannerDashboard = () => {
    const user = auth.currentUser;
    if (!user) return window.router("/");

    const container = document.getElementById("weekly-planner-container");
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:30px;"><i class='bx bx-loader-alt bx-spin' style="font-size:1.5rem; color:var(--accent-color);"></i></div>`;

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    // Academic Defense Target Baseline Benchmarks
    const TARGET_CALORIES = 2000;

    // Fetch user scheduling sub-collections array maps in real-time
    db.collection("users").doc(user.uid).collection("mealPlan").get().then((snap) => {
        container.innerHTML = "";
        
        // Group list items by week days mapping structures
        const planByDay = {};
        days.forEach(d => planByDay[d] = []);
        
        snap.forEach(doc => {
            const data = doc.data();
            if (planByDay[data.dayOfWeek]) {
                planByDay[data.dayOfWeek].push({ id: doc.id, ...data });
            }
        });

        // Loop through all 7 days to compile mathematical aggregations
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
                                <span onclick="window.router('/user/${meal.postId ? '.. /' : ''}')" style="font-size:0.85rem; font-weight:600; color:var(--accent-color); cursor:pointer;">${meal.recipeTitle}</span>
                                <div style="font-size:0.7rem; color:var(--text-sec); margin-top:2px;">🔥 ${meal.calories} kcal | P: ${meal.protein}g | C: ${meal.carbs}g | F: ${meal.fat}g</div>
                            </div>
                            <button onclick="window.removeFromMealPlan('${meal.id}')" style="background:transparent; color:#ff4500; padding:4px; border:none; cursor:pointer;"><i class='bx bx-x-circle' style="font-size:1.15rem;"></i></button>
                        </div>
                    `;
                }).join("");
            }

            // Calculate progress bar percentages
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
                        <span>💪 Protein: <b style="color:var(--text-main);">${totalProtein}g</b></span>
                        <span>🍞 Carbs: <b style="color:var(--text-main);">${totalCarbs}g</b></span>
                        <span>🥑 Fats: <b style="color:var(--text-main);">${totalFat}g</b></span>
                    </div>

                    <div style="margin-top:5px;">
                        ${mealsListHTML}
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', dayCardHTML);
        });
    }).catch(err => {
        console.error("Dashboard calculation failure:", err);
        container.innerHTML = `<p style="color:red; text-align:center; font-size:0.8rem;">Could not load planner data mapping arrays.</p>`;
    });
};

window.loadSavedPosts = loadSavedPosts;
window.loadShoppingList = loadShoppingList;
window.loadPublicProfile = loadPublicProfile;
window.loadMenu = loadMenu;