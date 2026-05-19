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
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-card">
                <h3><i class='bx bx-shield-quarter' style='color:var(--accent-color); font-size:1.3rem;'></i> System Control</h3>
                <p>${message}</p>
                <div class="modal-btn-group">
                    <button id="confirm-cancel-btn" class="modal-btn-cancel">Cancel</button>
                    <button id="confirm-ok-btn" class="modal-btn-confirm">Confirm</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        const cleanUpAndResolve = (result) => {
            modal.style.display = 'none';
            resolve(result);
        };

        // Event hooks listeners wire-ups
        modal.querySelector('#confirm-cancel-btn').onclick = () => cleanUpAndResolve(false);
        modal.querySelector('#confirm-ok-btn').onclick = () => cleanUpAndResolve(true);
        
        modal.onclick = (e) => {
            if (e.target === modal) cleanUpAndResolve(false);
        };
    });
};

// Bind directly to global execution layers to preserve legacy route hooks across views transitions
window.customConfirm = customConfirm;