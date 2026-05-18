import { logoutUser } from '../services/auth.js';
import { navigateTo } from '../router.js';

export const renderNavBar = (user) => {
    const nav = document.getElementById('navbar');

    if (!user) {
        nav.innerHTML = ''; 
        return;
    }

    // Updated to match your style.css classes perfectly
    nav.innerHTML = `
        <div class="nav-brand" data-link href="/feed">
            <i class='bx bx-book-open'></i> RecipeIt
        </div>
        <div class="nav-items">
            <a href="/feed" class="nav-link" data-link>
                <i class='bx bx-home-alt'></i> <span class="nav-text">Feed</span>
            </a>
            <a href="/profile" class="nav-link" data-link>
                <i class='bx bx-user'></i> <span class="nav-text">Profile</span>
            </a>
            <button id="nav-logout-btn" class="nav-link btn-icon" style="border:none; cursor:pointer;" title="Logout">
                <i class='bx bx-log-out'></i>
            </button>
        </div>
    `;

    const links = nav.querySelectorAll('[data-link]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            // Ensure we grab the href from either the <a> or the brand <div>
            const targetUrl = link.getAttribute('href') || link.closest('a').getAttribute('href');
            if (targetUrl) navigateTo(targetUrl);
        });
    });

    nav.querySelector('#nav-logout-btn').addEventListener('click', logoutUser);
};