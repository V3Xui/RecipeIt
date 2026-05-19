import { auth, db } from '../config.js';
import { createPost } from '../services/postService.js';
import { reportPost, purgePost, clearPostFlags, banUserAccount } from '../services/adminService.js';
import { createPostCard } from '../components/postCard.js';

// Centralize local UI feed states
let lastVisibleDoc = null;
let isFetching = false;
let hasMorePosts = true;

/**
 * Handles the extraction and publishing structure for new recipes.
 */
window.submitPost = async () => {
    const user = auth.currentUser;
    const title = document.getElementById("post-title").value;
    const category = document.getElementById("post-category").value; 
    const desc = document.getElementById("post-desc").value;
    const ingredients = document.getElementById("post-ingredients").value.split('\n').filter(l => l.trim() !== '');
    const instructions = document.getElementById("post-instructions").value.split('\n').filter(l => l.trim() !== '');
    const tips = document.getElementById("post-tips").value.split('\n').filter(l => l.trim() !== '');
    const file = document.getElementById("post-image").files[0];

    const calories = parseInt(document.getElementById("post-calories").value) || 0;
    const protein = parseInt(document.getElementById("post-protein").value) || 0;
    const carbs = parseInt(document.getElementById("post-carbs").value) || 0;
    const fats = parseInt(document.getElementById("post-fats").value) || 0;

    const dietaryTags = [];
    document.querySelectorAll('input[name="post-diet-tags"]:checked').forEach(cb => dietaryTags.push(cb.value));

    if (!user || !title) return window.showToast("Dish Name required!", "error");

    const proceedSave = async (url) => {
        try {
            await createPost({
                title, category, description: desc, ingredients, instructions, tips, imageUrl: url,
                authorName: user.displayName || user.email, authorEmail: user.email, authorId: user.uid,
                nutrition: { calories, protein, carbs, fat: fats },
                dietaryTags
            });
            window.showToast("Recipe shared!", "success");
            window.router("/dashboard");
        } catch (err) {
            window.showToast("Failed to share recipe: " + err.message, "error");
        }
    };

    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => proceedSave(reader.result);
        reader.readAsDataURL(file);
    } else { proceedSave(null); }
};

/**
 * Executes a reporting action on a post, notifying administrators via a reportCount tracking system field increment.
 */
window.reportPost = async (postId) => {
    try {
        await reportPost(postId);
        window.showToast("Post has been reported for evaluation.", "success");
        document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
    } catch (err) {
        console.error("Report step failure:", err);
    }
};

/**
 * Handles the administrative purge request with custom dialog confirmation wrapping.
 */
window.adminDeletePost = async (postId) => {
    const confirmed = await window.customConfirm("ADMIN CONTROL: Are you absolutely sure you want to permanently delete this post?");
    if (confirmed) {
        try {
            await purgePost(postId);
            window.showToast("Post successfully moderated and removed.", "success");
            if (window.location.hash === "#/admin") {
                window.loadAdminDashboard();
            } else {
                window.router("/dashboard");
            }
        } catch (err) {
            window.showToast("Moderation deletion failed: " + err.message, "error");
        }
    }
};

/**
 * Dismisses user-submitted flags and retains the recipe inside standard search queues.
 */
window.adminMarkSafe = async (postId) => {
    const confirmed = await window.customConfirm("ADMIN CONTROL: Are you sure you want to dismiss all user flags and mark this recipe as safe?");
    if (confirmed) {
        try {
            await clearPostFlags(postId);
            window.showToast("Recipe approved! Reports successfully cleared.", "success");
            if (window.location.hash === "#/admin") {
                window.loadAdminDashboard();
            } else {
                window.router("/dashboard");
            }
        } catch (err) {
            window.showToast("Failed to clear flags: " + err.message, "error");
        }
    }
};

/**
 * Suspends account workflow operations for problematic profiles.
 */
window.adminBanUser = async (targetUserId, userName) => {
    const confirmed = await window.customConfirm(`ADMIN CONTROL: Suspend account permissions for ${userName}?`);
    if (confirmed) {
        try {
            await banUserAccount(targetUserId);
            window.showToast(`${userName} has been successfully suspended.`, "success");
            document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
        } catch (err) {
            window.showToast("Suspension execution error: " + err.message, "error");
        }
    }
};

/**
 * Sweeps the home dashboard display state locally, filtering cards to match preferences.
 */
