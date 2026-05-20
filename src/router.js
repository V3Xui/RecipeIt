import { auth, db } from './config.js';
import { loadPosts, loadEditForm } from './views/feed.js';
import { loadAccountSettings, loadSavedPosts, loadShoppingList, loadPublicProfile, loadMenu } from './views/profile.js';

// --- HTML VIEW STRING DEFINITIONS ---
export const LoginView = `
    <div class="auth-page">
        <h1>Log In</h1>
        <input type="email" id="login-email" placeholder="Email">
        <input type="password" id="login-pass" placeholder="Password">
        <button onclick="window.loginUser()" style="width:100%;">Log In</button>
        
        <div style="margin: 15px 0; text-align: center; color: var(--text-sec); font-size: 0.9rem;">OR</div>
        
        <button onclick="window.loginWithGoogle()" style="width:100%; background: #4285F4; color: white; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <i class='bx bxl-google' style="font-size: 1.3rem;"></i> Continue with Google
        </button>

        <p style="margin-top:15px; font-size:0.9rem;">Don't have an account? <a onclick="window.router('/register')" style="color:var(--accent-color); cursor:pointer;">Sign Up</a></p>
    </div>
`;

export const RegisterView = `
    <div class="auth-page">
        <h1>Sign Up</h1>
        <input type="text" id="reg-username" placeholder="Username">
        <input type="email" id="reg-email" placeholder="Email">
        <input type="password" id="reg-pass" placeholder="Password">
        <button onclick="window.registerUser()" style="width:100%;">Sign Up</button>
        
        <div style="margin: 15px 0; text-align: center; color: var(--text-sec); font-size: 0.9rem;">OR</div>
        
        <button onclick="window.loginWithGoogle()" style="width:100%; background: #4285F4; color: white; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <i class='bx bxl-google' style="font-size: 1.3rem;"></i> Sign up with Google
        </button>

        <p style="margin-top:15px; font-size:0.9rem;">Already have an account? <a onclick="window.router('/login')" style="color:var(--accent-color); cursor:pointer;">Log In</a></p>
    </div>
`;

export const DashboardView = `
    <div id="refresh-loader" style="height:0px; overflow:hidden; text-align:center; transition: height 0.2s; opacity:0; background:var(--card-bg);">
        <i class='bx bx-loader-alt bx-spin' style='font-size:1.5rem; margin-top:15px; color:var(--accent-color);'></i>
    </div>
    <div class="dashboard-page" style="padding: 15px;">
        <div class="category-bar" style="display:flex; gap:10px; overflow-x:auto; padding:5px 0; margin-bottom:15px; scrollbar-width: none;">
            <button class="filter-btn" onclick="window.setCategory('All')" style="background:var(--accent-color); color:white; border-radius:20px; padding:6px 15px;">All</button>
            <button class="filter-btn" onclick="window.setCategory('Appetizer')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); border-radius:20px; padding:6px 15px;">Appetizer</button>
            <button class="filter-btn" onclick="window.setCategory('Breakfast')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); border-radius:20px; padding:6px 15px;">Breakfast</button>
            <button class="filter-btn" onclick="window.setCategory('Lunch')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); border-radius:20px; padding:6px 15px;">Lunch</button>
            <button class="filter-btn" onclick="window.setCategory('Dinner')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); border-radius:20px; padding:6px 15px;">Dinner</button>
            <button class="filter-btn" onclick="window.setCategory('Dessert')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); border-radius:20px; padding:6px 15px;">Dessert</button>
        </div>
        <div style="margin-bottom:12px;">
            <input type="text" id="search-desktop" placeholder="🔍 Search recipes..." oninput="window.filterPosts()" class="create-input" style="margin:0; padding:10px 15px; border-radius:20px;">
        </div>

        <div class="timeline-diet-bar" style="display:flex; gap:8px; overflow-x:auto; margin-bottom:15px; scrollbar-width:none; padding-bottom:2px;">
            <span style="font-size:0.8rem; color:var(--text-sec); display:flex; align-items:center; font-weight:600; white-space:nowrap; margin-right:4px;">✨ Preferences:</span>
            <button class="diet-chip-btn" id="chip-Keto" onclick="window.toggleTimelineDiet('Keto')">Keto</button>
            <button class="diet-chip-btn" id="chip-Vegan" onclick="window.toggleTimelineDiet('Vegan')">Vegan</button>
            <button class="diet-chip-btn" id="chip-Vegetarian" onclick="window.toggleTimelineDiet('Vegetarian')">Vegetarian</button>
            <button class="diet-chip-btn" id="chip-Gluten-Free" onclick="window.toggleTimelineDiet('Gluten-Free')">Gluten-Free</button>
            <button class="diet-chip-btn" id="chip-Low-Sodium" onclick="window.toggleTimelineDiet('Low-Sodium')">Low-Sodium</button>
        </div>

        <div id="posts-feed"></div>
    </div>
`;

