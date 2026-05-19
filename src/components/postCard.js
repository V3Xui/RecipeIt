/**
 * Renders individual list items for post ingredients.
 * @param {string[]} ingredients 
 * @returns {string} HTML string list elements
 */
const renderIngredients = (ingredients) => {
    if (!ingredients || ingredients.length === 0) return "<li>No ingredients listed.</li>";
    return ingredients.map(line => `<li>${line}</li>`).join("");
};

/**
 * Renders interactive steps within cooking overlay modes.
 * @param {string[]} instructions 
 * @returns {string} HTML structured step layout blocks
 */
const renderCookingSteps = (instructions) => {
    if (!instructions || instructions.length === 0) return "<p>No instructions provided.</p>";
    return instructions.map((step, index) => 
        `<div class="cooking-step">
            <strong style="color:var(--accent-color); display:block; font-size:1rem; margin-bottom:5px;">STEP ${index + 1}</strong>
            ${step}
        </div>`
    ).join("");
};

/**
 * Pure Functional Presentation Factory to output a uniform post card card layout.
 * @param {object} post - Raw data payload from Firestore
 * @param {string} postId - Unique document identifier string
 * @param {object} currentUser - Active authenticated user reference
 * @param {object} globalState - Window/application configuration states
 * @returns {string} Completed HTML presentation block markup string
 */