window.activeTimelineDietFilter = null;
window.toggleTimelineDiet = (diet) => {
    const chip = document.getElementById(`chip-${diet}`);
    const allChips = document.querySelectorAll('.diet-chip-btn');
    
    if (window.activeTimelineDietFilter === diet) {
        window.activeTimelineDietFilter = null;
        if (chip) chip.classList.remove('active-chip');
    } else {
        window.activeTimelineDietFilter = diet;
        allChips.forEach(c => c.classList.remove('active-chip'));
        if (chip) chip.classList.add('active-chip');
    }

    document.querySelectorAll('.post-card').forEach(card => {
        if (!window.activeTimelineDietFilter) {
            card.style.display = "block";
            return;
        }
        const badges = card.querySelectorAll('.post-diet-badge');
        let match = false;
        badges.forEach(b => {
            if (b.innerText === window.activeTimelineDietFilter.toUpperCase()) match = true;
        });
        card.style.display = match ? "block" : "none";
    });
};

// --- RESTORED CORE CARD INTERACTIONS ---

window.votePost = (id, type) => {
    const user = auth.currentUser;
    if (!user) return window.showToast("Login to vote", "error");
    const ref = db.collection("posts").doc(id);
    const uid = user.uid;
    
    db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      const d = doc.data();
      let up = d.upvotedBy || [], down = d.downvotedBy || [];
  
      if (type === "up") {
          up.includes(uid) ? (up = up.filter(i => i !== uid)) : (up.push(uid), down = down.filter(i => i !== uid));
      } else {
          down.includes(uid) ? (down = down.filter(i => i !== uid)) : (down.push(uid), up = up.filter(i => i !== uid));
      }
      t.update(ref, { upvotedBy: up, downvotedBy: down });
      return { up, down };
    }).then(({ up, down }) => {
        const scoreEl = document.getElementById(`score-${id}`);
        const btnUp = document.getElementById(`btn-up-${id}`);
        const btnDown = document.getElementById(`btn-down-${id}`);
        if(scoreEl) scoreEl.innerText = up.length - down.length;
        if(btnUp) btnUp.style.color = up.includes(uid) ? "var(--accent-color)" : "var(--text-sec)";
        if(btnDown) btnDown.style.color = down.includes(uid) ? "#7193ff" : "var(--text-sec)";
    }).catch(console.error);
};
  
window.addComment = (id) => {
    const input = document.getElementById(`input-${id}`);
    const text = input.value.trim();
    const user = auth.currentUser;
    if (user && text) {
      db.collection("posts").doc(id).collection("comments").add({
          text, authorName: user.displayName || user.email, authorId: user.uid, createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      }).then(() => input.value = "");
    }
};
  
window.toggleBookmark = (postId) => {
    const user = auth.currentUser;
    if (!user) return window.showToast("Login to save", "error");
    
    if (!window.myBookmarks) window.myBookmarks = [];
    const isSaved = window.myBookmarks.includes(postId);
    const userRef = db.collection("users").doc(user.uid);
  
    const icon = document.getElementById(`save-icon-${postId}`);
    const text = document.getElementById(`save-text-${postId}`);
    if (isSaved) {
        if(icon) { icon.className = "bx bx-bookmark"; icon.style.color = "var(--text-main)"; }
        if(text) text.innerText = "Save Post";
        window.myBookmarks = window.myBookmarks.filter(id => id !== postId);
        window.showToast("Removed from Saved", "normal");
        userRef.update({ savedRecipes: window.firebase.firestore.FieldValue.arrayRemove(postId) });
    } else {
        if(icon) { icon.className = "bx bxs-bookmark"; icon.style.color = "var(--accent-color)"; }
        if(text) text.innerText = "Unsave Post";
        window.myBookmarks.push(postId);
        window.showToast("Saved!", "success");
        userRef.set({ savedRecipes: window.firebase.firestore.FieldValue.arrayUnion(postId) }, { merge: true });
    }
    document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
};
  
