export const createPostCard = (recipe) => {
    const card = document.createElement('div');
    card.classList.add('post-card'); // Swapped to post-card to match CSS

    const ingredientsList = recipe.ingredients 
        ? recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')
        : '<li>No ingredients listed</li>';

    card.innerHTML = `
        <div class="post-meta">
            <div class="post-meta-info">
                <img src="${recipe.authorPhoto || './default-avatar.png'}" alt="Author" class="author-pic" width="30" height="30" style="border-radius: 50%; object-fit: cover;">
                <span class="author-name" style="font-weight: 600;">${recipe.authorName || 'Anonymous Chef'}</span>
            </div>
            <span class="post-date" style="color: var(--text-sec); font-size: 0.8rem;">
                ${recipe.createdAt ? new Date(recipe.createdAt.toDate()).toLocaleDateString() : 'Just now'}
            </span>
        </div>
        
        <h3 class="post-title">${recipe.title}</h3>
        
        <div class="post-content">
            <div style="margin-bottom: 10px;">
                <span class="form-label">Ingredients</span>
                <ul style="margin-left: 20px;">${ingredientsList}</ul>
            </div>
            <div>
                <span class="form-label">Instructions</span>
                <p>${recipe.instructions}</p>
            </div>
        </div>
    `;

    return card;
};