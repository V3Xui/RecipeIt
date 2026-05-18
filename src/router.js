import { auth, db } from './config.js';
import { loadPosts, loadEditForm } from './views/feed.js';
import { loadAccountSettings, loadSavedPosts, loadShoppingList, loadPublicProfile, loadMenu } from './views/profile.js';

// --- HTML VIEW STRING DEFINITIONS ---
export const LoginView = `
    <div class="auth-page">
        <h1>Log In</h1>
        <input type="email" id="login-email" placeholder="Email">
        <input type="password" id="login-pass" placeholder="Password">
        <button onclick="window.loginUser()">Log In</button>
        <p style="margin-top:15px; font-size:0.9rem;">Don't have an account? <a onclick="window.router('/register')" style="color:var(--accent-color); cursor:pointer;">Sign Up</a></p>
    </div>
`;

export const RegisterView = `
    <div class="auth-page">
        <h1>Sign Up</h1>
        <input type="text" id="reg-username" placeholder="Username">
        <input type="email" id="reg-email" placeholder="Email">
        <input type="password" id="reg-pass" placeholder="Password">
        <button onclick="window.registerUser()">Sign Up</button>
        <p style="margin-top:15px; font-size:0.9rem;">Already have an account? <a onclick="window.router('/login')" style="color:var(--accent-color); cursor:pointer;">Log In</a></p>
    </div>
`;

export const DashboardView = `
    <div id="refresh-loader" style="height:0px; overflow:hidden; text-align:center; transition: height 0.2s; opacity:0; background:var(--card-bg);">
        <i class='bx bx-loader-alt bx-spin' style='font-size:1.5rem; margin-top:15px; color:var(--accent-color);'></i>
    </div>
    <div class="dashboard-page">
        <div class="category-bar" style="display:flex; gap:10px; overflow-x:auto; padding:5px 0; margin-bottom:15px; scrollbar-width: none;">
            <button class="filter-btn" onclick="window.setCategory('All')" style="background:var(--accent-color); color:white; border-radius:20px; padding:6px 15px;">All</button>
            <button class="filter-btn" onclick="window.setCategory('Breakfast')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); border-radius:20px; padding:6px 15px;">Breakfast</button>
            <button class="filter-btn" onclick="window.setCategory('Lunch')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); border-radius:20px; padding:6px 15px;">Lunch</button>
            <button class="filter-btn" onclick="window.setCategory('Dinner')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); border-radius:20px; padding:6px 15px;">Dinner</button>
        </div>
        <div style="margin-bottom:15px;">
            <input type="text" id="search-desktop" placeholder="🔍 Search recipes..." oninput="window.filterPosts()" class="create-input" style="margin:0; padding:10px 15px; border-radius:20px;">
        </div>
        <div id="posts-feed"></div>
    </div>
`;

export const CreateView = `
    <div class="create-post-page" style="padding:20px;">
        <h2 style="margin-bottom:15px;">Share a Recipe</h2>
        <span class="form-label">Dish Name</span>
        <input type="text" id="post-title" class="create-input" placeholder="e.g., Garlic Butter Shrimp">
        
        <span class="form-label">Category</span>
        <select id="post-category" class="create-input" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:12px; background:var(--input-bg); color:var(--text-main); margin-bottom:20px;">
            <option value="General">General</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
        </select>

        <span class="form-label">Description</span>
        <textarea id="post-desc" class="create-input" placeholder="Tell us about your dish..." rows="3"></textarea>

        <span class="form-label">Ingredients (One per line)</span>
        <textarea id="post-ingredients" class="create-input" placeholder="e.g.\n1 lb Shrimp\n4 tbsp Butter" rows="4"></textarea>

        <span class="form-label">Instructions (One per line)</span>
        <textarea id="post-instructions" class="create-input" placeholder="e.g.\nClean the shrimp\nMelt the butter" rows="4"></textarea>

        <span class="form-label">Tips (One per line)</span>
        <textarea id="post-tips" class="create-input" placeholder="e.g.\nDon't overcook the shrimp" rows="2"></textarea>

        <span class="form-label">Upload Photo</span>
        <input type="file" id="post-image" accept="image/*" style="margin-bottom:20px;">

        <button onclick="window.submitPost()" style="width:100%; padding:12px; border-radius:30px;">Publish Recipe</button>
    </div>
`;

