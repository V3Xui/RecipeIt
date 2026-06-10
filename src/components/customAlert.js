/**
 * Generates an asynchronous custom modal confirmation box styled for dark mode themes.
 * @param {string} message - Content prompt description text
 * @returns {Promise<boolean>} Resolves true on user confirmation click, false on cancellation dismissals
 */
export const customConfirm = (message) => {
    return new Promise((resolve) => {
        let modal = document.getElementById('custom-confirm-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-confirm-modal';
            // Inject safe basic styles inline directly to make it 100% immune to external CSS anomalies
            modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter:blur(3px); z-index:99999; display:none; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;";
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:var(--card-bg, #1e1e1e); border:1px solid var(--border-color, #333); padding:25px; border-radius:16px; max-width:400px; width:100%; box-shadow:0 10px 25px rgba(0,0,0,0.5); color:var(--text-main, #fff); text-align:center;">
                <h3 style="margin:0 0 12px 0; font-size:1.2rem; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class='bx bx-shield-quarter' style='color:var(--accent-color, #ff4500); font-size:1.5rem;'></i> System Control
                </h3>
                <p style="margin:0 0 20px 0; font-size:0.95rem; color:var(--text-sec, #aaa); line-height:1.5;">${message}</p>
                <div style="display:flex; justify-content:center; gap:12px;">
                    <button id="confirm-cancel-btn" style="flex:1; padding:10px 16px; border-radius:8px; background:transparent; border:1px solid var(--border-color, #444); color:var(--text-main, #fff); font-weight:600; cursor:pointer;">Cancel</button>
                    <button id="confirm-ok-btn" style="flex:1; padding:10px 16px; border-radius:8px; background:var(--accent-color, #ff4500); border:none; color:#fff; font-weight:600; cursor:pointer;">Confirm</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        const cleanUpAndResolve = (result) => {
            modal.style.display = 'none';
            resolve(result);
        };

        // Event hooks listeners wire-ups securely attached
        modal.querySelector('#confirm-cancel-btn').onclick = () => cleanUpAndResolve(false);
        modal.querySelector('#confirm-ok-btn').onclick = () => cleanUpAndResolve(true);
        
        modal.onclick = (e) => {
            if (e.target === modal) cleanUpAndResolve(false);
        };
    });
};

// Bind directly to global execution layers to preserve legacy route hooks across views transitions
window.customConfirm = customConfirm;