export const createPostCard = (post, postId, currentUser, globalState = {}) => {
    const uid = currentUser ? currentUser.uid : null;
    const date = post.createdAt ? post.createdAt.toDate().toDateString() : "Just now";
    const category = post.category || "General";

    // 1. Voting Parameters Calculations
    const upvotes = post.upvotedBy || [];
    const downvotes = post.downvotedBy || [];
    const score = upvotes.length - downvotes.length;
    const isUpvoted = upvotes.includes(uid);
    const isDownvoted = downvotes.includes(uid);
    const upColor = isUpvoted ? "var(--accent-color)" : "var(--text-sec)";
    const downColor = isDownvoted ? "#7193ff" : "var(--text-sec)";
    const scoreColor = isUpvoted ? "var(--accent-color)" : isDownvoted ? "#7193ff" : "var(--text-main)";

    // 2. Saved Bookmarks Parameters Configurations
    const bookmarksList = globalState.myBookmarks || [];
    const isSaved = bookmarksList.includes(postId);
    const saveIcon = isSaved ? "bxs-bookmark" : "bx-bookmark";
    const saveColor = isSaved ? "var(--accent-color)" : "var(--text-main)";

    // 3. Media Presentation Sizing Maps
    const imageHTML = post.imageUrl 
        ? `<div class="post-img-container"><img src="${post.imageUrl}" class="post-img"></div>`
        : `<div class="post-img-container"><i class='bx bx-dish post-placeholder-icon'></i></div>`;

    // 4. System Access Rights Evaluations
    const isAuthor = currentUser && currentUser.uid === post.authorId;
    const userData = globalState.currentUserData || {};
    const isAdmin = userData.role === 'admin';

    // 5. Build Dropdown Action Content Arrays
    let menuOptions = `
        <div onclick="window.toggleBookmark('${postId}')" class="menu-item-styled">
            <i id="save-icon-${postId}" class='bx ${saveIcon}' style="font-size: 1.1rem; color: ${saveColor};"></i> 
            <span id="save-text-${postId}">${isSaved ? "Unsave" : "Save"}</span>
        </div>
    `;

    if (isAuthor) {
        menuOptions += `
            <div onclick="window.openEditPage('${postId}')" class="menu-item-styled"><i class='bx bx-pencil'></i> Edit Post</div>
            <div onclick="window.deletePost('${postId}')" class="menu-item-styled" style="color: #ff4500;"><i class='bx bx-trash'></i> Delete Post</div>
        `;
    } else {
        menuOptions += `
            <div onclick="window.reportPost('${postId}')" class="menu-item-styled" style="color: #ffc107;"><i class='bx bx-flag'></i> Report Content</div>
        `;
    }

    if (isAdmin) {
        menuOptions += `
            <div onclick="window.adminDeletePost('${postId}')" class="menu-item-styled" style="color: #ff4500; font-weight: bold; border-top: 1px solid var(--border-color);"><i class='bx bx-shield-x'></i> Moderate Delete</div>
        `;
        if (!isAuthor) {
            menuOptions += `
                <div onclick="window.adminBanUser('${post.authorId}', '${(post.authorName || 'User').replace(/'/g, "\\'")}')" class="menu-item-styled" style="color: #ff0000; font-weight: bold;"><i class='bx bx-user-x'></i> Suspend Creator</div>
            `;
        }
    }

    // 6. Nutritional Summary Rows Injections
    const nut = post.nutrition || null;
    let nutritionBarHTML = "";
    if (nut && (nut.calories || nut.protein || nut.carbs || nut.fat)) {
        nutritionBarHTML = `
            <div class="post-macro-bar">
                <div class="macro-stat">🔥 <span>${nut.calories || 0}</span> <small>kcal</small></div>
                <div class="macro-stat">💪 <span>${nut.protein || 0}</span><small>g P</small></div>
                <div class="macro-stat">🍞 <span>${nut.carbs || 0}</span><small>g C</small></div>
                <div class="macro-stat">🥑 <span>${nut.fat || 0}</span><small>g F</small></div>
            </div>
        `;
    }

    // 7. Dietary Pill Badges Configuration Fills
    const tags = post.dietaryTags || [];
    let dietaryBadgesHTML = "";
    if (tags.length > 0) {
        dietaryBadgesHTML = tags.map(tag => {
            let bgClass = "tag-default";
            if (tag === "Keto") bgClass = "tag-keto";
            if (tag === "Vegan") bgClass = "tag-vegan";
            if (tag === "Vegetarian") bgClass = "tag-vegetarian";
            return `<span class="post-diet-badge ${bgClass}">${tag}</span>`;
        }).join("");
    }

    return `
        <div id="cooking-mode-${postId}" class="cooking-mode-overlay">
            <div class="cooking-header">
                <h2 style="margin:0;">Cooking Mode</h2>
                <button class="close-cooking" onclick="document.getElementById('cooking-mode-${postId}').style.display='none'">Done Cooking</button>
            </div>
            <div style="max-width: 800px; margin: 0 auto; width: 100%;">
                ${renderCookingSteps(post.instructions)}
                <div style="text-align:center; margin-top:50px; color:#888;">Bon Appétit! 🍽️</div>
            </div>
        </div>

        <div class="post-card" data-category="${category}">
            <div class="post-meta">
                <div>
                    <span>Posted by <b onclick="window.router('/user/${post.authorId}')" style="cursor: pointer; color: var(--accent-color);">${post.authorName || post.authorEmail}</b></span>
                    <div class="post-meta-info">
                        <span class="post-date">${date}</span>
                        <span class="post-category-tag">${category}</span>
                        ${dietaryBadgesHTML}
                    </div>
                </div>
                <div style="position: relative;">
                    <button class="post-menu-btn" onclick="window.togglePostMenu('${postId}')"><i class='bx bx-dots-vertical-rounded' style="font-size: 1.4rem;"></i></button>
                    <div id="menu-${postId}" class="post-menu-content">
                        ${menuOptions}
                    </div>
                </div>
            </div>

            <div id="title-${postId}" class="post-title" style="margin-top: 10px; font-weight:bold; font-size:1.1rem;">${post.title}</div>
            
            ${nutritionBarHTML}
            ${imageHTML}
            
            <div class="post-content" style="margin-top:10px; color: var(--text-main);">${post.description || ""}</div>

            <details class="post-details">
                <summary>View Full Recipe</summary>
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
                    <button onclick="window.addToShoppingList(event, '${postId}')" class="details-btn"><i class='bx bx-plus'></i> Shopping List</button>
                    <button onclick="window.openMealPlannerModal(event, '${postId}', '${(post.title || 'Recipe').replace(/'/g, "\\'")}')" class="details-btn"><i class='bx bx-calendar-plus'></i> Plan Meal</button>
                    <button onclick="document.getElementById('cooking-mode-${postId}').style.display='flex'" class="details-btn primary"><i class='bx bx-play-circle'></i> Start Cooking</button>
                </div>
                <div style="margin-top:20px;">
                    <strong>Ingredients:</strong>
                    <ul style="margin-left:20px; color: var(--text-sec); margin-top:5px;">
                        ${renderIngredients(post.ingredients)}
                    </ul>
                </div>
                <div style="margin-top:20px;"><strong>Instructions:</strong><ol style="margin-left:20px; color: var(--text-sec);">${(post.instructions || []).map(i => `<li>${i}</li>`).join("")}</ol></div>
                <div style="margin-top:20px;"><strong>Tips:</strong><ul style="margin-left:20px; color: var(--text-sec);">${(post.tips || []).map(i => `<li>${i}</li>`).join("")}</ul></div>
            </details>
            
            <div class="post-actions">
                <button id="btn-up-${postId}" class="btn-vote" onclick="window.votePost('${postId}', 'up')" style="color: ${upColor}"><i class='bx bxs-up-arrow-circle' style="font-size: 1.5rem;"></i></button>
                <span id="score-${postId}" style="font-weight:bold; color: ${scoreColor}; font-size: 1rem; margin: 0 8px;">${score}</span>
                <button id="btn-down-${postId}" class="btn-vote" onclick="window.votePost('${postId}', 'down')" style="color: ${downColor}"><i class='bx bxs-down-arrow-circle' style="font-size: 1.5rem;"></i></button>
                
                <div style="margin-left: auto; display: flex; gap: 8px;">
                    <button class="action-btn" onclick="window.toggleComments('${postId}')" title="View Comments"><i class='bx bx-message-rounded'></i></button>
                    <button class="action-btn" onclick="window.sharePost('${postId}')" title="Share Recipe"><i class='bx bx-share-alt'></i></button>
                </div>
            </div>

            <div id="comments-section-${postId}" class="comments-section">
                <div class="comment-input-box">
                    <input type="text" id="input-${postId}" placeholder="Write a comment..." class="create-input" style="margin: 0; font-size: 0.9rem;">
                    <button onclick="window.addComment('${postId}')" style="padding: 5px 15px; font-size: 0.8rem; background: var(--accent-color); color: white; border: none; border-radius: 4px;">Send</button>
                </div>
                <div id="comments-list-${postId}"></div>
            </div>
        </div>
    `;
};