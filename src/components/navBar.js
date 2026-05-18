import { auth, db } from '../config.js';

export const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
};

window.toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    const icon = document.getElementById('theme-icon');
    if(icon) icon.className = target === 'dark' ? 'bx bx-sun' : 'bx bx-moon';
};

export const setupDropdownStyles = () => {
    const style = document.createElement('style');
    style.innerHTML = `
        .dropdown { position: relative; display: inline-block; }
        .dropdown-content { display: none; position: absolute; right: 0; background-color: var(--card-bg); border: 1px solid var(--border-color); min-width: 180px; box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2); z-index: 1000; border-radius: 8px; overflow: hidden; }
        .dropdown-content a { color: var(--text-main); padding: 12px 16px; text-decoration: none; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 0.9rem; }
        .dropdown-content a:hover { background-color: var(--bg-color); }
        .dropdown:hover .dropdown-content { display: block; }
        
        .nav-badge { background-color: #ff4500; color: white; font-size: 0.65rem; font-weight: bold; padding: 2px 5px; border-radius: 10px; position: absolute; top: -5px; right: -5px; display: none; border: 2px solid var(--nav-bg); }
        
        /* REMOVED .nav-search styles since removed the bar */
        
        @media (max-width: 768px) {
            .dropdown-content { bottom: 100%; top: auto; right: 0; margin-bottom: 10px; }
            nav { z-index: 9999 !important; background-color: var(--nav-bg) !important; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); }
        }
    `;
    document.head.appendChild(style);
};

export const updateNavbar = (user) => {
  const nav = document.getElementById("navbar");
  const theme = localStorage.getItem('theme') || 'light';
  const themeIcon = theme === 'dark' ? 'bx bx-sun' : 'bx bx-moon';

  if (user) {
    nav.innerHTML = `
    <div class="nav-brand" onclick="window.router('/dashboard')"> Recipeit </div>
    
    <div style="flex: 1;"></div> 

    <div class="nav-items">
        <a class="nav-link" onclick="window.router('/dashboard')">
            <i class='bx bx-home-alt-2'></i> <span class="nav-text">Home</span>
        </a>

        <a class="nav-link" onclick="window.router('/search')">
            <i class='bx bx-search'></i>
            <span class="nav-text">Search</span>
        </a>
        
        <a class="nav-link" onclick="window.router('/create')">
            <i class='bx bx-plus-circle'></i> <span class="nav-text">Create</span>
        </a>

        <a class="nav-link" onclick="window.router('/messages')" style="position: relative;">
            <i class='bx bx-message-rounded-dots'></i> 
            <span class="nav-text">Messages</span>
            <span id="nav-msg-badge" class="nav-badge">0</span>
        </a>
        
        <a class="nav-link" onclick="window.router('/menu')">
            <i class='bx bx-user-circle'></i>
            <span class="nav-text">Profile</span>
        </a>
    </div>`;
  } else {
    nav.innerHTML = `
    <div class="nav-brand" onclick="window.router('/')"> Recipeit </div>
    <div class="nav-items">
        <a class="nav-link" onclick="window.toggleTheme()"><i id="theme-icon" class='${themeIcon}'></i></a>
        <a class="nav-link" onclick="window.router('/login')">Log In</a>
        <a class="nav-link btn-primary" onclick="window.router('/register')">Sign Up</a>
    </div>`;
  }
};

export const listenForUnreadMessages = (userId) => {
    // 1. Chat Messages Badge
    db.collection("chats")
      .where("unreadFor", "array-contains", userId)
      .onSnapshot((snap) => {
          const count = snap.size;
          const badge = document.getElementById("nav-msg-badge");
          if (badge) {
              if (count > 0) {
                  badge.style.display = "block";
                  badge.innerText = count > 9 ? "9+" : count;
              } else {
                  badge.style.display = "none";
              }
          }
      });

    // 2. Activity Notifications Dot
    db.collection("users").doc(userId).collection("notifications")
      .where("read", "==", false)
      .onSnapshot((snap) => {
          const hasUnread = !snap.empty;
          window.hasUnreadNotifications = hasUnread; 
          const dot = document.getElementById("dashboard-notif-dot");
          if (dot) dot.style.display = hasUnread ? "block" : "none";
      });
};