export const EditView = `
    <div class="create-post-page" style="padding:20px;">
        <h2 style="margin-bottom:15px;">Edit Recipe</h2>
        <span class="form-label">Dish Name</span>
        <input type="text" id="edit-title" class="create-input">
        
        <span class="form-label">Category</span>
        <select id="post-category" class="create-input" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:12px; background:var(--input-bg); color:var(--text-main); margin-bottom:20px;">
            <option value="General">General</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
        </select>

        <span class="form-label">Description</span>
        <textarea id="edit-desc" class="create-input" rows="3"></textarea>

        <span class="form-label">Ingredients (One per line)</span>
        <textarea id="edit-ingredients" class="create-input" rows="4"></textarea>

        <span class="form-label">Instructions (One per line)</span>
        <textarea id="edit-instructions" class="create-input" rows="4"></textarea>

        <span class="form-label">Tips (One per line)</span>
        <textarea id="edit-tips" class="create-input" rows="2"></textarea>

        <span class="form-label">Update Photo</span>
        <input type="file" id="edit-image" accept="image/*" style="margin-bottom:20px;">

        <button onclick="window.submitUpdate()" style="width:100%; padding:12px; border-radius:30px;">Save Changes</button>
    </div>
`;

export const SearchView = `
    <div class="dashboard-page" style="padding:20px;">
        <div id="category-section">
            <h2 style="margin-bottom:15px;">Browse Categories</h2>
            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:15px; margin-bottom:20px;">
                <div onclick="window.setCategory('Breakfast')" style="background:var(--card-bg); border:1px solid var(--border-color); padding:25px; text-align:center; border-radius:12px; cursor:pointer; font-weight:600;"><i class='bx bx-coffee-togo' style='font-size:2rem; color:var(--accent-color); display:block; margin-bottom:5px;'></i>Breakfast</div>
                <div onclick="window.setCategory('Lunch')" style="background:var(--card-bg); border:1px solid var(--border-color); padding:25px; text-align:center; border-radius:12px; cursor:pointer; font-weight:600;"><i class='bx bx-bowl-rice' style='font-size:2rem; color:var(--accent-color); display:block; margin-bottom:5px;'></i>Lunch</div>
                <div onclick="window.setCategory('Dinner')" style="background:var(--card-bg); border:1px solid var(--border-color); padding:25px; text-align:center; border-radius:12px; cursor:pointer; font-weight:600;"><i class='bx bx-fridge' style='font-size:2rem; color:var(--accent-color); display:block; margin-bottom:5px;'></i>Dinner</div>
                <div onclick="window.setCategory('General')" style="background:var(--card-bg); border:1px solid var(--border-color); padding:25px; text-align:center; border-radius:12px; cursor:pointer; font-weight:600;"><i class='bx bx-restaurant' style='font-size:2rem; color:var(--accent-color); display:block; margin-bottom:5px;'></i>General</div>
            </div>
        </div>
        
        <div id="search-results-header" style="display:none; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h2 id="results-title">Recipes</h2>
            <button onclick="window.resetSearch()" style="background:transparent; color:var(--text-main); border:1px solid var(--border-color); padding:5px 15px; border-radius:20px;">Back</button>
        </div>

        <div style="margin-bottom:15px; display:flex; gap:10px;">
            <input type="text" id="search-input" placeholder="🔍 Search within category..." oninput="window.performSearch()" class="create-input" style="margin:0; padding:10px 15px; border-radius:20px;">
        </div>

        <div id="posts-feed"></div>
    </div>
`;

export const MessagesView = `
    <div class="dashboard-page" style="padding:15px;">
        <h2 style="margin-bottom:15px;">Inbox</h2>
        <div id="inbox-list"></div>
    </div>
`;