export const CreateView = `
    <div class="create-post-page" style="padding:20px;">
        <h2 style="margin-bottom:15px;">Share a Recipe</h2>
        <span class="form-label">Dish Name</span>
        <input type="text" id="post-title" class="create-input" placeholder="e.g., Garlic Butter Shrimp">
        
        <span class="form-label">Category</span>
        <select id="post-category" class="create-input" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:12px; background:var(--input-bg); color:var(--text-main); margin-bottom:20px;">
            <option value="General">General</option>
            <option value="Appetizer">Appetizer</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Dessert">Dessert</option>
        </select>

        <span class="form-label">Nutritional Summary</span>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
            <div>
                <span style="font-size: 0.7rem; color: var(--text-sec); display: block; margin-bottom: 4px; font-weight: bold;">Calories (kcal)</span>
                <input type="number" id="post-calories" placeholder="0" min="0" class="create-input" style="margin:0; padding:10px;">
            </div>
            <div>
                <span style="font-size: 0.7rem; color: var(--text-sec); display: block; margin-bottom: 4px; font-weight: bold;">Protein (g)</span>
                <input type="number" id="post-protein" placeholder="0" min="0" class="create-input" style="margin:0; padding:10px;">
            </div>
            <div>
                <span style="font-size: 0.7rem; color: var(--text-sec); display: block; margin-bottom: 4px; font-weight: bold;">Carbs (g)</span>
                <input type="number" id="post-carbs" placeholder="0" min="0" class="create-input" style="margin:0; padding:10px;">
            </div>
            <div>
                <span style="font-size: 0.7rem; color: var(--text-sec); display: block; margin-bottom: 4px; font-weight: bold;">Fats (g)</span>
                <input type="number" id="post-fats" placeholder="0" min="0" class="create-input" style="margin:0; padding:10px;">
            </div>
        </div>

        <span class="form-label">Dietary Classification (Select all that apply)</span>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 25px;">
            <label class="diet-toggle-label">
                <input type="checkbox" name="post-diet-tags" value="Keto" style="display:none;">
                <span class="diet-toggle-btn">Keto</span>
            </label>
            <label class="diet-toggle-label">
                <input type="checkbox" name="post-diet-tags" value="Vegan" style="display:none;">
                <span class="diet-toggle-btn">Vegan</span>
            </label>
            <label class="diet-toggle-label">
                <input type="checkbox" name="post-diet-tags" value="Vegetarian" style="display:none;">
                <span class="diet-toggle-btn">Vegetarian</span>
            </label>
            <label class="diet-toggle-label">
                <input type="checkbox" name="post-diet-tags" value="Gluten-Free" style="display:none;">
                <span class="diet-toggle-btn">Gluten-Free</span>
            </label>
            <label class="diet-toggle-label">
                <input type="checkbox" name="post-diet-tags" value="Low-Sodium" style="display:none;">
                <span class="diet-toggle-btn">Low-Sodium</span>
            </label>
        </div>

        <span class="form-label">Description</span>
        <textarea id="post-desc" class="create-input" placeholder="Tell us about your dish..." rows="3"></textarea>

        <span class="form-label">Ingredients (One per line)</span>
        <textarea id="post-ingredients" class="create-input" placeholder="e.g.\n1 lb Shrimp\n4 tbsp Butter" rows="4"></textarea>

        <span class="form-label">Instructions (One per line)</span>
        <textarea id="post-instructions" class="create-input" placeholder="e.g.\nClean the shrimp\nMelt the butter" rows="4"></textarea>

        <span class="form-label">Tips (One per line)</span>
        <textarea id="post-tips" class="create-input" placeholder="e.g.\nDon't overcook the shrimp" rows="2"></textarea>

        <span class="form-label">Upload Photo</span>
        <input type="file" id="post-image" accept="image/*" style="margin-bottom:20px;">

        <button onclick="window.submitPost()" style="width:100%; padding:12px; border-radius:30px;">Publish Recipe</button>
    </div>
`;

