import { auth, db } from '../config.js';
import { createPostCard } from '../components/postCard.js';

// --- STATE MANAGEMENT ---
window.editingPostId = null;
window.currentCategory = "All"; 
let lastVisibleDoc = null;
let isFetching = false;
let hasMorePosts = true;

// --- UTILS ---
const sendNotification = (targetUserId, type, text, link = null) => {
    const user = auth.currentUser;
    if (!user || user.uid === targetUserId) return; 
    db.collection("users").doc(targetUserId).collection("notifications").add({
        type, text, link,
        senderName: user.displayName || "Someone",
        senderId: user.uid,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};
window.sendNotification = sendNotification; 

const getSkeletonFeed = () => `<div style="padding:20px; text-align:center; color:var(--text-sec);">Loading delicious recipes...</div>`;

// --- PULL TO REFRESH LOGIC ---
const initPullToRefresh = () => {
    let startY = 0;
    let isPulling = false;
    const loader = document.getElementById("refresh-loader");
    
    // Remove old listeners to prevent duplicates
    document.removeEventListener('touchstart', window._touchStart);
    document.removeEventListener('touchmove', window._touchMove);
    document.removeEventListener('touchend', window._touchEnd);

    if (!loader) return;

    window._touchStart = (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    };

    window._touchMove = (e) => {
        if (!isPulling) return;
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;

        // Only activate if pulling down at the top
        if (pullDistance > 0 && window.scrollY === 0) {
            if (pullDistance < 150) { // Max visual pull limit
                loader.style.height = `${pullDistance}px`;
                loader.style.opacity = pullDistance / 100; // Fade in
            }
        } else {
            isPulling = false;
            loader.style.height = "0px";
        }
    };

    window._touchEnd = () => {
        if (!isPulling) return;
        isPulling = false;
        
        // If pulled enough (threshold 80px), trigger refresh
        if (parseInt(loader.style.height) > 80) {
            loader.style.height = "50px"; // Snap to loading height
            loadPosts(); // <--- REFRESH ACTION
            setTimeout(() => { loader.style.height = "0px"; }, 1500); // Hide after delay
        } else {
            loader.style.height = "0px"; // Snap back if not pulled enough
        }
    };

    document.addEventListener('touchstart', window._touchStart, { passive: true });
    document.addEventListener('touchmove', window._touchMove, { passive: false });
    document.addEventListener('touchend', window._touchEnd, { passive: true });
};

// --- DATA LOADING ---
export const loadPosts = () => {
  const feedContainer = document.getElementById("posts-feed");
  if (!feedContainer) return;

  // Initialize Pull-to-Refresh whenever dashboard loads
  initPullToRefresh();

  feedContainer.innerHTML = "";
  lastVisibleDoc = null;
  isFetching = false;
  hasMorePosts = true;
  window.currentCategory = "All";

  getNextBatch();

  window.onscroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 100) getNextBatch();
  };
};

const getNextBatch = () => {
    if (isFetching || !hasMorePosts || window.currentCategory !== "All") return;

    isFetching = true;
    const feedContainer = document.getElementById("posts-feed");
    
    // Only show skeleton if it's the first load
    if (!lastVisibleDoc) feedContainer.innerHTML = getSkeletonFeed();

    let query = db.collection("posts").orderBy("createdAt", "desc").limit(5);
    if (lastVisibleDoc) query = query.startAfter(lastVisibleDoc);

    query.get().then((snap) => {
        if (!lastVisibleDoc) feedContainer.innerHTML = ""; 

        if (snap.empty) {
            hasMorePosts = false;
            // FIX: Handle empty state correctly
            if (feedContainer.innerHTML === "") {
                feedContainer.innerHTML = "<p style='text-align:center; padding:20px; color:var(--text-sec);'>No recipes found. Be the first to share one!</p>";
            } else {
                feedContainer.insertAdjacentHTML('beforeend', "<p style='text-align:center; padding:20px; color:var(--text-sec);'>You've reached the end!</p>");
            }
            isFetching = false;
            return;
        }

        lastVisibleDoc = snap.docs[snap.docs.length - 1];
        snap.forEach((doc) => {
            feedContainer.insertAdjacentHTML('beforeend', createPostCard(doc.data(), doc.id, auth.currentUser));
        });
        isFetching = false;
    }).catch((error) => {
        // FIX: Handle Errors (Like missing index)
        console.error("Feed Error:", error);
        isFetching = false;
        if (!lastVisibleDoc) {
            feedContainer.innerHTML = `<div style="text-align:center; padding:20px; color:red;">
                <p>Unable to load recipes.</p>
                <p style="font-size:0.8rem;">${error.message}</p>
            </div>`;
        }
    });
};