export const ChatRoomView = `
    <div class="dashboard-page" style="display:flex; flex-direction:column; height:calc(100vh - 120px); padding:10px;">
        <div style="display:flex; align-items:center; padding:10px; border-bottom:1px solid var(--border-color); background:var(--card-bg); border-radius:8px 8px 0 0;">
            <button onclick="window.router('/messages')" style="background:transparent; color:var(--text-main); padding:5px; margin-right:10px; border:none; cursor:pointer;"><i class='bx bx-arrow-back' style='font-size:1.3rem;'></i></button>
            <h3 id="chat-header-name">Chef</h3>
        </div>
        <div id="chat-messages" style="flex:1; overflow-y:auto; padding:15px; background:var(--bg-color); border:1px solid var(--border-color); border-top:none; border-bottom:none; display:flex; flex-direction:column;"></div>
        <div style="display:flex; gap:10px; padding:10px; background:var(--card-bg); border-radius:0 0 8px 8px; border:1px solid var(--border-color);">
            <input type="text" id="chat-input" placeholder="Type a message..." class="create-input" style="margin:0; flex:1; border-radius:20px;">
            <button onclick="window.sendChatMessage()" style="border-radius:50%; width:45px; height:45px; padding:0; display:flex; align-items:center; justify-content:center; cursor:pointer;"><i class='bx bx-send' style='font-size:1.2rem;'></i></button>
        </div>
    </div>
```;

export const AccountSettingsView = `
    <div class="create-post-page" style="padding:20px;">
        <h2>Edit Profile</h2>
        <div style="text-align:center; margin:15px 0;">
            <img id="edit-avatar-preview" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid var(--accent-color);"><br>
            <input type="file" id="edit-avatar" accept="image/*" onchange="window.previewAvatar(this)" style="margin-top:10px; font-size:0.8rem;">
        </div>
        <span class="form-label">Display Name</span>
        <input type="text" id="edit-name" class="create-input">
        <span class="form-label">Bio</span>
        <textarea id="edit-bio" class="create-input" rows="3"></textarea>
        <span class="form-label">Change Password</span>
        <input type="password" id="edit-pass" class="create-input" placeholder="Leave blank to keep current">
        <button onclick="window.saveProfile()" style="width:100%; padding:12px; border-radius:30px;">Save Profile</button>
    </div>
`;

export const SavedRecipesView = `
    <div class="dashboard-page" style="padding:15px;">
        <h2 style="margin-bottom:15px;">Saved Recipes</h2>
        <div id="saved-posts-feed"></div>
    </div>
`;

export const ShoppingListView = `
    <div class="dashboard-page" style="padding:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h2>Shopping List</h2>
            <button onclick="window.toggleSelectionMode()" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); padding:5px 12px; border-radius:20px; font-size:0.85rem; cursor:pointer;">Manage</button>
        </div>
        <div id="add-item-row" style="display:flex; gap:10px; margin-bottom:15px;">
            <input type="text" id="manual-item-input" placeholder="Add custom item..." class="create-input" style="margin:0; flex:1;">
            <button onclick="window.addManualItem()" style="border-radius:8px; padding:0 15px; cursor:pointer;">Add</button>
        </div>
        <div id="bulk-action-row" style="display:none; justify-content:space-between; align-items:center; background:var(--card-bg); padding:10px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:15px;">
            <span id="selected-count" style="font-size:0.9rem; font-weight:600;">0 selected</span>
            <div style="display:flex; gap:8px;">
                <button onclick="window.toggleSelectAll()" style="background:var(--bg-color); color:var(--text-main); border:1px solid var(--border-color); padding:5px 10px; font-size:0.8rem; border-radius:4px; cursor:pointer;">Select All</button>
                <button onclick="window.deleteSelectedItems()" style="background:#ff4500; color:white; padding:5px 10px; font-size:0.8rem; border-radius:4px; border:none; cursor:pointer;">Delete</button>
            </div>
        </div>
        <div id="shopping-list-items"></div>
    </div>
`;

export const PublicProfileView = `
    <div class="dashboard-page" style="padding:15px;">
        <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:20px; border-radius:10px; text-align:center; margin-bottom:20px;">
            <img id="profile-avatar" style="width:80px; height:80px; border-radius:50%; object-fit:cover; margin-bottom:10px; border:2px solid var(--accent-color);">
            <h2 id="profile-name">Chef</h2>
            <p id="profile-bio" style="color:var(--text-sec); font-style:italic; font-size:0.9rem; margin:10px 0;"></p>
            <div style="display:flex; justify-content:center; gap:25px; margin:15px 0; font-size:0.9rem;">
                <div><b id="profile-post-count">0</b> <span style="color:var(--text-sec);">Recipes</span></div>
                <div><b id="profile-follower-count">0</b> <span style="color:var(--text-sec);">Followers</span></div>
            </div>
            <div id="follow-action-area"></div>
        </div>
        <h3>Recipes</h3>
        <div id="user-posts-feed" style="margin-top:15px;"></div>
    </div>
`;