export const EditView = `
    <div class="create-post-page" style="padding:20px;">
        <h2 style="margin-bottom:15px;">Edit Recipe</h2>
        <span class="form-label">Dish Name</span>
        <input type="text" id="edit-title" class="create-input">
        
        <span class="form-label">Category</span>
        <select id="post-category" class="create-input" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:12px; background:var(--input-bg); color:var(--text-main); margin-bottom:20px;">
            <option value="General">General</option>
            <option value="Appetizer">Appetizer</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Dessert">Dessert</option>
        </select>

        <span class="form-label">Nutritional Summary</span>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
            <div>
                <span style="font-size: 0.7rem; color: var(--text-sec); display: block; margin-bottom: 4px; font-weight: bold;">Calories (kcal)</span>
                <input type="number" id="edit-calories" min="0" class="create-input" style="margin:0; padding:10px;">
            </div>
            <div>
                <span style="font-size: 0.7rem; color: var(--text-sec); display: block; margin-bottom: 4px; font-weight: bold;">Protein (g)</span>
                <input type="number" id="edit-protein" min="0" class="create-input" style="margin:0; padding:10px;">
            </div>
            <div>
                <span style="font-size: 0.7rem; color: var(--text-sec); display: block; margin-bottom: 4px; font-weight: bold;">Carbs (g)</span>
                <input type="number" id="edit-carbs" min="0" class="create-input" style="margin:0; padding:10px;">
            </div>
            <div>
                <span style="font-size: 0.7rem; color: var(--text-sec); display: block; margin-bottom: 4px; font-weight: bold;">Fats (g)</span>
                <input type="number" id="edit-fats" min="0" class="create-input" style="margin:0; padding:10px;">
            </div>
        </div>

        <span class="form-label">Dietary Classification (Select all that apply)</span>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 25px;">
            <label class="diet-toggle-label">
                <input type="checkbox" name="edit-diet-tags" value="Keto" style="display:none;">
                <span class="diet-toggle-btn">Keto</span>
            </label>
            <label class="diet-toggle-label">
                <input type="checkbox" name="edit-diet-tags" value="Vegan" style="display:none;">
                <span class="diet-toggle-btn">Vegan</span>
            </label>
            <label class="diet-toggle-label">
                <input type="checkbox" name="edit-diet-tags" value="Vegetarian" style="display:none;">
                <span class="diet-toggle-btn">Vegetarian</span>
            </label>
            <label class="diet-toggle-label">
                <input type="checkbox" name="edit-diet-tags" value="Gluten-Free" style="display:none;">
                <span class="diet-toggle-btn">Gluten-Free</span>
            </label>
            <label class="diet-toggle-label">
                <input type="checkbox" name="edit-diet-tags" value="Low-Sodium" style="display:none;">
                <span class="diet-toggle-btn">Low-Sodium</span>
            </label>
        </div>

        <span class="form-label">Description</span>
        <textarea id="edit-desc" class="create-input" rows="3"></textarea>

        <span class="form-label">Ingredients (One per line)</span>
        <textarea id="edit-ingredients" class="create-input" rows="4"></textarea>

        <span class="form-label">Instructions (One per line)</span>
        <textarea id="edit-instructions" class="create-input" rows="4"></textarea>

        <span class="form-label">Tips (One per line)</span>
        <textarea id="edit-tips" class="create-input" rows="2"></textarea>

        <span class="form-label">Update Photo</span>
        <input type="file" id="edit-image" accept="image/*" style="margin-bottom:20px;">

        <button onclick="window.submitUpdate()" style="width:100%; padding:12px; border-radius:30px;">Save Changes</button>
    </div>
`;

