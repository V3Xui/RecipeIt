import { auth, db } from './config.js';
// FIX: Corrected folder path mappings
import { updateNavbar, setupDropdownStyles, initTheme, listenForUnreadMessages } from './components/navBar.js';
import './services/auth.js';
import './views/feed.js';
import './views/profile.js';
import './router.js';
import './views/chat.js';

setupDropdownStyles();
initTheme();

// --- PWA SETUP ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/serviceWorker.js')
        .then(() => console.log('PWA Service Worker Registered'))
        .catch((err) => console.log('SW Failed:', err));
}

window.myBookmarks = [];

auth.onAuthStateChanged((user) => {
  updateNavbar(user);
  if (user) {
    listenForUnreadMessages(user.uid);

    if (["", "#/", "#/login", "#/register"].includes(window.location.hash)) {
      window.router("/dashboard");
    } else {
        const currentPath = window.location.hash.replace("#", "");
        window.router(currentPath);
    }

    db.collection("users").doc(user.uid).onSnapshot((doc) => {
        if (doc.exists) {
            window.myBookmarks = doc.data().savedRecipes || [];
            if (window.location.hash === "#/saved" && window.loadSavedPosts) window.loadSavedPosts(); 
        }
    });

    setTimeout(() => {
        const nameSpan = document.getElementById("user-name-display");
        if (nameSpan) nameSpan.innerText = user.displayName || user.email;
        const bioDisplay = document.getElementById("user-bio-display");
        if (bioDisplay) {
            db.collection("users").doc(user.uid).get().then((doc) => {
                if (doc.exists && doc.data().bio) {
                    bioDisplay.innerText = doc.data().bio;
                }
            });
        }
    }, 500);
  } else {
      // Force redirect to landing or login if unauthenticated
      window.router("/");
  }
});

const initialPath = window.location.hash.replace("#", "") || "/";
window.router(initialPath);