export const NotificationsView = `
    <div class="dashboard-page" style="padding:15px;">
        <h2 style="margin-bottom:15px;">Notifications</h2>
        <div id="notif-list" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:10px; overflow:hidden;"></div>
    </div>
`;

export const MenuView = `
    <div class="dashboard-page" style="padding:15px;">
        <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:20px; border-radius:10px; display:flex; align-items:center; gap:15px; margin-bottom:20px;">
            <img id="menu-avatar" style="width:55px; height:55px; border-radius:50%; object-fit:cover;">
            <div>
                <h3 id="menu-name">Chef</h3>
                <a onclick="window.router('/account')" style="font-size:0.85rem; color:var(--accent-color); cursor:pointer; font-weight:600;">View & Edit Profile</a>
            </div>
        </div>
        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:10px; overflow:hidden; display:flex; flex-direction:column;">
            <div onclick="window.router('/saved')" class="menu-item-styled" style="border-bottom:1px solid var(--border-color);"><i class='bx bx-bookmark' style='font-size:1.2rem; color:var(--accent-color);'></i> Saved Recipes</div>
            <div onclick="window.router('/shopping-list')" class="menu-item-styled" style="border-bottom:1px solid var(--border-color);"><i class='bx bx-list-check' style='font-size:1.2rem; color:var(--accent-color);'></i> Shopping List</div>
            <div onclick="window.router('/notifications')" class="menu-item-styled" style="border-bottom:1px solid var(--border-color);"><i class='bx bx-bell' style='font-size:1.2rem; color:var(--accent-color);'></i> Notifications</div>
            <div onclick="window.toggleTheme()" class="menu-item-styled" style="border-bottom:1px solid var(--border-color); justify-content:space-between; cursor:pointer;">
                <div style="display:flex; align-items:center; gap:10px;"><i class='bx bx-palette' style='font-size:1.2rem; color:var(--accent-color);'></i> Toggle Theme</div>
                <i id="menu-theme-icon" class='bx bx-moon'></i>
            </div>
            <div onclick="window.logoutUser()" class="menu-item-styled" style="color:#ff4500;"><i class='bx bx-log-out' style='font-size:1.2rem;'></i> Log Out</div>
        </div>
    </div>
`;

// --- GLOBAL UTILS ---
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

window.loadNotifications = () => {
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
                  </div>
              </div>`;
              
              if (!data.read) doc.ref.update({ read: true });
          });
      });
};

// --- ROUTER LOGIC ---
const routes = {
  "/": `<div class="landing-page"><h1>Welcome to Recipeit</h1><p>Your minimalist cookbook.</p><br><button onclick="window.router('/login')">Get Started</button></div>`,
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
  "/menu": MenuView
};

window.router = (path) => {
  window.onscroll = null;
  const app = document.getElementById("app");
  const nav = document.getElementById("navbar");
  const isMobile = window.innerWidth <= 768;

  if (path === "/" || path === "/login" || path === "/register") {
    nav.style.display = "none";
    app.style.marginTop = "0px";
    app.style.paddingBottom = "0px";
  } else {
    nav.style.display = "flex";
    if (isMobile) {
        app.style.marginTop = "0px";
        app.style.paddingBottom = "80px";
    } else {
        app.style.marginTop = "60px"; 
        app.style.paddingBottom = "20px";
    }
  }

  if (path.startsWith("/user/")) {
      const userId = path.split("/")[2]; 
      renderView(routes["/user"], isMobile);
      if (window.loadPublicProfile) window.loadPublicProfile(userId);
      return; 
  }

  if (path.startsWith("/messages/")) {
      const chatId = path.split("/")[2];
      renderView(routes["/chat-room"], isMobile);
      if (window.loadChatRoom) window.loadChatRoom(chatId);
      return;
  }

  window.history.pushState({}, path, window.location.origin + "#" + path);
  renderView(routes[path] || routes["/"], isMobile);

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
  if (path === "/messages") window.loadInbox();
  if (path === "/notifications") window.loadNotifications();
  if (path === "/menu") loadMenu();
};

const renderView = (html, isMobile) => {
    const app = document.getElementById("app");
    if (!isMobile) {
        app.innerHTML = `<div style="max-width: 1000px; margin: 0 auto; width: 100%; position: relative;">${html}</div>`;
    } else {
        app.innerHTML = html;
    }
};

window.onpopstate = () => window.router(window.location.hash.replace("#", "") || "/");