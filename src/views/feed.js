import { auth, db } from '../config.js';
import { createPostCard } from '../components/postCard.js';
import { queryRecipesByCategory } from '../services/postService.js';

window.editingPostId = null;
window.currentCategory = "All"; 
let lastVisibleDoc = null;
let isFetching = false;
let hasMorePosts = true;

const getSkeletonFeed = () => `<div style="padding:20px; text-align:center; color:var(--text-sec);">Loading delicious recipes...</div>`;

export const loadPosts = () => {
    const feedContainer = document.getElementById("posts-feed");
    if (!feedContainer) return;

    feedContainer.innerHTML = "";
    lastVisibleDoc = null;
    isFetching = false;
    hasMorePosts = true;
    window.currentCategory = "All";
    window.activeTimelineDietFilter = null; 

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
    
    if (!lastVisibleDoc) feedContainer.innerHTML = getSkeletonFeed();

    let query = db.collection("posts").orderBy("createdAt", "desc").limit(5);
    if (lastVisibleDoc) query = query.startAfter(lastVisibleDoc);

    query.get().then((snap) => {
        if (!lastVisibleDoc) feedContainer.innerHTML = ""; 
        if (snap.empty) {
            hasMorePosts = false;
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
            const globalState = { myBookmarks: window.myBookmarks, currentUserData: window.currentUserData };
            feedContainer.insertAdjacentHTML('beforeend', createPostCard(doc.data(), doc.id, auth.currentUser, globalState));
        });
        isFetching = false;
    }).catch((error) => {
        console.error("Feed Error:", error);
        isFetching = false;
    });
};

window.setCategory = async (cat) => {
    window.currentCategory = cat;
    document.querySelectorAll(".filter-btn").forEach(btn => {
        const isActive = btn.innerText === cat;
        btn.style.backgroundColor = isActive ? "var(--accent-color)" : "var(--card-bg)";
        btn.style.color = isActive ? "white" : "var(--text-main)";
    });

    const feed = document.getElementById("posts-feed");
    if (!feed) return;

    if (cat !== "All") {
        window.onscroll = null; 
        feed.innerHTML = `<div style="text-align:center; padding:20px;">Loading ${cat}...</div>`;
        try {
            const snap = await queryRecipesByCategory(cat);
            feed.innerHTML = snap.empty ? "<p style='text-align:center; padding:20px;'>No recipes found.</p>" : "";
            snap.forEach(doc => {
                const globalState = { myBookmarks: window.myBookmarks, currentUserData: window.currentUserData };
                feed.insertAdjacentHTML('beforeend', createPostCard(doc.data(), doc.id, auth.currentUser, globalState));
            });
        } catch (err) {
            console.error(err);
        }
    } else {
        loadPosts(); 
    }
};

window.filterPosts = () => {
    const term = (document.getElementById("search-desktop")?.value || "").toLowerCase();
    document.querySelectorAll(".post-card").forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(term) ? "" : "none";
    });
};

window.activeCommentListeners = window.activeCommentListeners || {};

window.toggleComments = (id) => {
    const section = document.getElementById(`comments-section-${id}`);
    const list = document.getElementById(`comments-list-${id}`);
    if (!section || !list) return;

    if (section.style.display === "none" || !section.style.display) {
        section.style.display = "block";
        
        // Terminate any duplicate streaming listener on this card path
        if (typeof window.activeCommentListeners[id] === 'function') {
            window.activeCommentListeners[id]();
        }

        // Capture the unsubscribe reference returned by the Firestore SDK listener
        window.activeCommentListeners[id] = db.collection("posts").doc(id).collection("comments")
          .orderBy("createdAt", "asc")
          .onSnapshot((snap) => {
              list.innerHTML = "";
              snap.forEach((d) => {
                  list.innerHTML += `<div style="background:var(--bg-color); padding:8px; margin-bottom:5px; border-radius:4px;"><strong style="color:var(--accent-color);">${d.data().authorName}</strong><div>${d.data().text}</div></div>`;
              });
          }, (err) => {
              console.warn(`Comments snapshot stream for card ${id} safely suspended:`, err.message);
          });
    } else { 
        section.style.display = "none";
        if (typeof window.activeCommentListeners[id] === 'function') {
            window.activeCommentListeners[id]();
            delete window.activeCommentListeners[id];
        }
    }
};

