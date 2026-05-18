import { loginWithGoogle } from '../services/auth.js';

export const renderLogin = () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="login-container">
            <h1>Welcome to RecipeIt</h1>
            <p>Please sign in to continue.</p>
            <button id="btn-google-login">Sign in with Google</button>
        </div>
    `;

    // Attach the event listener to the button we just created
    const loginBtn = container.querySelector('#btn-google-login');
    loginBtn.addEventListener('click', async () => {
        await loginWithGoogle();
        // The router will automatically detect the login and redirect!
    });

    return container;
};