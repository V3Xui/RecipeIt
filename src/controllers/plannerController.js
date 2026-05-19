import { auth } from '../config.js';
import { addMealToCalendar, deleteMealFromCalendar, fetchUserMealPlan } from '../services/plannerService.js';

/**
 * Assembles the date-selector popover panel modal to handle scheduler triggers.
 */
window.openMealPlannerModal = (event, postId, recipeTitle) => {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const user = auth.currentUser;
    if (!user) return window.showToast("Please log in to plan meals!", "error");

    let modal = document.getElementById('meal-planner-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'meal-planner-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayButtonsHTML = days.map(day => `
        <button onclick="window.saveToMealPlan('${postId}', '${recipeTitle.replace(/'/g, "\\'")}', '${day}')" 
                style="width:100%; background:var(--bg-color); color:var(--text-main); border:1px solid var(--border-color); text-align:left; padding:12px 15px; border-radius:8px; margin-bottom:6px; font-size:0.9rem; display:flex; justify-content:space-between; align-items:center;">
            <span>${day}</span> <i class='bx bx-chevron-right' style="color:var(--accent-color);"></i>
        </button>
    `).join("");

    modal.innerHTML = `
        <div class="modal-card" style="max-width:340px;">
            <h3><i class='bx bx-calendar-plus' style='color:var(--accent-color);'></i> Schedule Meal</h3>
            <p style="margin-bottom:15px; font-size:0.8rem; color:var(--text-sec);">Add "${recipeTitle}" to your daily health pipeline routines.</p>
            <div style="max-height:280px; overflow-y:auto;">
                ${dayButtonsHTML}
            </div>
            <button onclick="document.getElementById('meal-planner-modal').style.display='none'" 
                    style="width:100%; background:transparent; color:var(--text-sec); border:1px solid var(--border-color); margin-top:10px; font-size:0.85rem; padding:8px;">Cancel</button>
        </div>
    `;
    modal.style.display = 'flex';
};

/**
 * Triggers the calendar persistence routing logic sequence via our service layer.
 */
window.saveToMealPlan = async (postId, recipeTitle, day) => {
    const user = auth.currentUser;
    if (!user) return;
    document.getElementById('meal-planner-modal').style.display = 'none';

    try {
        // Fetch snapshot metrics directly from the specific card record to guarantee data safety
        window.firebase.firestore().collection("posts").doc(postId).get().then(async (doc) => {
            if (!doc.exists) return window.showToast("Recipe no longer exists.", "error");
            const d = doc.data();
            const nut = d.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
            
            await addMealToCalendar(user.uid, {
                postId, recipeTitle, dayOfWeek: day, ...nut
            });
            window.showToast(`Added to ${day}'s Meal Plan!`, "success");
        });
    } catch (err) {
        window.showToast("Planner save error: " + err.message, "error");
    }
};

/**
 * Removes a meal schedule entry and instantly refreshes the active planner dashboard display canvas.
 */
window.removeFromMealPlan = async (planId) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await deleteMealFromCalendar(user.uid, planId);
        window.showToast("Meal removed from schedule.", "normal");
        window.loadMealPlannerDashboard();
    } catch (err) {
        window.showToast("Removal failed: " + err.message, "error");
    }
};