export const AdminView = `
    <div class="dashboard-page" style="padding:15px;">
        <h2 style="margin-bottom:5px;"><i class='bx bx-shield-quarter' style="color:var(--accent-color);"></i> Moderation Panel</h2>
        <p style="color:var(--text-sec); font-size:0.85rem; margin-bottom:15px;">Review active user flags and reported recipes below.</p>
        <div id="admin-reports-feed"></div>
    </div>
`;

export const SearchView = `
    <div class="dashboard-page" style="padding: 15px;">
        <div id="category-section">
            <h2 style="margin-bottom: 12px; font-size: 1.2rem;">Browse Course</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
                <div onclick="window.setCategory('Appetizer')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-cheese' style='font-size: 1.5rem; color: var(--accent-color); display: block; margin-bottom: 3px;'></i>Appetizer
                </div>
                <div onclick="window.setCategory('Breakfast')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-coffee-togo' style='font-size: 1.5rem; color: var(--accent-color); display: block; margin-bottom: 3px;'></i>Breakfast
                </div>
                <div onclick="window.setCategory('Lunch')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-bowl-rice' style='font-size: 1.5rem; color: var(--accent-color); display: block; margin-bottom: 3px;'></i>Lunch
                </div>
                <div onclick="window.setCategory('Dinner')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-fridge' style='font-size: 1.5rem; color: var(--accent-color); display: block; margin-bottom: 3px;'></i>Dinner
                </div>
                <div onclick="window.setCategory('Dessert')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-cake' style='font-size: 1.5rem; color: var(--accent-color); display: block; margin-bottom: 3px;'></i>Dessert
                </div>
                <div onclick="window.setCategory('General')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-restaurant' style='font-size: 1.5rem; color: var(--accent-color); display: block; margin-bottom: 3px;'></i>General
                </div>
            </div>

            <h2 style="margin-bottom: 12px; font-size: 1.2rem; border-top: 1px solid var(--border-color); padding-top: 15px;">Browse by Diet</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                <div onclick="window.setDietaryFilter('Keto')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-shield' style='font-size: 1.5rem; color: #ff642e; display: block; margin-bottom: 3px;'></i>Keto
                </div>
                <div onclick="window.setDietaryFilter('Vegan')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-leaf' style='font-size: 1.5rem; color: #4caf50; display: block; margin-bottom: 3px;'></i>Vegan
                </div>
                <div onclick="window.setDietaryFilter('Vegetarian')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-circle-quarter' style='font-size: 1.5rem; color: #009688; display: block; margin-bottom: 3px;'></i>Vegetarian
                </div>
                <div onclick="window.setDietaryFilter('Gluten-Free')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-cookie' style='font-size: 1.5rem; color: var(--accent-color); display: block; margin-bottom: 3px;'></i>Gluten-Free
                </div>
                <div onclick="window.setDietaryFilter('Low-Sodium')" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 12px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">
                    <i class='bx bx-water' style='font-size: 1.5rem; color: #2196f3; display: block; margin-bottom: 3px;'></i>Low-Sodium
                </div>
            </div>
        </div>
        
        <div id="search-results-header" style="display: none; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 id="results-title" style="font-size: 1.3rem;">Recipes</h2>
            <button onclick="window.resetSearch()" style="background: transparent; color: var(--text-main); border: 1px solid var(--border-color); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem;">Back</button>
        </div>

        <div style="margin-bottom: 15px; display: flex; gap: 10px;">
            <input type="text" id="search-input" placeholder="🔍 Search within results..." oninput="window.performSearch()" class="create-input" style="margin: 0; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">
        </div>

        <div id="posts-feed"></div>
    </div>
`;

export const MessagesView = `
    <div class="dashboard-page" style="padding:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 style="margin:0;">Inbox</h2>
            <button onclick="window.openCreateGroupModal()" style="padding:6px 14px; font-size:0.85rem; border-radius:20px; display:flex; align-items:center; gap:5px;"><i class='bx bx-group'></i> New Group</button>
        </div>

        <div style="margin-bottom:15px;">
            <input type="text" id="inbox-search-bar" placeholder="🔍 Search conversations..." oninput="window.handleSearchInbox()" class="create-input" style="margin:0; padding:10px 15px; border-radius:20px;">
        </div>

        <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
            <button id="msg-tab-active" onclick="window.switchInboxTab('active')" style="background:var(--accent-color); color:white; border:none; padding:5px 15px; font-size:0.8rem; border-radius:15px; cursor:pointer; font-weight:600;">Active</button>
            <button id="msg-tab-requests" onclick="window.switchInboxTab('requests')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); padding:5px 15px; font-size:0.8rem; border-radius:15px; cursor:pointer; font-weight:600;">Requests</button>
            <button id="msg-tab-archived" onclick="window.switchInboxTab('archived')" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); padding:5px 15px; font-size:0.8rem; border-radius:15px; cursor:pointer; font-weight:600;">Archived</button>
        </div>

        <div id="inbox-list" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>
`;

