import { renderLogin } from './views/login.js';
import { renderFeed } from './views/feed.js';

const appContainer = document.getElementById('app');

const routes = {
    '/': renderLogin,
    '/feed': renderFeed,
};

export const navigateTo = (url) => {
    history.pushState(null, null, url);
    router(window.currentUser); 
};

export const router = async (user) => {
    let path = window.location.pathname;
    
    // NORMALIZE: Treat /public/, /public/index.html, and / as the same root
    if (path === '/' || path.includes('public') || path.endsWith('index.html')) {
        path = '/';
    }

    console.log(`🚦 Normalized Path: ${path} | User: ${user ? 'Logged In' : 'Logged Out'}`);

    if (!user && path !== '/') {
        navigateTo('/');
        return;
    }

    if (user && path === '/') {
        console.log("🚀 Redirecting authenticated user to /feed");
        navigateTo('/feed');
        return;
    }

    const renderFunction = routes[path] || routes['/'];
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = ''; 
    appContainer.appendChild(await renderFunction());
};

window.addEventListener('popstate', () => {
    router(window.currentUser); 
});