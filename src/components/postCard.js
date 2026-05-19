const renderIngredients = (ingredients) => {
    if (!ingredients || ingredients.length === 0) return "<li>No ingredients listed.</li>";
    return ingredients.map(line => `<li>${line}</li>`).join("");
};

const renderCookingSteps = (instructions) => {
    if (!instructions || instructions.length === 0) return "<p>No instructions provided.</p>";
    return instructions.map((step, index) => 
        `<div class="cooking-step">
            <strong style="color:var(--accent-color); display:block; font-size:1rem; margin-bottom:5px;">STEP ${index + 1}</strong>
            ${step}
        </div>`
    ).join("");
};

export const createPostCard = (post, postId, currentUser) => {
    const uid = currentUser ? currentUser.uid : null;
    const date = post.createdAt ? post.createdAt.toDate().toDateString() : "Just now";
    const category = post.category || "General";

    // 1. Voting State
    const upvotes = post.upvotedBy || [];
    const downvotes = post.downvotedBy || [];
    const score = upvotes.length - downvotes.length;
    const isUpvoted = upvotes.includes(uid);
    const isDownvoted = downvotes.includes(uid);
    const upColor = isUpvoted ? "var(--accent-color)" : "var(--text-sec)";
    const downColor = isDownvoted ? "#7193ff" : "var(--text-sec)";
    const scoreColor = isUpvoted ? "var(--accent-color)" : isDownvoted ? "#7193ff" : "var(--text-main)";

    // 2. Saved State
    const isSaved = window.myBookmarks && window.myBookmarks.includes(postId);
    const saveIcon = isSaved ? "bxs-bookmark" : "bx-bookmark";
    const saveColor = isSaved ? "var(--accent-color)" : "var(--text-main)";

    // 3. Image Logic
    const imageHTML = post.imageUrl 
        ? `<div class="post-img-container"><img src="${post.imageUrl}" class="post-img"></div>`
        : `<div class="post-img-container"><i class='bx bx-dish post-placeholder-icon'></i></div>`;

    // SYSTEM ACCESS RIGHTS (Admin Panel Pipeline integration)
    const isAuthor = currentUser && currentUser.uid === post.authorId;
    const isAdmin = window.currentUserData && window.currentUserData.role === 'admin';

    // DYNAMIC DROPDOWN DRIVER INTERFACE
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

    // MODULE 2 FEATURE: EXTRACT AND MAP NUTRITIONAL PROPERTIES SAFELY
    const nut = post.nutrition || null;
    let nutritionBarHTML = "";
    if (nut && (nut.calories || nut.protein || nut.carbs || nut.fat)) {
        nutritionBarHTML = `
            <div class="post-macro-bar">
                <div class="macro-stat"> <span>${nut.calories || 0}</span> <small>kcal</small></div>
                <div class="macro-stat"> <span>${nut.protein || 0}</span><small>g Protein</small></div>
                <div class="macro-stat"> <span>${nut.carbs || 0}</span><small>g Carbs</small></div>
                <div class="macro-stat"> <span>${nut.fat || 0}</span><small>g Fats</small></div>
            </div>
        `;
    }

    // MODULE 2 FEATURE: GENERATE DIETARY PILL BADGES
    const tags = post.dietaryTags || [];
    let dietaryBadgesHTML = "";
    if (tags.length > 0) {
        dietaryBadgesHTML = tags.map(tag => {
            // Give specific dietary choices unique colors to stand out
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