// --- CATEGORY FILTER ---
window.setCategory = (cat) => {
    window.currentCategory = cat;
    document.querySelectorAll(".filter-btn").forEach(btn => {
        const isActive = btn.innerText === cat;
        btn.style.backgroundColor = isActive ? "var(--accent-color)" : "var(--card-bg)";
        btn.style.color = isActive ? "white" : "var(--text-main)";
    });

    if (cat !== "All") {
        window.onscroll = null; 
        const feed = document.getElementById("posts-feed");
        feed.innerHTML = `<div style="text-align:center; padding:20px;">Loading ${cat}...</div>`;
        
        db.collection("posts").where("category", "==", cat).orderBy("createdAt", "desc").limit(20).get()
            .then((snap) => {
                feed.innerHTML = snap.empty ? "<p style='text-align:center; padding:20px;'>No recipes found.</p>" : "";
                snap.forEach(doc => feed.insertAdjacentHTML('beforeend', createPostCard(doc.data(), doc.id, auth.currentUser)));
            })
            .catch(err => {
                console.error(err);
                if(err.message.includes("index")) window.showToast("Building Database Index... wait 2 mins.", "error");
            });
    } else {
        loadPosts(); 
    }
};

window.filterPosts = () => {
  const term = (document.getElementById("search-desktop")?.value || document.getElementById("search-mobile")?.value || "").toLowerCase();
  document.querySelectorAll(".post-card").forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(term) ? "" : "none";
  });
};

// --- USER ACTIONS ---
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
    return { up, down, d };
  }).then(({ up, down, d }) => {
      const scoreEl = document.getElementById(`score-${id}`);
      const btnUp = document.getElementById(`btn-up-${id}`);
      const btnDown = document.getElementById(`btn-down-${id}`);
      
      if(scoreEl) {
          scoreEl.innerText = up.length - down.length;
          scoreEl.style.color = up.includes(uid) ? "var(--accent-color)" : (down.includes(uid) ? "#7193ff" : "var(--text-main)");
      }
      if(btnUp) btnUp.style.color = up.includes(uid) ? "var(--accent-color)" : "var(--text-sec)";
      if(btnDown) btnDown.style.color = down.includes(uid) ? "#7193ff" : "var(--text-sec)";

      if (type === "up" && up.includes(uid)) sendNotification(d.authorId, "like", `liked "${d.title}"`, "/dashboard");
  }).catch(console.error);
};

