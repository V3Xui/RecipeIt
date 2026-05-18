import { listenToAuthChanges, checkRedirectLogin } from './services/auth.js';
import { router } from './router.js';
import { renderNavBar } from './components/navBar.js';

window.currentUser = null;

async function startApp() {
    // FORCE the app to wait for Google's redirect result
    await checkRedirectLogin();

    // Now start the observer which will trigger the router
    listenToAuthChanges((user) => {
        console.log("Auth State Changed. User is:", user ? user.email : "Logged Out");
        window.currentUser = user;
        renderNavBar(user);
        router(user);
    });
}

startApp();