window.togglePostMenu = (postId) => {
    const menu = document.getElementById(`menu-${postId}`);
    if (menu) {
        document.querySelectorAll('.post-menu-content').forEach(el => { if (el.id !== `menu-${postId}`) el.style.display = 'none'; });
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
};
  
window.addToShoppingList = (event, postId) => {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const user = auth.currentUser;
    if (!user) return window.showToast("Login needed", "error");
    db.collection("posts").doc(postId).get().then((doc) => {
        if (doc.exists) {
            const ingredients = doc.data().ingredients || [];
            if (ingredients.length === 0) return window.showToast("No ingredients found.", "error");
            db.collection("users").doc(user.uid).update({
                shoppingList: window.firebase.firestore.FieldValue.arrayUnion(...ingredients)
            }).then(() => window.showToast(`Added ${ingredients.length} items!`, "success"));
        }
    });
};

window.addEventListener('click', (e) => {
    if (!e.target.closest('.post-menu-btn') && !e.target.closest('.post-menu-content')) {
        document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
    }
});

/**
 * Queries a chronological block of recipes using an array-contains look-up rule for lifestyle tags.
 */
window.setDietaryFilter = (diet) => {
    const catSection = document.getElementById("category-section");
    const resultHeader = document.getElementById("search-results-header");
    const resultTitle = document.getElementById("results-title");
    
    if (catSection) catSection.style.display = "none";
    if (resultHeader) resultHeader.style.display = "flex";
    if (resultTitle) resultTitle.innerText = `${diet} Menu`;

    const feedContainer = document.getElementById("posts-feed");
    if (!feedContainer) return;
    feedContainer.innerHTML = `<div style="text-align:center; padding:40px;"><i class='bx bx-loader-alt bx-spin' style="font-size:2rem; color:var(--accent-color);"></i></div>`;
    
    db.collection("posts")
        .where("dietaryTags", "array-contains", diet)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get()
        .then((snap) => {
            feedContainer.innerHTML = "";
            if (snap.empty) {
                feedContainer.innerHTML = `<div style='text-align:center; padding:20px; color:var(--text-sec);'>No verified ${diet} recipes found.</div>`;
                return;
            }
            snap.forEach(doc => {
                const globalState = { myBookmarks: window.myBookmarks, currentUserData: window.currentUserData };
                feedContainer.insertAdjacentHTML('beforeend', createPostCard(doc.data(), doc.id, auth.currentUser, globalState));
            });
        })
        .catch(err => {
            console.error("Dietary lookup crash:", err);
            window.showToast("Error filtering diet structure", "error");
        });
};

/**
 * Initializes and populates the reported content stream for administrators.
 */
window.loadAdminDashboard = () => {
    const isAdmin = window.currentUserData && window.currentUserData.role === 'admin';
    if (!isAdmin) {
        window.showToast("Unauthorized entry blocked.", "error");
        window.router("/dashboard");
        return;
    }

    const panelFeed = document.getElementById("admin-reports-feed");
    if (!panelFeed) return;

    panelFeed.innerHTML = `<div style="text-align:center; padding:20px;"><i class='bx bx-loader-alt bx-spin' style="font-size:1.5rem; color:var(--accent-color);"></i></div>`;

    db.collection("posts")
        .where("reportCount", ">=", 1)
        .orderBy("reportCount", "desc")
        .get()
        .then((snap) => {
            panelFeed.innerHTML = "";
            if (snap.empty) {
                panelFeed.innerHTML = "<p style='text-align:center; color:var(--text-sec); padding:30px;'>No pending reports! The queue is clean. ✨</p>";
                return;
            }

            snap.forEach((doc) => {
                const data = doc.data();
                const reportHeader = `
                    <div style="background:#ff450015; border-left:4px solid #ff4500; padding:10px; margin-bottom:20px; border-radius:0 8px 8px 0; font-size:0.85rem; font-weight:bold; color:#ff4500; display:flex; justify-content:space-between; align-items:center;">
                        <span>⚠️ FLAG NOTIFICATION: Reported ${data.reportCount} times</span>
                        <div style="display:flex; gap:8px;">
                            <button onclick="window.adminMarkSafe('${doc.id}')" style="background:#4caf50; color:white; border:none; padding:5px 12px; font-size:0.75rem; border-radius:20px; cursor:pointer; font-weight:600;">Mark Safe</button>
                            <button onclick="window.adminDeletePost('${doc.id}')" style="background:#ff4500; color:white; border:none; padding:5px 12px; font-size:0.75rem; border-radius:20px; cursor:pointer; font-weight:600;">Quick Purge</button>
                        </div>
                    </div>
                `;
                panelFeed.insertAdjacentHTML('beforeend', reportHeader);
                const globalState = { myBookmarks: window.myBookmarks, currentUserData: window.currentUserData };
                panelFeed.insertAdjacentHTML('beforeend', createPostCard(data, doc.id, auth.currentUser, globalState));
            });
        })
        .catch((err) => {
            console.error("Panel fetch error:", err);
            window.showToast("Failed to load administration pipeline", "error");
        });
};

window.resetSearch = () => {
    const catSection = document.getElementById("category-section");
    const resultHeader = document.getElementById("search-results-header");
    const feedContainer = document.getElementById("posts-feed");
    const innerSearchInput = document.getElementById("search-input");

    if (catSection) catSection.style.display = "block";
    if (resultHeader) resultHeader.style.display = "none";
    if (innerSearchInput) innerSearchInput.value = "";
    if (feedContainer) feedContainer.innerHTML = "";
};

/**
 * Searches and filters through the titles of actively rendered dietary query list post cards on the client side.
 */
window.performSearch = () => {
    const term = (document.getElementById("search-input")?.value || "").toLowerCase();
    const cards = document.querySelectorAll(".post-card");
    
    cards.forEach(card => {
        const titleText = card.querySelector(".post-title")?.innerText.toLowerCase() || "";
        const descText = card.querySelector(".post-content")?.innerText.toLowerCase() || "";
        
        if (titleText.includes(term) || descText.includes(term)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
};