window.addComment = (id) => {
  const input = document.getElementById(`input-${id}`);
  const text = input.value.trim();
  const user = auth.currentUser;
  
  if (user && text) {
    db.collection("posts").doc(id).collection("comments").add({
        text, authorName: user.displayName || user.email, authorId: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(() => {
        input.value = "";
        db.collection("posts").doc(id).get().then(doc => {
            if(doc.exists) sendNotification(doc.data().authorId, "comment", `commented on "${doc.data().title}"`, "/dashboard");
        });
    });
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
        userRef.update({ savedRecipes: firebase.firestore.FieldValue.arrayRemove(postId) });
    } else {
        if(icon) { icon.className = "bx bxs-bookmark"; icon.style.color = "var(--accent-color)"; }
        if(text) text.innerText = "Unsave Post";
        window.myBookmarks.push(postId);
        window.showToast("Saved!", "success");
        userRef.set({ savedRecipes: firebase.firestore.FieldValue.arrayUnion(postId) }, { merge: true });
    }
    document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
};

// --- CRUD ---
window.submitPost = () => {
  const user = auth.currentUser;
  const title = document.getElementById("post-title").value;
  const category = document.getElementById("post-category").value; 
  const desc = document.getElementById("post-desc").value;
  const ingredients = document.getElementById("post-ingredients").value.split('\n').filter(l => l.trim() !== '');
  const instructions = document.getElementById("post-instructions").value.split('\n').filter(l => l.trim() !== '');
  const tips = document.getElementById("post-tips").value.split('\n').filter(l => l.trim() !== '');
  const file = document.getElementById("post-image").files[0];

  // MODULE 1 IMPLEMENTATION: GRAB AND MAP MACRONUTRIENT VALUES
  const calories = parseInt(document.getElementById("post-calories").value) || 0;
  const protein = parseInt(document.getElementById("post-protein").value) || 0;
  const carbs = parseInt(document.getElementById("post-carbs").value) || 0;
  const fats = parseInt(document.getElementById("post-fats").value) || 0;

  // MODULE 1 IMPLEMENTATION: COLLECT CHECKED DIETARY LIFESTYLE TOKENS
  const dietaryTags = [];
  document.querySelectorAll('input[name="post-diet-tags"]:checked').forEach(cb => {
      dietaryTags.push(cb.value);
  });

  if (!user || !title) return window.showToast("Dish Name required!", "error");

  const save = (url) => {
    db.collection("posts").add({
        title, category, description: desc, ingredients, instructions, tips, imageUrl: url,
        authorName: user.displayName || user.email, authorEmail: user.email, authorId: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), upvotedBy: [], downvotedBy: [],
        reportCount: 0, // Admin tracking integration initialization
        
        // SAVE NUTRITION PACKAGE
        nutrition: { calories, protein, carbs, fat: fats },
        dietaryTags: dietaryTags
    }).then(() => {
        window.showToast("Recipe shared!", "success");
        window.router("/dashboard");
    });
  };

  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => save(reader.result);
    reader.readAsDataURL(file);
  } else { save(null); }
};

window.submitUpdate = () => { 
  const id = window.editingPostId;
  const title = document.getElementById("edit-title").value;
  const category = document.getElementById("post-category").value;
  const desc = document.getElementById("edit-desc").value;
  const ingredients = document.getElementById("edit-ingredients").value.split("\n").filter(l => l.trim() !== "");
  const instructions = document.getElementById("edit-instructions").value.split("\n").filter(l => l.trim() !== "");
  const tips = document.getElementById("edit-tips").value.split("\n").filter(l => l.trim() !== "");
  const file = document.getElementById("edit-image").files[0];

  // MODULE 1 IMPLEMENTATION: EXTRACT CURRENT MACRO FORM PROGRESSION
  const calories = parseInt(document.getElementById("edit-calories").value) || 0;
  const protein = parseInt(document.getElementById("edit-protein").value) || 0;
  const carbs = parseInt(document.getElementById("edit-carbs").value) || 0;
  const fats = parseInt(document.getElementById("edit-fats").value) || 0;

  // MODULE 1 IMPLEMENTATION: EXTRACT TICKED LIFECYCLE ARRAY
  const dietaryTags = [];
  document.querySelectorAll('input[name="edit-diet-tags"]:checked').forEach(cb => {
      dietaryTags.push(cb.value);
  });

  const updateFirestore = (newUrl) => {
    const updateData = { 
        title, category, description: desc, ingredients, instructions, tips,
        nutrition: { calories, protein, carbs, fat: fats },
        dietaryTags: dietaryTags
    };
    if (newUrl) updateData.imageUrl = newUrl;
    db.collection("posts").doc(id).update(updateData).then(() => {
        window.showToast("Recipe updated!", "success");
        window.router("/dashboard");
    });
  };

  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => updateFirestore(reader.result);
    reader.readAsDataURL(file);
  } else { updateFirestore(null); }
};

window.openEditPage = (id) => { window.editingPostId = id; window.router("/edit"); };