window.submitUpdate = async () => {
    if (!window.editingPostId) return window.router("/dashboard");
    
    // Pass raw strings through our security input escaping utility
    const title = document.getElementById("edit-title").value.trim();
    const category = document.getElementById("post-category").value;
    const desc = document.getElementById("edit-desc").value.trim();
    
    const ingredients = document.getElementById("edit-ingredients").value.split('\n')
        .filter(l => l.trim() !== '');
    const instructions = document.getElementById("edit-instructions").value.split('\n')
        .filter(l => l.trim() !== '');
    const tips = document.getElementById("edit-tips").value.split('\n')
        .filter(l => l.trim() !== '');

    const calories = parseInt(document.getElementById("edit-calories").value) || 0;
    const protein = parseInt(document.getElementById("edit-protein").value) || 0;
    const carbs = parseInt(document.getElementById("edit-carbs").value) || 0;
    const fats = parseInt(document.getElementById("edit-fats").value) || 0;

    const dietaryTags = [];
    document.querySelectorAll('input[name="edit-diet-tags"]:checked').forEach(cb => dietaryTags.push(cb.value));

    if (!title) return window.showToast("Dish Name is required!", "error");

    const updateData = {
        title,
        category,
        description: desc,
        ingredients,
        instructions,
        tips,
        nutrition: { calories, protein, carbs, fat: fats },
        dietaryTags
    };

    const file = document.getElementById("edit-image").files[0];

    const commitUpdate = async (imageUrl) => {
        if (imageUrl) updateData.imageUrl = imageUrl;
        try {
            await db.collection("posts").doc(window.editingPostId).update(updateData);
            window.showToast("Changes saved successfully!", "success");
            window.editingPostId = null;
            window.router("/dashboard");
        } catch (err) {
            console.error("Recipe modification failure:", err);
            window.showToast("Failed to save changes: " + err.message, "error");
        }
    };

    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => commitUpdate(reader.result);
        reader.readAsDataURL(file);
    } else {
        await commitUpdate(null);
    }
};

export const loadEditForm = () => {
    if (!window.editingPostId) return window.router("/dashboard");
    
    db.collection("posts").doc(window.editingPostId).get().then((doc) => {
        if (doc.exists) {
            const d = doc.data();
            
            // 1. Populate Standard Culinary Fields
            document.getElementById("edit-title").value = d.title || "";
            document.getElementById("post-category").value = d.category || "General"; 
            document.getElementById("edit-desc").value = d.description || "";
            document.getElementById("edit-ingredients").value = (d.ingredients || []).join("\n");
            document.getElementById("edit-instructions").value = (d.instructions || []).join("\n");
            document.getElementById("edit-tips").value = (d.tips || []).join("\n");

            // 2. Populate Nutritional Form Inputs
            const nut = d.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
            document.getElementById("edit-calories").value = nut.calories || 0;
            document.getElementById("edit-protein").value = nut.protein || 0;
            document.getElementById("edit-carbs").value = nut.carbs || 0;
            document.getElementById("edit-fats").value = nut.fat || 0;

            // 3. Pre-check Active Dietary Classification Toggles
            const activeTags = d.dietaryTags || [];
            document.querySelectorAll('input[name="edit-diet-tags"]').forEach(cb => {
                cb.checked = activeTags.includes(cb.value);
            });
        }
    }).catch(err => {
        console.error("Failed to load edit details:", err);
        window.showToast("Could not load recipe data.", "error");
    });
};

window.openEditPage = (id) => { window.editingPostId = id; window.router("/edit"); };
window.submitUpdate = submitUpdate;
window.loadPosts = loadPosts;