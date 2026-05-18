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

    // FIX: Set up real-time metadata syncing for roles and active bans
    db.collection("users").doc(user.uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            window.myBookmarks = data.savedRecipes || [];
            window.currentUserData = data; // Save role info globally

            // REAL-TIME BAN ENFORCEMENT ENGINE
            if (data.isBanned === true) {
                window.showToast("Your account has been suspended by a moderator.", "error");
                auth.signOut();
                window.router("/");
                return;
            }
        }
    });

    if (["", "#/", "#/login", "#/register"].includes(window.location.hash)) {
      window.router("/dashboard");
    } else {
        const currentPath = window.location.hash.replace("#", "");
        window.router(currentPath);
    }

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
      window.currentUserData = null;
      window.router("/");
  }
});