export const loadEditForm = () => {
  if (!window.editingPostId) return window.router("/dashboard");
  db.collection("posts").doc(window.editingPostId).get().then((doc) => {
      if (doc.exists) {
        const d = doc.data();
        document.getElementById("edit-title").value = d.title;
        document.getElementById("post-category").value = d.category || "General"; 
        document.getElementById("edit-desc").value = d.description || "";
        document.getElementById("edit-ingredients").value = (d.ingredients || []).join("\n");
        document.getElementById("edit-instructions").value = (d.instructions || []).join("\n");
        document.getElementById("edit-tips").value = (d.tips || []).join("\n");

        // MODULE 1 EXTENSION: POPULATE NUTRITION MAP INTO FORMS
        const nut = d.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
        document.getElementById("edit-calories").value = nut.calories || 0;
        document.getElementById("edit-protein").value = nut.protein || 0;
        document.getElementById("edit-carbs").value = nut.carbs || 0;
        document.getElementById("edit-fats").value = nut.fat || 0;

        // MODULE 1 EXTENSION: PRE-CHECK ACTIVE DIETARY LABELS
        const activeTags = d.dietaryTags || [];
        document.querySelectorAll('input[name="edit-diet-tags"]').forEach(cb => {
            cb.checked = activeTags.includes(cb.value);
        });
      }
    });
};

window.deletePost = async (id) => {
  // FIX: Swapped out browser native confirm box for our custom modal dialog box
  const confirmed = await window.customConfirm("Delete this post?");

  if (confirmed) {
      db.collection("posts").doc(id).delete().then(() => {
          document.getElementById("posts-feed").innerHTML = ""; 
          loadPosts(); 
      });
  }
};

window.toggleComments = (id) => {
  const s = document.getElementById(`comments-section-${id}`);
  const l = document.getElementById(`comments-list-${id}`);
  if (s.style.display === "none") {
    s.style.display = "block";
    db.collection("posts").doc(id).collection("comments").orderBy("createdAt", "asc").onSnapshot((snap) => {
        l.innerHTML = "";
        snap.forEach((d) => (l.innerHTML += `<div style="background:var(--bg-color); padding:8px; margin-bottom:5px; border-radius:4px;"><strong style="color:var(--accent-color);">${d.data().authorName}</strong><div>${d.data().text}</div></div>`));
      });
  } else { s.style.display = "none"; }
};

let isSharing = false;

window.sharePost = async (postId) => {
    // If a share is already active, ignore any double-clicks
    if (isSharing) return;
    isSharing = true;

    const title = document.getElementById(`title-${postId}`)?.innerText || "Recipeit";
    const text = `Check out this recipe: "${title}"`;
    const url = window.location.href;

    if (navigator.share) {
        try {
            // Wait for the native share sheet promise to fully resolve or reject
            await navigator.share({ title: "Recipeit", text, url });
        } catch (error) {
            // Catch and silence 'AbortError' since it just means the user cancelled the menu
            if (error.name !== 'AbortError') {
                console.error("Share failed:", error);
            }
        } finally {
            // ALWAYS unlock the button when finished
            isSharing = false;
        }
    } else {
        // Fallback for browsers that don't support native sharing (desktop Chrome/Firefox)
        try {
            await navigator.clipboard.writeText(`${text} - ${url}`);
            window.showToast("Link copied!", "success");
        } catch (err) {
            console.error("Clipboard copy failed:", err);
        } finally {
            isSharing = false;
        }
    }
};

