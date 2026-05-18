import { auth, db } from './config.js';
import { updateNavbar, setupDropdownStyles, initTheme, listenForUnreadMessages } from './navBar.js';
import './auth.js';
import './feed.js';
import './profile.js';
import './router.js';
import './chat.js';

setupDropdownStyles();
initTheme();

// --- NEW: PWA SETUP ---
// 1. Inject Manifest Link dynamically
const link = document.createElement('link');
link.rel = 'manifest';
navigator.serviceWorker.register('./sw.js')
document.head.appendChild(link);

// 2. Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('PWA Service Worker Registered'))
        .catch((err) => console.log('SW Failed:', err));
}
// ----------------------

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
                    bioDisplay.style.color = "#666";
                    bioDisplay.style.fontStyle = "italic";
                }
            });
        }
    }, 500);
  }
});

const initialPath = window.location.hash.replace("#", "") || "/";
window.router(initialPath);

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // Start your app logic here (e.g., initializing your router.js)
    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
}