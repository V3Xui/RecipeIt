import { auth, db } from './config.js';
import { updateNavbar, setupDropdownStyles, initTheme, listenForUnreadMessages } from './components/navBar.js';

import './services/auth.js';
import './controllers/feedController.js';
import './controllers/plannerController.js';
import './controllers/chatController.js';

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

let userProfileListenerUnsubscribe = null;

auth.onAuthStateChanged((user) => {
  updateNavbar(user);
  if (user) {
    listenForUnreadMessages(user.uid);

    // 🛡️ FIX: Track the listener and attach a fallback error handler
    userProfileListenerUnsubscribe = db.collection("users").doc(user.uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            window.myBookmarks = data.savedRecipes || [];
            window.currentUserData = {
                blockedUsers: [],
                blockedBy: [],
                ...data
            };

            // REAL-TIME BAN ENFORCEMENT ENGINE
            if (data.isBanned === true) {
                window.showToast("Your account has been suspended by a moderator.", "error");
                auth.signOut();
                window.router("/");
                return;
            }
        }
    }, (err) => console.warn("User profile listener suspended safely.", err.message));

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
      // 🛡️ FIX: Kill the listener streams immediately when the user signs out
      if (typeof userProfileListenerUnsubscribe === 'function') {
          userProfileListenerUnsubscribe();
          userProfileListenerUnsubscribe = null;
      }
      window.currentUserData = null;
      window.router("/");
  }
});

