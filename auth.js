const bcrypt = require("bcryptjs");
const pool = require("./db");

/**
 * Initializes the authentication system by creating users table and default users
 * Creates the users table with columns: id, username, password_hash, security_answer_hash, created_at, updated_at, role
 * Also creates permissions table and initializes default permissions for each role
 * Creates default users: admin, viewer, king (gamer), permission (super_admin)
 * Used by: server.js on startup
 * Dependencies: db.js (pool connection), bcryptjs for password hashing
 */
async function initializeAuth() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                security_answer_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Add role column if it doesn't exist
        try {
            await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'viewer'");
        } catch (error) {
            // Column already exists, ignore error
        }

        // Check if admin user exists, if not create it
        const adminUsername = process.env.ADMIN_USERNAME || "admin";
        const [existingAdminUser] = await pool.query("SELECT id FROM users WHERE username = ?", [adminUsername]);

        if (existingAdminUser.length === 0) {
            // Use environment variables for security - set in Replit Secrets
            const adminPassword = process.env.ADMIN_PASSWORD;
            const securityAnswer = process.env.SECURITY_ANSWER;
            
            if (!adminPassword || !securityAnswer) {
                console.warn("WARNING: ADMIN_PASSWORD and SECURITY_ANSWER should be set in environment variables for security");
            }
            
            const defaultAdminPassword = adminPassword || "ChangeMe@123!";
            const defaultSecurityAnswer = securityAnswer || "defaultanswer";
            
            const hashedPassword = await bcrypt.hash(defaultAdminPassword, 12);
            const hashedSecurityAnswer = await bcrypt.hash(defaultSecurityAnswer.toLowerCase().trim(), 12);

            await pool.query(
                "INSERT INTO users (username, password_hash, security_answer_hash, role) VALUES (?, ?, ?, ?)",
                [adminUsername, hashedPassword, hashedSecurityAnswer, "admin"]
            );
        } else {
            // Update existing admin user to have admin role
            await pool.query("UPDATE users SET role = 'admin' WHERE username = ?", [adminUsername]);
        }

        // Check if viewer user exists, if not create it
        const [existingViewerUser] = await pool.query("SELECT id FROM users WHERE username = ?", ["viewer"]);

        if (existingViewerUser.length === 0) {
            const viewerPassword = process.env.VIEWER_PASSWORD || "viewer123";
            const securityAnswer = process.env.VIEWER_SECURITY_ANSWER || "defaultanswer";
            const hashedPassword = await bcrypt.hash(viewerPassword, 12);
            const hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 12);

            await pool.query(
                "INSERT INTO users (username, password_hash, security_answer_hash, role) VALUES (?, ?, ?, ?)",
                ["viewer", hashedPassword, hashedSecurityAnswer, "viewer"]
            );
        }

        // Check if gaming user exists, if not create it
        const [existingGamingUser] = await pool.query("SELECT id FROM users WHERE username = ?", ["king"]);

        if (existingGamingUser.length === 0) {
            const gamingPassword = process.env.GAMING_PASSWORD || "queen";
            const securityAnswer = process.env.GAMING_SECURITY_ANSWER || "defaultanswer";
            const hashedPassword = await bcrypt.hash(gamingPassword, 12);
            const hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 12);

            await pool.query(
                "INSERT INTO users (username, password_hash, security_answer_hash, role) VALUES (?, ?, ?, ?)",
                ["king", hashedPassword, hashedSecurityAnswer, "gamer"]
            );
        }

        // Check if permission user exists, if not create it
        const [existingPermissionUser] = await pool.query("SELECT id FROM users WHERE username = ?", ["permission"]);

        if (existingPermissionUser.length === 0) {
            const permissionPassword = process.env.PERMISSION_PASSWORD || "permission123";
            const securityAnswer = process.env.PERMISSION_SECURITY_ANSWER || "defaultanswer";
            const hashedPassword = await bcrypt.hash(permissionPassword, 12);
            const hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 12);

            await pool.query(
                "INSERT INTO users (username, password_hash, security_answer_hash, role) VALUES (?, ?, ?, ?)",
                ["permission", hashedPassword, hashedSecurityAnswer, "super_admin"]
            );
        }

        // Check if transfer user exists, if not create it
        const [existingTransferUser] = await pool.query("SELECT id FROM users WHERE username = ?", ["transfer"]);

        if (existingTransferUser.length === 0) {
            const transferPassword = process.env.TRANSFER_PASSWORD || "transfer123";
            const securityAnswer = process.env.TRANSFER_SECURITY_ANSWER || "defaultanswer";
            const hashedPassword = await bcrypt.hash(transferPassword, 12);
            const hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 12);

            await pool.query(
                "INSERT INTO users (username, password_hash, security_answer_hash, role) VALUES (?, ?, ?, ?)",
                ["transfer", hashedPassword, hashedSecurityAnswer, "transfer"]
            );
        }

        // Check if pdf user exists, if not create it
        const [existingPdfUser] = await pool.query("SELECT id FROM users WHERE username = ?", ["pdf"]);

        if (existingPdfUser.length === 0) {
            const pdfPassword = process.env.PDF_PASSWORD || "pdf123";
            const securityAnswer = process.env.PDF_SECURITY_ANSWER || "defaultanswer";
            const hashedPassword = await bcrypt.hash(pdfPassword, 12);
            const hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 12);

            await pool.query(
                "INSERT INTO users (username, password_hash, security_answer_hash, role) VALUES (?, ?, ?, ?)",
                ["pdf", hashedPassword, hashedSecurityAnswer, "pdf"]
            );
        }

        // Check if network user exists, if not create it
        const [existingNetworkUser] = await pool.query("SELECT id FROM users WHERE username = ?", ["network"]);

        if (existingNetworkUser.length === 0) {
            const networkPassword = process.env.NETWORK_PASSWORD || "network123";
            const securityAnswer = process.env.NETWORK_SECURITY_ANSWER || "defaultanswer";
            const hashedPassword = await bcrypt.hash(networkPassword, 12);
            const hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 12);

            await pool.query(
                "INSERT INTO users (username, password_hash, security_answer_hash, role) VALUES (?, ?, ?, ?)",
                ["network", hashedPassword, hashedSecurityAnswer, "network"]
            );
        }

        // Create permissions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role VARCHAR(20) NOT NULL,
                permission_name VARCHAR(100) NOT NULL,
                enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_role_permission (role, permission_name)
            )
        `);

        // Initialize default permissions
        await initializeDefaultPermissions();
    } catch (error) {
        console.error("Error initializing auth:", error);
    }
}

/**
 * Authenticates a user by verifying username and password against database
 * @param {string} username - The username to authenticate
 * @param {string} password - The plain text password to verify
 * @returns {Object|false} - Returns user object if authenticated, false otherwise
 * Used by: server.js login endpoint (/api/login)
 * Dependencies: db.js (pool), bcryptjs for password comparison
 */
async function authenticateUser(username, password) {
    try {
        const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);

        if (users.length === 0) {
            return false;
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        return isValidPassword ? user : false;
    } catch (error) {
        console.error("Authentication error:", error);
        return false;
    }
}

/**
 * Verifies security answer for password reset functionality
 * @param {string} username - The username to verify security answer for
 * @param {string} answer - The security answer to verify (case-insensitive)
 * @returns {boolean} - Returns true if answer is correct, false otherwise
 * Used by: server.js password reset endpoint (/api/verify-security)
 * Dependencies: db.js (pool), bcryptjs for answer comparison
 */
async function verifySecurityAnswer(username, answer) {
    try {
        const [users] = await pool.query("SELECT security_answer_hash FROM users WHERE username = ?", [username]);

        if (users.length === 0) {
            return false;
        }

        const isValidAnswer = await bcrypt.compare(answer.toLowerCase().trim(), users[0].security_answer_hash);
        return isValidAnswer;
    } catch (error) {
        console.error("Security verification error:", error);
        return false;
    }
}

/**
 * Changes user password with validation
 * @param {string} username - The username to change password for
 * @param {string} newPassword - The new password (must be at least 6 characters)
 * @returns {boolean} - Returns true if successful, throws error otherwise
 * Used by: server.js change password endpoint (/api/change-password)
 * Dependencies: db.js (pool), bcryptjs for password hashing
 */
async function changePassword(username, newPassword) {
    try {
        if (!newPassword || newPassword.length < 6) {
            throw new Error("Password must be at least 6 characters long");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await pool.query(
            "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?",
            [hashedPassword, username]
        );

        return true;
    } catch (error) {
        console.error("Password change error:", error);
        throw error;
    }
}

/**
 * Initializes default permissions for viewer and admin roles
 * Creates permission records in permissions table for each role-permission combination
 * Defines access control for various features like viewing registers, analytics, CRUD operations
 * Used by: initializeAuth() during system initialization
 * Dependencies: db.js (pool) for database operations
 */
async function initializeDefaultPermissions() {
    const defaultPermissions = {
        viewer: [
            // Basic view permissions
            'view_supply_register',
            'view_demand_register', 
            'view_bill_register',
            'view_sanction_register',
            'view_dashboard',
            
            // Search and filter (read-only)
            'search_records',
            'filter_records',
            'sort_records',
            'advanced_filter',
            'advanced_search',
            'custom_filters',
            
            // Analytics and reporting (read-only)
            'view_analytics',
            'view_homepage_analytics',
            'export_excel',
            'print_reports',
            'download_pdf',
            'generate_reports',
            'compare_years',
            'advanced_visualization',
            'export_reports',
            'data_visualization_enhanced',
            'chart_interactions',
            'data_drill_down',
            'comparison_tools',
            
            // System utilities (read-only)
            'change_financial_year',
            'view_backups',
            'dark_mode_toggle',
            'keyboard_shortcuts',
            'calculator',
            'real_time_updates',
            'notification_access',
            'data_analysis_tools',
            'view_user_info',
            'view_system_status',
            'logout_access',
            'session_status_view',
            
            // Interface customization
            'mobile_interface_access',
            'help_documentation',
            'tutorial_access',
            'shortcut_customization',
            'theme_customization',
            'column_sorting_advanced',
            'data_refresh',
            'bookmark_views',
            'saved_searches',
            'time_range_selection',
            'auto_refresh',
            'dashboard_customization',
            'widget_management',
            'layout_preferences',
            
            // Export capabilities
            'bulk_export',
            'data_export_all',
            'export_multiple_formats',
            'print_advanced'
        ],
        admin: [
            // All viewer permissions
            'view_supply_register',
            'view_demand_register',
            'view_bill_register', 
            'view_sanction_register',
            'view_dashboard',
            'search_records',
            'filter_records',
            'sort_records',
            'advanced_filter',
            'advanced_search',
            'custom_filters',
            'view_analytics',
            'view_homepage_analytics',
            'export_excel',
            'print_reports',
            'download_pdf',
            'generate_reports',
            'compare_years',
            'advanced_visualization',
            'export_reports',
            'data_visualization_enhanced',
            'chart_interactions',
            'data_drill_down',
            'comparison_tools',
            'change_financial_year',
            'view_backups',
            'dark_mode_toggle',
            'keyboard_shortcuts',
            'calculator',
            'real_time_updates',
            'notification_access',
            'data_analysis_tools',
            'view_user_info',
            'view_system_status',
            'logout_access',
            'session_status_view',
            'mobile_interface_access',
            'help_documentation',
            'tutorial_access',
            'shortcut_customization',
            'theme_customization',
            'column_sorting_advanced',
            'data_refresh',
            'bookmark_views',
            'saved_searches',
            'time_range_selection',
            'auto_refresh',
            'dashboard_customization',
            'widget_management',
            'layout_preferences',
            'bulk_export',
            'data_export_all',
            'export_multiple_formats',
            'print_advanced',
            
            // Admin-only CRUD operations
            'add_records',
            'edit_records',
            'delete_records',
            'move_records',
            'import_excel',
            'data_import_all',
            
            // Admin-only system management
            'session_management',
            'api_access',
            'cache_management',
            'offline_mode'
        ]
    };

    for (const [role, permissions] of Object.entries(defaultPermissions)) {
        for (const permission of permissions) {
            try {
                await pool.query(
                    "INSERT IGNORE INTO permissions (role, permission_name, enabled) VALUES (?, ?, ?)",
                    [role, permission, true]
                );
            } catch (error) {
                // Permission already exists, ignore
            }
        }
    }
}

/**
 * Retrieves all enabled permissions for a specific user role
 * @param {string} role - The user role (viewer, admin, gamer, super_admin)
 * @returns {Array} - Array of permission names that are enabled for the role
 * Used by: server.js login endpoint, requirePermission middleware, permissions endpoints
 * Dependencies: db.js (pool) for database queries
 */
async function getUserPermissions(role) {
    try {
        const [permissions] = await pool.query(
            "SELECT permission_name FROM permissions WHERE role = ? AND enabled = TRUE",
            [role]
        );
        return permissions.map(p => p.permission_name);
    } catch (error) {
        console.error("Error fetching user permissions:", error);
        return [];
    }
}

/**
 * Updates permission status (enabled/disabled) for a specific role and permission
 * @param {string} role - The user role to update permission for
 * @param {string} permissionName - The specific permission to update
 * @param {boolean} enabled - Whether to enable or disable the permission
 * @returns {boolean} - Returns true if successful, false otherwise
 * Used by: server.js permission update endpoint (/api/permissions/update)
 * Dependencies: db.js (pool) for database operations
 */
async function updatePermission(role, permissionName, enabled) {
    try {
        await pool.query(
            "UPDATE permissions SET enabled = ? WHERE role = ? AND permission_name = ?",
            [enabled, role, permissionName]
        );
        return true;
    } catch (error) {
        console.error("Error updating permission:", error);
        return false;
    }
}

/**
 * Retrieves all permissions from the database for all roles
 * @returns {Array} - Array of all permission records with role, permission_name, enabled status
 * Used by: server.js permissions management endpoint (/api/permissions)
 * Dependencies: db.js (pool) for database queries
 */
async function getAllPermissions() {
    try {
        const [permissions] = await pool.query(
            "SELECT * FROM permissions ORDER BY role, permission_name"
        );
        return permissions;
    } catch (error) {
        console.error("Error fetching all permissions:", error);
        return [];
    }
}

module.exports = {
    initializeAuth,
    authenticateUser,
    verifySecurityAnswer,
    changePassword,
    getUserPermissions,
    updatePermission,
    getAllPermissions
};