export const ChatRoomView = `
    <div class="dashboard-page" style="display:flex; flex-direction:column; height:calc(100vh - 120px); padding:10px; position:relative;">
        
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 15px; border-bottom:1px solid var(--border-color); background:var(--card-bg); border-radius:8px 8px 0 0; position:relative; z-index:10;">
            <div style="display:flex; align-items:center;">
                <button onclick="window.router('/messages')" style="background:transparent; color:var(--text-main); padding:5px; margin-right:10px; border:none; cursor:pointer;">
                    <i class='bx bx-arrow-back' style='font-size:1.3rem;'></i>
                </button>
                <h3 id="chat-header-name" style="margin:0; font-size:1.1rem;">Chef</h3>
            </div>
            
            <div style="position:relative;">
                <button onclick="window.toggleChatInfoMenu(event)" style="background:transparent; color:var(--text-main); border:none; cursor:pointer; padding:5px; display:flex; align-items:center;">
                    <i class='bx bx-info-circle' style='font-size:1.4rem; color:var(--accent-color);'></i>
                </button>
                
                <div id="chat-info-dropdown" style="display:none; position:absolute; top:100%; right:0; background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; width:180px; box-shadow:0 4px 12px var(--shadow); margin-top:5px; overflow:hidden; z-index:100;">
                    <div id="info-menu-profile" class="menu-item-styled" style="border-bottom:1px solid var(--border-color); font-size:0.85rem; padding:10px 12px;">
                        <i class='bx bx-user' style="color:var(--accent-color);"></i> View Profile
                    </div>
                    <div id="info-menu-members" class="menu-item-styled" style="border-bottom:1px solid var(--border-color); font-size:0.85rem; padding:10px 12px; display:none;">
                        <i class='bx bx-group' style="color:var(--accent-color);"></i> View Members
                    </div>
                    <div id="info-menu-mute" class="menu-item-styled" style="border-bottom:1px solid var(--border-color); font-size:0.85rem; padding:10px 12px;">
                        <i class='bx bx-bell-off'></i> Mute Channel
                    </div>
                    <div id="info-menu-clear" class="menu-item-styled" style="border-bottom:1px solid var(--border-color); font-size:0.85rem; padding:10px 12px; color:#ff9800;">
                        <i class='bx bx-eraser'></i> Clear History
                    </div>
                    <div id="info-menu-block" class="menu-item-styled" style="font-size:0.85rem; padding:10px 12px; color:#ff4500; font-weight:bold;">
                        <i class='bx bx-user-x'></i> Block User
                    </div>
                </div>
            </div>
        </div>
        
        <div id="chat-messages" style="flex:1; overflow-y:auto; padding:15px; background:var(--bg-color); border:1px solid var(--border-color); border-top:none; border-bottom:none; display:flex; flex-direction:column;"></div>
        
        <div style="display:flex; gap:10px; padding:10px; background:var(--card-bg); border-radius:0 0 8px 8px; border:1px solid var(--border-color);">
            <input type="text" id="chat-input" placeholder="Type a message..." class="create-input" style="margin:0; flex:1; border-radius:20px;">
            <button onclick="window.sendChatMessage()" style="border-radius:50%; width:45px; height:45px; padding:0; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <i class='bx bx-send' style='font-size:1.2rem;'></i>
            </button>
        </div>

        <div id="group-members-modal" class="modal-overlay" style="display:none; z-index:200;">
            <div class="modal-card" style="max-width:380px; width:90%;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                    <h3 style="margin:0; font-size:1.1rem;"><i class='bx bx-group' style="color:var(--accent-color);"></i> Circle Roster</h3>
                    <button onclick="document.getElementById('group-members-modal').style.display='none'" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; font-size:1.2rem;"><i class='bx bx-x'></i></button>
                </div>
                
                <div id="modal-members-list" style="max-height:200px; overflow-y:auto; margin-bottom:15px; display:flex; flex-direction:column; gap:8px;"></div>
                
                <div style="border-top:1px solid var(--border-color); padding-top:12px;">
                    <h4 style="margin:0 0 8px 0; font-size:0.85rem; text-transform:uppercase; color:var(--text-sec); letter-spacing:0.5px;">Invite Other Cooks</h4>
                    <div id="modal-add-candidates-list" style="max-height:140px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; margin-bottom:12px;"></div>
                    <button id="modal-btn-add-submit" style="width:100%; padding:8px; border-radius:8px; font-size:0.85rem; font-weight:bold; display:none;">Add Selected Cooks</button>
                </div>
            </div>
        </div>

    </div>
`;

