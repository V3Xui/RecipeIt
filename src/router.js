import { loadPosts, loadEditForm } from './feed.js';
import { loadAccountSettings, loadSavedPosts, loadShoppingList, loadPublicProfile, loadMenu } from './profile.js';
import { auth, db } from './config.js';

// --- IMPORT VIEWS ---
import { DashboardView } from './views/Dashboard.js';
import { LoginView, RegisterView } from './views/Auth.js';
import { CreateView, EditView } from './views/Create.js';
import { MessagesView, ChatRoomView } from './views/Chat.js';
import { AccountSettingsView, SavedRecipesView, ShoppingListView, PublicProfileView, NotificationsView, MenuView } from './views/Profile.js';
import { SearchView } from './views/Search.js';

// --- GLOBAL UTILS (Toast & Notifications) ---
window.showToast = (message, type = "normal") => {
    let container = document.getElementById('toast-box');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-box';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

const loadNotifications = () => {
    const user = auth.currentUser;
    if (!user) return;
    const list = document.getElementById("notif-list");
    
    db.collection("users").doc(user.uid).collection("notifications")
      .orderBy("createdAt", "desc").limit(20)
      .onSnapshot((snap) => {
          if (!list) return;
          list.innerHTML = "";
          if (snap.empty) {
              list.innerHTML = "<p style='text-align:center; color:var(--text-sec); padding:20px;'>No notifications yet.</p>";
              return;
          }
          snap.forEach((doc) => {
              const data = doc.data();
              let icon = "bx-bell";
              if (data.type === "like") icon = "bxs-heart";
              if (data.type === "comment") icon = "bxs-message-rounded";
              if (data.type === "follow") icon = "bxs-user-plus";
              
              const color = data.type === "like" ? "#ff4500" : (data.type === "follow" ? "#2196f3" : "var(--accent-color)");
              const readStyle = data.read ? "opacity: 0.7;" : "background: var(--bg-color); font-weight: bold;";

              list.innerHTML += `
              <div onclick="window.router('${data.link}')" style="display:flex; align-items:center; padding:15px; border-bottom:1px solid var(--border-color); cursor:pointer; ${readStyle}">
                  <div style="width:40px; height:40px; border-radius:50%; background:${color}20; display:flex; align-items:center; justify-content:center; margin-right:15px;">
                      <i class='bx ${icon}' style="color:${color}; font-size:1.2rem;"></i>
                  </div>
                  <div>
                      <div style="font-size:0.95rem;"><strong>${data.senderName}</strong> ${data.text}</div>
                      <div style="font-size:0.8rem; color:var(--text-sec); margin-top:3px;">Just now</div>
                  </div>
              </div>`;
              
              if (!data.read) doc.ref.update({ read: true });
          });
      });
};
window.loadNotifications = loadNotifications;

// --- ROUTER LOGIC ---
const routes = {
  "/": `<div class="landing-page"><h1>Welcome to Recipeit</h1><p>Your minimalist cookbook.</p></div>`,
  "/login": LoginView,
  "/register": RegisterView,
  "/dashboard": DashboardView,
  "/search": SearchView,
  "/create": CreateView,
  "/edit": EditView,
  "/account": AccountSettingsView,
  "/saved": SavedRecipesView,
  "/shopping-list": ShoppingListView,
  "/user": PublicProfileView,
  "/messages": MessagesView,
  "/chat-room": ChatRoomView,
  "/notifications": NotificationsView,
  "/menu": MenuView // <--- NEW ROUTE
};

window.router = (path) => {
  window.onscroll = null;
  const app = document.getElementById("app");
  const nav = document.getElementById("navbar");
  const isMobile = window.innerWidth <= 768;

  // 1. Navigation Visibility & Top Spacing
  if (path === "/login" || path === "/register") {
    nav.style.display = "none";
    app.style.marginTop = "0px";
    app.style.paddingBottom = "0px";
  } else {
    // Desktop:
    nav.style.display = "flex";
    if (isMobile) {
        app.style.marginTop = "0px";
        app.style.paddingBottom = "80px";
    } else {
        // CHANGED: Reduced to 60px to remove the gap
        app.style.marginTop = "60px"; 
        app.style.paddingBottom = "20px";
    }
  }

  // 2. Dynamic Route Handling
  if (path.startsWith("/user/")) {
      const userId = path.split("/")[2]; 
      renderView(routes["/user"], isMobile); // Use helper
      if (window.loadPublicProfile) window.loadPublicProfile(userId);
      return; 
  }

  if (path.startsWith("/messages/")) {
      const chatId = path.split("/")[2];
      renderView(routes["/chat-room"], isMobile); // Use helper
      if (window.loadChatRoom) window.loadChatRoom(chatId);
      return;
  }

  // 3. Render Static Route
  window.history.pushState({}, path, window.location.origin + "#" + path);
  renderView(routes[path] || routes["/"], isMobile); // Use helper

  // 4. Post-Render Logic
  if (path === "/dashboard") {
      loadPosts();
      setTimeout(() => {
          const dot = document.getElementById("dashboard-notif-dot");
          if (dot && window.hasUnreadNotifications) dot.style.display = "block";
      }, 50);
  }
  if (path === "/account") loadAccountSettings();
  if (path === "/saved") loadSavedPosts();
  if (path === "/shopping-list") loadShoppingList();
  if (path === "/edit") loadEditForm();
  if (path === "/messages") import('./chat.js').then(module => module.loadInbox());
  if (path === "/notifications") window.loadNotifications();
  if (path === "/menu") window.loadMenu();
};

// --- NEW HELPER: Ensures Uniform Width on Web ---
const renderView = (html, isMobile) => {
    const app = document.getElementById("app");
    // If Web: Wrap in 1000px container. If Mobile: Use full width.
    if (!isMobile) {
        app.innerHTML = `<div style="max-width: 1000px; margin: 0 auto; width: 100%; position: relative;">${html}</div>`;
    } else {
        app.innerHTML = html;
    }
};

window.onpopstate = () => window.router(window.location.hash.replace("#", "") || "/");