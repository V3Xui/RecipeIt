import { auth, db } from '../config.js';
import { createPost } from '../services/postService.js';
import { reportPost, purgePost, clearPostFlags, banUserAccount } from '../services/adminService.js';
import { createPostCard } from '../components/postCard.js';

// Centralize local UI feed states
let lastVisibleDoc = null;
let isFetching = false;
let hasMorePosts = true;

/**
 * Handles the extraction and publishing structure for new recipes.
 */
window.submitPost = async () => {
    const user = auth.currentUser;
    const title = document.getElementById("post-title").value;
    const category = document.getElementById("post-category").value; 
    const desc = document.getElementById("post-desc").value;
    const ingredients = document.getElementById("post-ingredients").value.split('\n').filter(l => l.trim() !== '');
    const instructions = document.getElementById("post-instructions").value.split('\n').filter(l => l.trim() !== '');
    const tips = document.getElementById("post-tips").value.split('\n').filter(l => l.trim() !== '');
    const file = document.getElementById("post-image").files[0];

    const calories = parseInt(document.getElementById("post-calories").value) || 0;
    const protein = parseInt(document.getElementById("post-protein").value) || 0;
    const carbs = parseInt(document.getElementById("post-carbs").value) || 0;
    const fats = parseInt(document.getElementById("post-fats").value) || 0;

    const dietaryTags = [];
    document.querySelectorAll('input[name="post-diet-tags"]:checked').forEach(cb => dietaryTags.push(cb.value));

    if (!user || !title) return window.showToast("Dish Name required!", "error");

    const proceedSave = async (url) => {
        try {
            await createPost({
                title, category, description: desc, ingredients, instructions, tips, imageUrl: url,
                authorName: user.displayName || user.email, authorEmail: user.email, authorId: user.uid,
                nutrition: { calories, protein, carbs, fat: fats },
                dietaryTags
            });
            window.showToast("Recipe shared!", "success");
            window.router("/dashboard");
        } catch (err) {
            window.showToast("Failed to share recipe: " + err.message, "error");
        }
    };

    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => proceedSave(reader.result);
        reader.readAsDataURL(file);
    } else { proceedSave(null); }
};

/**
 * Executes a reporting action on a post, notifying administrators via a reportCount tracking system field increment.
 */
window.reportPost = async (postId) => {
    try {
        await reportPost(postId);
        window.showToast("Post has been reported for evaluation.", "success");
        document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
    } catch (err) {
        console.error("Report step failure:", err);
    }
};

/**
 * Handles the administrative purge request with custom dialog confirmation wrapping.
 */
window.adminDeletePost = async (postId) => {
    const confirmed = await window.customConfirm("ADMIN CONTROL: Are you absolutely sure you want to permanently delete this post?");
    if (confirmed) {
        try {
            await purgePost(postId);
            window.showToast("Post successfully moderated and removed.", "success");
            if (window.location.hash === "#/admin") {
                window.loadAdminDashboard();
            } else {
                window.router("/dashboard");
            }
        } catch (err) {
            window.showToast("Moderation deletion failed: " + err.message, "error");
        }
    }
};

/**
 * Dismisses user-submitted flags and retains the recipe inside standard search queues.
 */
window.adminMarkSafe = async (postId) => {
    const confirmed = await window.customConfirm("ADMIN CONTROL: Are you sure you want to dismiss all user flags and mark this recipe as safe?");
    if (confirmed) {
        try {
            await clearPostFlags(postId);
            window.showToast("Recipe approved! Reports successfully cleared.", "success");
            if (window.location.hash === "#/admin") {
                window.loadAdminDashboard();
            } else {
                window.router("/dashboard");
            }
        } catch (err) {
            window.showToast("Failed to clear flags: " + err.message, "error");
        }
    }
};

/**
 * Suspends account workflow operations for problematic profiles.
 */
window.adminBanUser = async (targetUserId, userName) => {
    const confirmed = await window.customConfirm(`ADMIN CONTROL: Suspend account permissions for ${userName}?`);
    if (confirmed) {
        try {
            await banUserAccount(targetUserId);
            window.showToast(`${userName} has been successfully suspended.`, "success");
            document.querySelectorAll('.post-menu-content').forEach(el => el.style.display = 'none');
        } catch (err) {
            window.showToast("Suspension execution error: " + err.message, "error");
        }
    }
};

/**
 * Sweeps the home dashboard display state locally, filtering cards to match preferences.
 */
window.activeTimelineDietFilter = null;
window.toggleTimelineDiet = (diet) => {
    const chip = document.getElementById(`chip-${diet}`);
    const allChips = document.querySelectorAll('.diet-chip-btn');
    
    if (window.activeTimelineDietFilter === diet) {
        window.activeTimelineDietFilter = null;
        if (chip) chip.classList.remove('active-chip');
    } else {
        window.activeTimelineDietFilter = diet;
        allChips.forEach(c => c.classList.remove('active-chip'));
        if (chip) chip.classList.add('active-chip');
    }

    document.querySelectorAll('.post-card').forEach(card => {
        if (!window.activeTimelineDietFilter) {
            card.style.display = "block";
            return;
        }
        const badges = card.querySelectorAll('.post-diet-badge');
        let match = false;
        badges.forEach(b => {
            if (b.innerText === window.activeTimelineDietFilter.toUpperCase()) match = true;
        });
        card.style.display = match ? "block" : "none";
    });
};