export const AccountSettingsView = `
    <div class="create-post-page" style="padding:20px;">
        <h2>Edit Profile</h2>
        <div style="text-align:center; margin:15px 0;">
            <img id="edit-avatar-preview" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid var(--accent-color);"><br>
            <input type="file" id="edit-avatar" accept="image/*" onchange="window.previewAvatar(this)" style="margin-top:10px; font-size:0.8rem;">
        </div>
        <span class="form-label">Display Name</span>
        <input type="text" id="edit-name" class="create-input">
        <span class="form-label">Bio</span>
        <textarea id="edit-bio" class="create-input" rows="3"></textarea>
        <span class="form-label">Change Password</span>
        <input type="password" id="edit-pass" class="create-input" placeholder="Leave blank to keep current">
        <button onclick="window.saveProfile()" style="width:100%; padding:12px; border-radius:30px;">Save Profile</button>
    </div>
`;

export const SavedRecipesView = `
    <div class="dashboard-page" style="padding:15px;">
        <h2 style="margin-bottom:15px;">Saved Recipes</h2>
        <div id="saved-posts-feed"></div>
    </div>
`;

export const ShoppingListView = `
    <div class="dashboard-page" style="padding:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h2>Shopping List</h2>
            <button onclick="window.toggleSelectionMode()" style="background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); padding:5px 12px; border-radius:20px; font-size:0.85rem; cursor:pointer;">Manage</button>
        </div>
        <div id="add-item-row" style="display:flex; gap:10px; margin-bottom:15px;">
            <input type="text" id="manual-item-input" placeholder="Add custom item..." class="create-input" style="margin:0; flex:1;">
            <button onclick="window.addManualItem()" style="border-radius:8px; padding:0 15px; cursor:pointer;">Add</button>
        </div>
        <div id="bulk-action-row" style="display:none; justify-content:space-between; align-items:center; background:var(--card-bg); padding:10px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:15px;">
            <span id="selected-count" style="font-size:0.9rem; font-weight:600;">0 selected</span>
            <div style="display:flex; gap:8px;">
                <button onclick="window.toggleSelectAll()" style="background:var(--bg-color); color:var(--text-main); border:1px solid var(--border-color); padding:5px 10px; font-size:0.8rem; border-radius:4px; cursor:pointer;">Select All</button>
                <button onclick="window.deleteSelectedItems()" style="background:#ff4500; color:white; padding:5px 10px; font-size:0.8rem; border-radius:4px; border:none; cursor:pointer;">Delete</button>
            </div>
        </div>
        <div id="shopping-list-items"></div>
    </div>
`;

