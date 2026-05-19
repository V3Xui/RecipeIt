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

window.toggleComments = (id) => {
    const section = document.getElementById(`comments-section-${id}`);
    const list = document.getElementById(`comments-list-${id}`);
    if (section.style.display === "none" || !section.style.display) {
        section.style.display = "block";
        db.collection("posts").doc(id).collection("comments").orderBy("createdAt", "asc").onSnapshot((snap) => {
            list.innerHTML = "";
            snap.forEach((d) => {
                list.innerHTML += `<div style="background:var(--bg-color); padding:8px; margin-bottom:5px; border-radius:4px;"><strong style="color:var(--accent-color);">${d.data().authorName}</strong><div>${d.data().text}</div></div>`;
            });
        });
    } else { 
        section.style.display = "none"; 
    }
};

window.openEditPage = (id) => { window.editingPostId = id; window.router("/edit"); };
window.loadPosts = loadPosts;