window.togglePostMenu = (postId) => {
    const menu = document.getElementById(`menu-${postId}`);
    if (menu) {
        document.querySelectorAll('.post-menu-content').forEach(el => { if (el.id !== `menu-${postId}`) el.style.display = 'none'; });
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
};

window.addToShoppingList = (event, postId) => {
    if (event) {
        event.stopPropagation(); // Stop click from bubbling to the details wrapper
        event.preventDefault();
    }
    const user = auth.currentUser;
    if (!user) return window.showToast("Login needed", "error");
    db.collection("posts").doc(postId).get().then((doc) => {
        if (doc.exists) {
            const ingredients = doc.data().ingredients || [];
            if (ingredients.length === 0) return window.showToast("No ingredients found.", "error");
            db.collection("users").doc(user.uid).update({
                shoppingList: firebase.firestore.FieldValue.arrayUnion(...ingredients)
            }).then(() => window.showToast(`Added ${ingredients.length} items!`, "success"));
        }
    });
};

window.addEventListener('click', (e) => {
    if (!e.target.closest('.post-menu-btn') && !e.target.closest('.post-menu-content')) {
        document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
    }
});

// --- SEARCH PAGE LOGIC ---

window.setCategory = (cat) => {
    // 1. Visual Update
    const catSection = document.getElementById("category-section");
    const resultHeader = document.getElementById("search-results-header");
    const resultTitle = document.getElementById("results-title");
    
    if (catSection) catSection.style.display = "none"; // Hide grid
    if (resultHeader) resultHeader.style.display = "flex"; // Show header
    if (resultTitle) resultTitle.innerText = `${cat} Recipes`;

    // 2. Data Fetch
    const feedContainer = document.getElementById("posts-feed");
    feedContainer.innerHTML = `<div style="text-align:center; padding:40px;"><i class='bx bx-loader-alt bx-spin' style="font-size:2rem; color:var(--accent-color);"></i></div>`;
    
    db.collection("posts")
        .where("category", "==", cat)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get()
        .then((snap) => {
            feedContainer.innerHTML = "";
            if(snap.empty) {
                feedContainer.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-sec);'>No recipes found in this category.</div>";
                return;
            }
            snap.forEach(doc => {
                feedContainer.insertAdjacentHTML('beforeend', createPostCard(doc.data(), doc.id, auth.currentUser));
            });
        })
        .catch(err => {
            console.error(err);
            window.showToast("Error loading category", "error");
        });
};

window.resetSearch = () => {
    // Go back to category grid
    document.getElementById("category-section").style.display = "block";
    document.getElementById("search-results-header").style.display = "none";
    document.getElementById("posts-feed").innerHTML = ""; // Clear results
    document.getElementById("search-input").value = "";
};

window.performSearch = () => {
    const term = document.getElementById("search-input").value.toLowerCase();
    const cards = document.getElementsByClassName("post-card");
    
    // Simple client-side filter of loaded cards
    Array.from(cards).forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? "block" : "none";
    });
};

// Append directly to the end of src/views/feed.js

window.reportPost = (postId) => {
    db.collection("posts").doc(postId).update({
        reportCount: firebase.firestore.FieldValue.increment(1)
    })
    .then(() => {
        window.showToast("Post has been reported for evaluation.", "success");
        // Hide open dropdown menus
        document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
    })
    .catch(err => console.error("Report execution failed:", err));
};

window.adminDeletePost = async (postId) => {
    // FIX: Swapped out browser native confirm box for our custom modal dialog box
    const confirmed = await window.customConfirm("ADMIN CONTROL: Are you absolutely sure you want to permanently delete this post?");
    
    if (confirmed) {
        db.collection("posts").doc(postId).delete()
        .then(() => {
            window.showToast("Post successfully moderated and removed.", "success");
            if (window.location.hash === "#/admin") {
                window.loadAdminDashboard();
            } else {
                window.router("/dashboard");
            }
        })
        .catch(err => window.showToast("Moderation deletion failed: " + err.message, "error"));
    }
};

window.adminMarkSafe = async (postId) => {
    // Leverage your custom theme confirm dialog
    const confirmed = await window.customConfirm("ADMIN CONTROL: Are you sure you want to dismiss all user flags and mark this recipe as safe?");
    
    if (confirmed) {
        db.collection("posts").doc(postId).update({
            reportCount: 0
        })
        .then(() => {
            window.showToast("Recipe approved! Reports successfully cleared.", "success");
            
            // Instantly refresh the view context
            if (window.location.hash === "#/admin") {
                window.loadAdminDashboard();
            } else {
                window.router("/dashboard");
            }
        })
        .catch(err => window.showToast("Failed to clear flags: " + err.message, "error"));
    }
};

window.adminBanUser = async (targetUserId, userName) => {
    // FIX: Swapped out browser native confirm box for our custom modal dialog box
    const confirmed = await window.customConfirm(`ADMIN CONTROL: Suspend account permissions for ${userName}?`);
    
    if (confirmed) {
        db.collection("users").doc(targetUserId).set({
            isBanned: true
        }, { merge: true })
        .then(() => {
            window.showToast(`${userName} has been successfully suspended.`, "success");
            document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
        })
        .catch(err => window.showToast("Suspension execution error: " + err.message, "error"));
    }
};