export const PublicProfileView = `
    <div class="dashboard-page" style="padding:15px;">
        <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:20px; border-radius:10px; text-align:center; margin-bottom:20px; position:relative;">
            
            <div style="position:absolute; top:15px; left:15px;">
                <button onclick="window.handleProfileBack()" style="background:transparent; color:var(--text-main); border:none; cursor:pointer; padding:5px; display:flex; align-items:center; gap:5px; font-size:0.9rem; font-weight:600;">
                    <i class='bx bx-arrow-back' style='font-size:1.3rem; color:var(--accent-color);'></i> Back
                </button>
            </div>

            <img id="profile-avatar" style="width:80px; height:80px; border-radius:50%; object-fit:cover; margin-bottom:10px; border:2px solid var(--accent-color); margin-top:15px;">
            <h2 id="profile-name">Chef</h2>
            <p id="profile-bio" style="color:var(--text-sec); font-style:italic; font-size:0.9rem; margin:10px 0;"></p>
            <div style="display:flex; justify-content:center; gap:25px; margin:15px 0; font-size:0.9rem;">
                <div><b id="profile-post-count">0</b> <span style="color:var(--text-sec);">Recipes</span></div>
                <div><b id="profile-follower-count">0</b> <span style="color:var(--text-sec);">Followers</span></div>
            </div>
            <div id="follow-action-area"></div>
        </div>
        <h3>Recipes</h3>
        <div id="user-posts-feed" style="margin-top:15px;"></div>
    </div>
`;

export const NotificationsView = `
    <div class="dashboard-page" style="padding:15px;">
        <h2 style="margin-bottom:15px;">Notifications</h2>
        <div id="notif-list" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:10px; overflow:hidden;"></div>
    </div>
`;

export const MenuView = `
    <div class="dashboard-page" style="padding:15px;">
        <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:20px; border-radius:10px; display:flex; align-items:center; gap:15px; margin-bottom:20px;">
            <img id="menu-avatar" style="width:55px; height:55px; border-radius:50%; object-fit:cover;">
            <div>
                <h3 id="menu-name">Chef</h3>
                <a onclick="window.router('/account')" style="font-size:0.85rem; color:var(--accent-color); cursor:pointer; font-weight:600;">View & Edit Profile</a>
            </div>
        </div>
        <div id="menu-options-list" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:10px; overflow:hidden; display:flex; flex-direction:column;">
            <div onclick="window.router('/saved')" class="menu-item-styled" style="border-bottom:1px solid var(--border-color);"><i class='bx bx-bookmark' style='font-size:1.2rem; color:var(--accent-color);'></i> Saved Recipes</div>
            <div onclick="window.router('/shopping-list')" class="menu-item-styled" style="border-bottom:1px solid var(--border-color);"><i class='bx bx-list-check' style='font-size:1.2rem; color:var(--accent-color);'></i> Shopping List</div>
            <div onclick="window.router('/notifications')" class="menu-item-styled" style="border-bottom:1px solid var(--border-color);"><i class='bx bx-bell' style='font-size:1.2rem; color:var(--accent-color);'></i> Notifications</div>
            <div onclick="window.toggleTheme()" class="menu-item-styled" style="border-bottom:1px solid var(--border-color); justify-content:space-between; cursor:pointer;">
                <div style="display:flex; align-items:center; gap:10px;"><i class='bx bx-palette' style='font-size:1.2rem; color:var(--accent-color);'></i> Toggle Theme</div>
                <i id="menu-theme-icon" class='bx bx-moon'></i>
            </div>
            <div onclick="window.logoutUser()" class="menu-item-styled" style="color:#ff4500;"><i class='bx bx-log-out' style='font-size:1.2rem;'></i> Log Out</div>
        </div>
    </div>
`;

export const PlannerView = `
    <div class="dashboard-page" style="padding:15px;">
        <h2 style="margin-bottom:2px;"><i class='bx bx-calendar-heart' style="color:var(--accent-color);"></i> Daily Meal Planner</h2>
        <p style="color:var(--text-sec); font-size:0.85rem; margin-bottom:15px;">Track scheduled meals and aggregated metrics against daily baselines.</p>
        <div id="weekly-planner-container" style="display:flex; flex-direction:column; gap:15px;"></div>
    </div>
`;

