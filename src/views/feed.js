import { getFeedRecipes } from '../services/database.js';
import { createPostCard } from '../components/postCard.js';

export const renderFeed = async () => {
    const container = document.createElement('div');
    container.classList.add('dashboard-page');
    
    // 1. Paint the initial empty UI with a loading state
    container.innerHTML = `
        <div class="feed-header">
            <h1>Recent Recipes</h1>
            <p>Discover what the community is cooking.</p>
        </div>
        <div id="recipe-list" class="recipe-list">
            <p id="loading-text">Loading recipes...</p>
        </div>
    `;

    const listContainer = container.querySelector('#recipe-list');

    try {
        // 2. Fetch the data from Firebase
        const recipes = await getFeedRecipes(10);
        
        // 3. Clear the loading text
        listContainer.innerHTML = '';

        // 4. Handle the empty state
        if (recipes.length === 0) {
            listContainer.innerHTML = '<p>No recipes found. Be the first to post!</p>';
            return container;
        }

        // 5. Loop through the data and append the UI components
        recipes.forEach(recipe => {
            const card = createPostCard(recipe);
            listContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Feed Error:", error);
        listContainer.innerHTML = '<p>Error loading the feed. Please try again later.</p>';
    }

    return container;
};