// --- GLOBAL UTILS ---
window.showToast = (message, type = "normal") => {
    let container = document.getElementById('toast-box');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-box';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

window.loadNotifications = () => {
    const user = auth.currentUser;
    if (!user) return;
    const list = document.getElementById("notif-list");
    
    db.collection("users").doc(user.uid).collection("notifications")
      .orderBy("createdAt", "desc").limit(20)
      .onSnapshot((snap) => {
          if (!list) return;
          list.innerHTML = "";
          if (snap.empty) {
              list.innerHTML = "<p style='text-align:center; color:var(--text-sec); padding:20px;'>No notifications yet.</p>";
              return;
          }
          snap.forEach((doc) => {
              const data = doc.data();
              let icon = "bx-bell";
              if (data.type === "like") icon = "bxs-heart";
              if (data.type === "comment") icon = "bxs-message-rounded";
              if (data.type === "follow") icon = "bxs-user-plus";
              
              const color = data.type === "like" ? "#ff4500" : (data.type === "follow" ? "#2196f3" : "var(--accent-color)");
              const readStyle = data.read ? "opacity: 0.7;" : "background: var(--bg-color); font-weight: bold;";

              list.innerHTML += `
              <div onclick="window.router('${data.link}')" style="display:flex; align-items:center; padding:15px; border-bottom:1px solid var(--border-color); cursor:pointer; ${readStyle}">
                  <div style="width:40px; height:40px; border-radius:50%; background:${color}20; display:flex; align-items:center; justify-content:center; margin-right:15px;">
                      <i class='bx ${icon}' style="color:${color}; font-size:1.2rem;"></i>
                  </div>
                  <div>
                      <div style="font-size:0.95rem;"><strong>${data.senderName}</strong> ${data.text}</div>
                  </div>
              </div>`;
              
              if (!data.read) doc.ref.update({ read: true });
          });
      });
};

// --- ROUTER LOGIC ---
const routes = {
  "/": `<div class="landing-page"><h1>Welcome to Recipeit</h1><p>Your minimalist cookbook.</p><br><button onclick="window.router('/login')">Get Started</button></div>`,
  "/login": LoginView,
  "/register": RegisterView,
  "/dashboard": DashboardView,
  "/search": SearchView,
  "/create": CreateView,
  "/edit": EditView,
  "/account": AccountSettingsView,
  "/saved": SavedRecipesView,
  "/shopping-list": ShoppingListView,
  "/user": PublicProfileView,
  "/messages": MessagesView,
  "/chat-room": ChatRoomView,
  "/notifications": NotificationsView,
  "/menu": MenuView,
  "/admin": AdminView,
  "/planner": PlannerView
};

window.router = (path) => {
  window.onscroll = null;
  const app = document.getElementById("app");
  const nav = document.getElementById("navbar");
  const isMobile = window.innerWidth <= 768;

  if (path === "/" || path === "/login" || path === "/register") {
    nav.style.display = "none";
    app.style.marginTop = "0px";
    app.style.paddingBottom = "0px";
  } else {
    nav.style.display = "flex";
    if (isMobile) {
        app.style.marginTop = "0px";
        app.style.paddingBottom = "80px";
    } else {
        app.style.marginTop = "60px"; 
        app.style.paddingBottom = "20px";
    }
  }

  if (path.startsWith("/user/")) {
      const userId = path.split("/")[2]; 
      renderView(routes["/user"], isMobile);
      if (window.loadPublicProfile) window.loadPublicProfile(userId);
      return; 
  }

  if (path.startsWith("/messages/")) {
      const chatId = path.split("/")[2];
      renderView(routes["/chat-room"], isMobile);
      if (window.loadChatRoom) window.loadChatRoom(chatId);
      return;
  }

  window.history.pushState({}, path, window.location.origin + "#" + path);
  renderView(routes[path] || routes["/"], isMobile);

  if (path === "/dashboard") {
      loadPosts();
      setTimeout(() => {
          const dot = document.getElementById("dashboard-notif-dot");
          if (dot && window.hasUnreadNotifications) dot.style.display = "block";
      }, 50);
  }
  if (path === "/account") loadAccountSettings();
  if (path === "/saved") loadSavedPosts();
  if (path === "/shopping-list") loadShoppingList();
  if (path === "/edit") loadEditForm();
  if (path === "/messages") window.loadInbox();
  if (path === "/notifications") window.loadNotifications();
  if (path === "/menu") loadMenu();
  if (path === "/admin") window.loadAdminDashboard();
  if (path === "/planner") window.loadMealPlannerDashboard();
};

const renderView = (html, isMobile) => {
    const app = document.getElementById("app");
    if (!isMobile) {
        app.innerHTML = `<div style="max-width: 1000px; margin: 0 auto; width: 100%; position: relative;">${html}</div>`;
    } else {
        app.innerHTML = html;
    }
};

window.onpopstate = () => window.router(window.location.hash.replace("#", "") || "/");