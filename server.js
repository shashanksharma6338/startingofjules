require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const path = require("path");
const XLSX = require("xlsx");
const session = require("express-session");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./db");
const {
    initializeAuth,
    authenticateUser,
    verifySecurityAnswer,
    changePassword,
    getUserPermissions,
    updatePermission,
    getAllPermissions,
} = require("./auth");

const app = express();
const port = process.env.PORT || 5000;

// Shared session store for express and socket.io
const sessionStore = new (require('express-session').MemoryStore)({
    checkPeriod: 86400000, // Clean up expired sessions every 24 hours
    max: 1000, // Maximum number of sessions to store
    dispose: (key, sess) => {
        console.log('Session disposed:', key);
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Session configuration optimized for high concurrency and shared logins
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours for shared login scenarios
        sameSite: 'lax'
    },
    name: 'sid',
    genid: () => {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    },
    // Memory store optimization for high concurrency
    store: sessionStore
}));

app.use(bodyParser.json());
// Serve static files
app.use(express.static('public'));

// Serve permissions management page
app.get('/permissions', requireSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'permissions.html'));
});

// Visitor counter storage (in production, you'd want to use a database)
let visitorCount = 0;
const VISITOR_COUNT_FILE = path.join(__dirname, 'visitor_count.txt');

// Function to load visitor count from file
async function loadVisitorCount() {
    try {
        const data = await fs.readFile(VISITOR_COUNT_FILE, 'utf8');
        visitorCount = parseInt(data, 10) || 0;
        console.log(`Loaded visitor count: ${visitorCount}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Visitor count file not found, starting from 0.');
            visitorCount = 0;
        } else {
            console.error('Error loading visitor count:', error);
            visitorCount = 0; // Default to 0 if file is corrupted or unreadable
        }
    }
}

// Function to save visitor count to file
async function saveVisitorCount() {
    try {
        await fs.writeFile(VISITOR_COUNT_FILE, visitorCount.toString(), 'utf8');
        console.log(`Saved visitor count: ${visitorCount}`);
    } catch (error) {
        console.error('Error saving visitor count:', error);
    }
}

// Load visitor count on startup
loadVisitorCount();

// Set interval to save visitor count periodically (e.g., every 2 minutes)
setInterval(saveVisitorCount, 2 * 60 * 1000);

// Visitor counter endpoints
app.get("/api/public/visitor-count", async (req, res) => {
    try {
        // Increment visitor count
        visitorCount++;
        res.json({ count: visitorCount });
    } catch (error) {
        console.error("Visitor count error:", error);
        res.status(500).json({ error: "Failed to get visitor count" });
    }
});

app.get("/api/public/visitor-count-display", async (req, res) => {
    try {
        // Just return current count without incrementing
        res.json({ count: visitorCount });
    } catch (error) {
        console.error("Visitor count display error:", error);
        res.status(500).json({ error: "Failed to get visitor count" });
    }
});

// Public endpoints for homepage analytics with caching
app.get("/api/public/supply-orders", async (req, res) => {
    const { year } = req.query;
    const cacheKey = `public-supply-${year}`;

    try {
        // Check cache first
        const cachedData = getHomepageCachedData(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const [rows] = await pool.query(
            `SELECT id, serial_no, supply_order_no, DATE_FORMAT(so_date, '%Y-%m-%d') as so_date, 
                    firm_name, nomenclature, quantity, 
                    DATE_FORMAT(original_date, '%Y-%m-%d') as original_date, 
                    build_up, maint, misc, delivery_done, financial_year 
             FROM supply_orders WHERE financial_year = ? ORDER BY serial_no`,
            [year],
        );

        // Cache the result
        setHomepageCachedData(cacheKey, rows);

        console.log(`Public API: Found ${rows.length} supply orders for year ${year}`);
        res.json(rows);
    } catch (error) {
        console.error("Public supply orders fetch error:", error);
        res.status(500).json({ error: "Failed to fetch supply orders" });
    }
});

app.get("/api/public/demand-orders", async (req, res) => {
    const { year } = req.query;
    const cacheKey = `public-demand-${year}`;

    try {
        // Check cache first
        const cachedData = getHomepageCachedData(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const [rows] = await pool.query(
            `SELECT id, serial_no, DATE_FORMAT(demand_date, '%Y-%m-%d') as demand_date,
                    imms_demand_no, nomenclature, quantity, est_cost, supply_order_placed, financial_year 
             FROM demand_orders WHERE financial_year = ? ORDER BY serial_no`,
            [year],
        );

        // Cache the result
        setHomepageCachedData(cacheKey, rows);

        console.log(`Public API: Found ${rows.length} demand orders for year ${year}`);
        res.json(rows);
    } catch (error) {
        console.error("Public demand orders fetch error:", error);
        res.status(500).json({ error: "Failed to fetch demand orders" });
    }
});

app.get("/api/public/bill-orders", async (req, res) => {
    const { year } = req.query;
    const cacheKey = `public-bill-${year}`;

    try {
        // Check cache first
        const cachedData = getHomepageCachedData(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const [rows] = await pool.query(
            `SELECT id, serial_no, DATE_FORMAT(bill_control_date, '%Y-%m-%d') as bill_control_date,
                    supply_order_no, build_up, maintenance, project_less_2cr, project_more_2cr, financial_year 
             FROM bill_orders WHERE financial_year = ? ORDER BY serial_no`,
            [year],
        );

        // Cache the result
        setHomepageCachedData(cacheKey, rows);

        console.log(`Public API: Found ${rows.length} bill orders for year ${year}`);
        res.json(rows);
    } catch (error) {
        console.error("Public bill orders fetch error:", error);
        res.status(500).json({ error: "Failed to fetch bill orders" });
    }
});

// Add endpoint to get all financial years
app.get("/api/public/financial-years", async (req, res) => {
    try {
        const [supplyYears] = await pool.query(
            "SELECT DISTINCT financial_year FROM supply_orders WHERE financial_year IS NOT NULL ORDER BY financial_year DESC"
        );
        const [demandYears] = await pool.query(
            "SELECT DISTINCT financial_year FROM demand_orders WHERE financial_year IS NOT NULL ORDER BY financial_year DESC"
        );
        const [billYears] = await pool.query(
            "SELECT DISTINCT financial_year FROM bill_orders WHERE financial_year IS NOT NULL ORDER BY financial_year DESC"
        );

        // Combine and deduplicate years
        const allYears = new Set([
            ...supplyYears.map(r => r.financial_year),
            ...demandYears.map(r => r.financial_year),
            ...billYears.map(r => r.financial_year)
        ]);

        const sortedYears = Array.from(allYears).sort((a, b) => b.localeCompare(a));
        console.log('Available financial years:', sortedYears);
        res.json(sortedYears);
    } catch (error) {
        console.error("Financial years fetch error:", error);
        res.status(500).json({ error: "Failed to fetch financial years" });
    }
});

// Add endpoint to get all data for yearly trends
app.get("/api/public/supply-orders-all", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM supply_orders ORDER BY financial_year DESC, serial_no ASC"
        );
        res.json(rows);
    } catch (error) {
        console.error("All supply orders fetch error:", error);
        res.status(500).json({ error: "Failed to fetch all supply orders" });
    }
});

app.get("/api/public/demand-orders-all", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM demand_orders ORDER BY financial_year DESC, serial_no ASC"
        );
        res.json(rows);
    } catch (error) {
        console.error("All demand orders fetch error:", error);
        res.status(500).json({ error: "Failed to fetch all demand orders" });
    }
});

app.get("/api/public/bill-orders-all", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM bill_orders ORDER BY financial_year DESC, serial_no ASC"
        );
        res.json(rows);
    } catch (error) {
        console.error("All bill orders fetch error:", error);
        res.status(500).json({ error: "Failed to fetch all bill orders" });
    }
});

app.use("/backups/supply", express.static("backups/supply"));
app.use("/backups/demand", express.static("backups/demand"));
app.use("/backups/bill", express.static("backups/bill"));
app.use(
    "/backups/sanction-gen-project",
    express.static("backups/sanction-gen-project"),
);
app.use("/backups/sanction-misc", express.static("backups/sanction-misc"));
app.use(
    "/backups/sanction-training",
    express.static("backups/sanction-training"),
);

// Initialize authentication system
initializeAuth();

// WebSocket authentication middleware - secure version linked to express session
io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
        return next(new Error("Authentication required: No cookies found"));
    }

    // Simple cookie parser
    const cookies = {};
    cookieHeader.split(';').forEach(c => {
        const parts = c.split('=');
        if (parts.length >= 2) {
            cookies[parts[0].trim()] = parts[1];
        }
    });

    let sidCookie = cookies['sid'];
    if (!sidCookie) {
        return next(new Error("Authentication required: Session cookie missing"));
    }

    // Express-session cookies are prefixed with 's:' and then signed
    // Format in cookie might be encoded: s%3A...
    sidCookie = decodeURIComponent(sidCookie);

    if (!sidCookie.startsWith('s:')) {
        return next(new Error("Authentication required: Invalid session cookie format"));
    }

    // The session ID is between 's:' and the first '.'
    const sid = sidCookie.substring(2).split('.')[0];

    if (!sid) {
        return next(new Error("Authentication required: Invalid session ID"));
    }

    sessionStore.get(sid, (err, session) => {
        if (err || !session || !session.user) {
            return next(new Error("Authentication required: Session not found or expired"));
        }

        socket.username = session.user.username;
        socket.role = session.user.role;
        next();
    });
});

// Connection tracking for monitoring - optimized for 150 homepage + 100 login users
let activeConnections = 0;
const maxConnections = 300; // Optimize for actual concurrent users
let homepageConnections = 0;
let authenticatedConnections = 0;

// WebSocket connection handling optimized for high concurrency
io.on("connection", (socket) => {
    activeConnections++;

    // Check connection type for better resource allocation
    const isHomepageUser = socket.handshake.headers.referer?.includes('homepage.html');
    if (isHomepageUser) {
        homepageConnections++;
    } else {
        authenticatedConnections++;
    }

    if (activeConnections > maxConnections) {
        socket.emit('server-overload', { 
            message: 'Server at capacity, please try again in a few moments',
            retryAfter: 30000 
        });
        socket.disconnect();
        activeConnections--;
        if (isHomepageUser) homepageConnections--;
        else authenticatedConnections--;
        return;
    }

    console.log(`Client connected: ${socket.id} (Active: ${activeConnections}, Homepage: ${homepageConnections}, Auth: ${authenticatedConnections})`);

    socket.on("join-room", (room) => {
        socket.join(room);
        console.log(`Client ${socket.id} joined room: ${room}`);
    });

    socket.on("leave-room", (room) => {
        socket.leave(room);
        console.log(`Client ${socket.id} left room: ${room}`);
    });

    socket.on("join-gaming", () => {
        socket.join('gaming-room');
        console.log(`Client ${socket.id} joined gaming room`);
    });

    socket.on("leave-gaming", () => {
        socket.leave('gaming-room');
        console.log(`Client ${socket.id} left gaming room`);
    });

    socket.on("ludo-move", (data) => {
        const { gameId, pieceIndex, diceRoll } = data;
        const game = ludoGames.get(gameId);

        if (game && game.status === 'playing') {
            // Process Ludo move
            const currentPlayer = game.players[game.currentPlayerIndex];

            // Security check: Ensure it's this player's turn
            if (currentPlayer.name !== socket.username) {
                console.warn(`Unauthorized ludo-move attempt by ${socket.username} for player ${currentPlayer.name}`);
                return;
            }

            const piece = currentPlayer.pieces[pieceIndex];

            if (piece.position === -1 && diceRoll === 6) {
                piece.position = 0;
            } else if (piece.position >= 0) {
                piece.position = Math.min(piece.position + diceRoll, 56);
                if (piece.position === 56) {
                    currentPlayer.piecesInGoal++;
                }
            }

            // Check for game end
            if (currentPlayer.piecesInGoal === 4) {
                game.status = 'finished';
                game.winner = currentPlayer.name;
            }

            // Move to next player if not a 6
            if (diceRoll !== 6) {
                game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
            }

            game.diceRolled = false;
            game.lastDiceRoll = null;

            io.to('gaming-room').emit('ludo-move-made', { gameId, game });
        }
    });

    socket.on("disconnect", () => {
        activeConnections--;
        const isHomepageUser = socket.handshake.headers.referer?.includes('homepage.html');
        if (isHomepageUser) {
            homepageConnections--;
        } else {
            authenticatedConnections--;
        }

        console.log(`Client disconnected: ${socket.id} (Active: ${activeConnections}, Homepage: ${homepageConnections}, Auth: ${authenticatedConnections})`);

        // Only clean up game references for authenticated users
        if (!isHomepageUser) {
            for (let [gameId, game] of chessGames.entries()) {
                if (game.players.includes(socket.sessionId)) {
                    game.status = 'abandoned';
                    setTimeout(() => chessGames.delete(gameId), 300000);
                }
            }

            for (let [gameId, game] of ludoGames.entries()) {
                const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
                if (playerIndex !== -1) {
                    game.status = 'abandoned';
                    setTimeout(() => ludoGames.delete(gameId), 300000);
                }
            }

            for (let [gameId, game] of ticTacToeGames.entries()) {
                if (game.players.some(p => p.socketId === socket.id)) {
                    game.status = 'abandoned';
                    setTimeout(() => ticTacToeGames.delete(gameId), 300000);
                }
            }

            for (let [gameId, game] of unoGames.entries()) {
                if (game.players.some(p => p.socketId === socket.id)) {
                    game.status = 'abandoned';
                    setTimeout(() => unoGames.delete(gameId), 300000);
                }
            }
        }
    });
});

// Optimized cache for homepage data with memory management
const dataCache = new Map();
const homepageCache = new Map();
const CACHE_DURATION = 60000; // 1 minute for regular data
const HOMEPAGE_CACHE_DURATION = 30000; // 30 seconds for homepage data

function getCachedData(key) {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function getHomepageCachedData(key) {
    const cached = homepageCache.get(key);
    if (cached && Date.now() - cached.timestamp < HOMEPAGE_CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    dataCache.set(key, {
        data: data,
        timestamp: Date.now()
    });

    // Limit cache size to prevent memory overflow
    if (dataCache.size > 50) {
        const firstKey = dataCache.keys().next().value;
        dataCache.delete(firstKey);
    }
}

function setHomepageCachedData(key, data) {
    homepageCache.set(key, {
        data: data,
        timestamp: Date.now()
    });

    // Aggressive cleanup for homepage cache
    if (homepageCache.size > 20) {
        const firstKey = homepageCache.keys().next().value;
        homepageCache.delete(firstKey);
    }
}

/**
 * Broadcasts real-time data changes to connected WebSocket clients
 * @param {string} type - Type of data (supply, demand, bill)
 * @param {string} action - Action performed (create, update, delete)
 * @param {Object} data - The data that was changed
 * @param {string} financialYear - Financial year for targeted broadcast
 * Used by: CRUD operations on supply, demand, bill orders
 * Dependencies: socket.io for WebSocket communication
 */
function broadcastDataChange(type, action, data, financialYear) {
    const room = `${type}-${financialYear}`;

    // Clear relevant cache entries
    dataCache.delete(`${type}-${financialYear}`);
    dataCache.delete(`dashboard-overview-${financialYear}`);

    // Clear homepage cache
    const homepageCacheKey = `public-${type}-${financialYear}`;
    homepageCache.delete(homepageCacheKey);

    io.to(room).emit("data-change", {
        type,
        action,
        data,
        timestamp: new Date().toISOString()
    });
}

/**
 * Updates demand order status when supply order is linked via IMMS demand number
 * @param {string} imms_demand_no - The IMMS demand number to update
 * @param {string} financial_year - Financial year for the update
 * Used by: Supply order creation and update endpoints
 * Dependencies: db.js (pool) for database operations
 */
async function updateSupplyOrderPlacedStatus(imms_demand_no, financial_year) {
    if (imms_demand_no) {
        try {
            await pool.query(
                "UPDATE demand_orders SET supply_order_placed = 'Yes' WHERE imms_demand_no = ? AND financial_year = ?",
                [imms_demand_no, financial_year]
            );
        } catch (error) {
            console.error("Error updating supply order placed status:", error);
        }
    }
}

/**
 * Authentication middleware - checks if user has valid session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 * Used by: All protected API endpoints
 * Dependencies: express-session for session management
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.status(401).json({ success: false, message: 'Session expired or not authenticated' });
    }
}

/**
 * Admin role middleware - checks if user has admin privileges
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * Used by: Admin-only endpoints (currently not actively used)
 * Dependencies: requireAuth middleware, session management
 */
function requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
}

/**
 * Super admin role middleware - checks if user has super admin privileges
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * Used by: Permission management endpoints (/api/permissions/*)
 * Dependencies: requireAuth middleware, session management
 */
function requireSuperAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'super_admin') {
        return next();
    } else {
        return res.status(403).json({ success: false, message: 'Super admin access required' });
    }
}

/**
 * Permission-based access control middleware - checks if user has specific permission
 * @param {string} permissionName - The permission name to check
 * @returns {Function} - Express middleware function
 * Used by: Feature-specific endpoints throughout the application
 * Dependencies: auth.js (getUserPermissions), session management
 */
function requirePermission(permissionName) {
    return async (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const userRole = req.session.user.role;

        // Super admins have all permissions
        if (userRole === 'super_admin') {
            return next();
        }

        const userPermissions = await getUserPermissions(userRole);

        if (userPermissions.includes(permissionName)) {
            return next();
        } else {
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }
    };
}

// Create backup directories if they don't exist
const backupDirs = {
    supply: path.join(__dirname, "backups", "supply"),
    demand: path.join(__dirname, "backups", "demand"),
    bill: path.join(__dirname, "backups", "bill"),
    "sanction-gen-project": path.join(
        __dirname,
        "backups",
        "sanction-gen-project",
    ),
    "sanction-misc": path.join(__dirname, "backups", "sanction-misc"),
    "sanction-training": path.join(__dirname, "backups", "sanction-training"),
};
Object.values(backupDirs).forEach((dir) => fs.mkdir(dir, { recursive: true }));

// Auto-generate backup daily
async function createBackup(type) {
    const date = new Date().toISOString().split("T")[0];
    const backupFile = path.join(backupDirs[type], `backup_${date}.xlsx`);
    try {
        let tableName, sheetName;
        if (type.startsWith("sanction-")) {
            tableName = type.replace(/-/g, "_");
            sheetName = `${type.charAt(0).toUpperCase() + type.slice(1)} Codes`;
        } else {
            tableName = `${type}_orders`;
            sheetName = `${type.charAt(0).toUpperCase() + type.slice(1)} Orders`;
        }

        const [rows] = await pool.query(`SELECT * FROM ${tableName}`);
        const formattedRows = rows.map((row) => ({
            ...row,
            ...(type === "supply"
                ? {
                      original_date: row.original_date
                          ? row.original_date.toISOString().split("T")[0]
                          : "",
                      revised_date1: row.revised_date1
                          ? row.revised_date1.toISOString().split("T")[0]
                          : "",
                      revised_date2: row.revised_date2
                          ? row.revised_date2.toISOString().split("T")[0]
                          : "",
                      revised_date3: row.revised_date3
                          ? row.revised_date3.toISOString().split("T")[0]
                          : "",
                      actual_delivery_date: row.actual_delivery_date
                          ? row.actual_delivery_date.toISOString().split("T")[0]
                          : "",
                  }
                : type === "demand"
                  ? {
                        demand_date: row.demand_date
                            ? row.demand_date.toISOString().split("T")[0]
                            : "",
                        control_date: row.control_date
                            ? row.control_date.toISOString().split("T")[0]
                            : "",
                    }
                  : type === "bill"
                    ? {
                          bill_control_date: row.bill_control_date
                              ? row.bill_control_date
                                    .toISOString()
                                    .split("T")[0]
                              : "",
                          so_date: row.so_date
                              ? row.so_date.toISOString().split("T")[0]
                              : "",
                      }
                    : type.startsWith("sanction-")
                      ? {
                            date: row.date
                                ? row.date.toISOString().split("T")[0]
                                : "",
                            uo_date: row.uo_date
                                ? row.uo_date.toISOString().split("T")[0]
                                : "",
                        }
                      : {}),
        }));
        const worksheet = XLSX.utils.json_to_sheet(formattedRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        await fs.writeFile(
            backupFile,
            XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }),
        );

        // Delete backups older than 20 days
        const files = await fs.readdir(backupDirs[type]);
        const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
        for (const file of files) {
            const filePath = path.join(backupDirs[type], file);
            const stats = await fs.stat(filePath);
            if (stats.mtime < twentyDaysAgo) {
                await fs.unlink(filePath);
            }
        }
    } catch (error) {
        console.error(`Error creating ${type} backup:`, error);
    }
}

// Schedule backups every day at midnight
setInterval(() => createBackup("supply"), 24 * 60 * 60 * 1000);
setInterval(() => createBackup("demand"), 24 * 60 * 60 * 1000);
setInterval(() => createBackup("bill"), 24 * 60 * 60 * 1000);
setInterval(() => createBackup("sanction-gen-project"), 24 * 60 * 60 * 1000);
setInterval(() => createBackup("sanction-misc"), 24 * 60 * 60 * 1000);
setInterval(() => createBackup("sanction-training"), 24 * 60 * 60 * 1000);
createBackup("supply"); // Run immediately on startup
createBackup("demand");
createBackup("bill");
createBackup("sanction-gen-project");
createBackup("sanction-misc");
createBackup("sanction-training");

// Authentication endpoints
app.post("/api/login", async (req, res) => {
    const { username, password, pcInfo } = req.body;

    try {
        const user = await authenticateUser(username, password);

        if (user) {
            // Create session
            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role || 'viewer'
            };

            // Log network activity
            await logNetworkActivity(req, 'login', user.username, user.role);

            // Store session info with PC details
            const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
                       req.connection.remoteAddress || 
                       '127.0.0.1';

            await pool.query(
                `INSERT INTO network_sessions (session_id, ip_address, username, user_role, pc_info, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE last_activity = CURRENT_TIMESTAMP, pc_info = ?, is_active = TRUE`,
                [req.sessionID, ip, user.username, user.role, JSON.stringify(pcInfo || {}), true, JSON.stringify(pcInfo || {})]
            );

            // Get user permissions
            const permissions = await getUserPermissions(user.role || 'viewer');

            // Determine redirect based on role
            let redirectTo = null;
            if (user.role === 'transfer') {
                redirectTo = 'transfer.html';
            } else if (user.role === 'pdf') {
                redirectTo = 'pdf.html';
            } else if (user.role === 'network') {
                redirectTo = 'network.html';
            }

            res.status(200).json({
                success: true,
                message: "Login successful",
                user: {
                    username: user.username,
                    role: user.role || 'viewer',
                    permissions: permissions
                },
                redirectTo: redirectTo
            });
        } else {
            res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Gaming endpoints - only accessible with gaming credentials
app.get("/api/chess/games", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    // Return list of active games
    const games = Array.from(chessGames.values()).map(game => ({
        id: game.id,
        players: game.players,
        status: game.status,
        turn: game.turn,
        createdAt: game.createdAt
    }));

    res.json(games);
});

app.post("/api/chess/create", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const gameId = Date.now().toString();
    const newGame = {
        id: gameId,
        players: [req.session.user.username],
        board: initializeChessBoard(),
        turn: 'white',
        status: 'waiting',
        moves: [],
        createdAt: new Date().toISOString()
    };

    chessGames.set(gameId, newGame);

    res.json({ success: true, gameId, game: newGame });
});

app.post("/api/chess/join/:gameId", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId } = req.params;
    const game = chessGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.players.length >= 2) {
        return res.status(400).json({ success: false, message: 'Game is full' });
    }

    if (game.players.includes(req.session.user.username)) {
        return res.status(400).json({ success: false, message: 'Already in this game' });
    }

    game.players.push(req.session.user.username);
    game.status = 'playing';

    // Broadcast game update to all gaming clients
    io.to('gaming-room').emit('game-updated', { gameId, game });

    res.json({ success: true, game });
});

app.post("/api/chess/move", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId, from, to } = req.body;
    const game = chessGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (!game.players.includes(req.session.user.username)) {
        return res.status(403).json({ success: false, message: 'Not a player in this game' });
    }

    // Determine player color
    const playerColor = game.players[0] === req.session.user.username ? 'white' : 'black';

    if (game.turn !== playerColor) {
        return res.status(400).json({ success: false, message: 'Not your turn' });
    }

    // Validate and make move
    if (isValidMove(game.board, from, to, playerColor)) {
        makeMove(game.board, from, to);
        game.moves.push({ from, to, player: req.session.user.username, timestamp: new Date().toISOString() });
        game.turn = game.turn === 'white' ? 'black' : 'white';

        // Check for game end conditions
        if (isCheckmate(game.board, game.turn)) {
            game.status = 'finished';
            game.winner = playerColor;
        } else if (isStalemate(game.board, game.turn)) {
            game.status = 'draw';
        }

        // Broadcast move to all gaming clients
        io.to('gaming-room').emit('move-made', { gameId, move: { from, to }, game });

        res.json({ success: true, game });
    } else {
        res.status(400).json({ success: false, message: 'Invalid move' });
    }
});

// Ludo Game Endpoints
app.get("/api/ludo/games", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const games = Array.from(ludoGames.values()).map(game => ({
        id: game.id,
        players: game.players.map(p => ({ name: p.name })),
        maxPlayers: game.maxPlayers,
        status: game.status,
        createdAt: game.createdAt
    }));

    res.json(games);
});

app.post("/api/ludo/create", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const gameId = 'ludo_' + Date.now().toString();
    const newGame = {
        id: gameId,
        players: [{
            name: req.session.user.username,
            pieces: [
                { position: -1, id: 0 },
                { position: -1, id: 1 },
                { position: -1, id: 2 },
                { position: -1, id: 3 }
            ],
            piecesInGoal: 0
        }],
        maxPlayers: 4,
        status: 'waiting',
        currentPlayerIndex: 0,
        diceRolled: false,
        lastDiceRoll: null,
        board: null,
        createdAt: new Date().toISOString()
    };

    ludoGames.set(gameId, newGame);

    res.json({ success: true, gameId, game: newGame });
});

app.post("/api/ludo/join/:gameId", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId } = req.params;
    const game = ludoGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.players.length >= game.maxPlayers) {
        return res.status(400).json({ success: false, message: 'Game is full' });
    }

    if (game.players.some(p => p.name === req.session.user.username)) {
        return res.status(400).json({ success: false, message: 'Already in this game' });
    }

    game.players.push({
        name: req.session.user.username,
        pieces: [
            { position: -1, id: 0 },
            { position: -1, id: 1 },
            { position: -1, id: 2 },
            { position: -1, id: 3 }
        ],
        piecesInGoal: 0
    });

    io.to('gaming-room').emit('ludo-game-updated', { gameId, game });

    res.json({ success: true, game });
});

app.post("/api/ludo/start/:gameId", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId } = req.params;
    const { playerCount, addComputer, gameMode } = req.body;
    const game = ludoGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    game.maxPlayers = Math.min(Math.max(playerCount, 2), 8);
    game.gameMode = gameMode || 'multi';

    // Add computer players if requested and needed
    if (addComputer && game.players.length < game.maxPlayers) {
        const neededComputers = game.maxPlayers - game.players.length;
        const difficulties = ['Easy', 'Medium', 'Hard'];

        for (let i = 0; i < neededComputers; i++) {
            const difficulty = gameMode === 'single' ? 
                (req.body.difficulty || 'medium').charAt(0).toUpperCase() + (req.body.difficulty || 'medium').slice(1) :
                difficulties[i % difficulties.length];

            game.players.push({
                name: gameMode === 'single' ? `Computer (${difficulty})` : `Computer ${i + 1}`,
                isComputer: true,
                difficulty: gameMode === 'single' ? (req.body.difficulty || 'medium') : 'medium',
                pieces: [
                    { position: -1, id: 0 },
                    { position: -1, id: 1 },
                    { position: -1, id: 2 },
                    { position: -1, id: 3 }
                ],
                piecesInGoal: 0
            });
        }
    }

    game.status = 'playing';
    game.board = initializeLudoBoard();

    io.to('gaming-room').emit('ludo-game-started', { gameId, game });

    res.json({ success: true, game });
});

app.post("/api/ludo/roll/:gameId", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId } = req.params;
    const game = ludoGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.name !== req.session.user.username) {
        return res.status(400).json({ success: false, message: 'Not your turn' });
    }

    if (game.diceRolled) {
        return res.status(400).json({ success: false, message: 'Dice already rolled' });
    }

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    game.lastDiceRoll = diceRoll;
    game.diceRolled = true;

    // Auto-move for computer players or if only one valid move
    setTimeout(() => {
        if (currentPlayer.isComputer || getValidMoves(game, game.currentPlayerIndex, diceRoll).length === 0) {
            // Move to next player
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
            game.diceRolled = false;
            game.lastDiceRoll = null;
        }
    }, 1000);

    io.to('gaming-room').emit('ludo-dice-rolled', { gameId, diceRoll, game });

    res.json({ success: true, game, diceRoll });
});

// Tic-Tac-Toe Game Endpoints
app.get("/api/tictactoe/games", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const games = Array.from(ticTacToeGames.values()).map(game => ({
        id: game.id,
        players: game.players.map(p => p.name),
        status: game.status,
        currentPlayer: game.currentPlayer,
        createdAt: game.createdAt
    }));

    res.json(games);
});

app.post("/api/tictactoe/create", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const gameId = 'ttt_' + Date.now().toString();
    const newGame = {
        id: gameId,
        players: [{
            name: req.session.user.username,
            symbol: 'X'
        }],
        board: Array(9).fill(''),
        currentPlayer: 'X',
        status: 'waiting',
        winner: null,
        createdAt: new Date().toISOString()
    };

    ticTacToeGames.set(gameId, newGame);

    res.json({ success: true, gameId, game: newGame });
});

app.post("/api/tictactoe/join/:gameId", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId } = req.params;
    const game = ticTacToeGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.players.length >= 2) {
        return res.status(400).json({ success: false, message: 'Game is full' });
    }

    if (game.players.some(p => p.name === req.session.user.username)) {
        return res.status(400).json({ success: false, message: 'Already in this game' });
    }

    game.players.push({
        name: req.session.user.username,
        symbol: 'O'
    });
    game.status = 'playing';

    io.to('gaming-room').emit('tictactoe-game-updated', { gameId, game });

    res.json({ success: true, game });
});

app.post("/api/tictactoe/move", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId, position } = req.body;
    const game = ticTacToeGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (!game.players.some(p => p.name === req.session.user.username)) {
        return res.status(403).json({ success: false, message: 'Not a player in this game' });
    }

    const player = game.players.find(p => p.name === req.session.user.username);

    if (game.currentPlayer !== player.symbol) {
        return res.status(400).json({ success: false, message: 'Not your turn' });
    }

    if (game.board[position] !== '') {
        return res.status(400).json({ success: false, message: 'Position already taken' });
    }

    // Make the move
    game.board[position] = player.symbol;

    // Check for winner
    const winner = checkTicTacToeWinner(game.board);
    if (winner) {
        game.status = 'finished';
        game.winner = winner;
    } else if (game.board.every(cell => cell !== '')) {
        game.status = 'draw';
    } else {
        // Switch turns
        game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
    }

    io.to('gaming-room').emit('tictactoe-move-made', { gameId, position, symbol: player.symbol, game });

    res.json({ success: true, game });
});

function checkTicTacToeWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

// UNO Game Endpoints
app.get("/api/uno/games", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const games = Array.from(unoGames.values()).map(game => ({
        id: game.id,
        players: game.players.map(p => p.name),
        maxPlayers: game.maxPlayers,
        status: game.status,
        currentPlayer: game.currentPlayerIndex,
        createdAt: game.createdAt
    }));

    res.json(games);
});

app.post("/api/uno/create", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const gameId = 'uno_' + Date.now().toString();
    const newGame = {
        id: gameId,
        players: [{
            name: req.session.user.username,
            hand: [],
            saidUNO: false
        }],
        maxPlayers: 4,
        deck: [],
        discardPile: [],
        currentPlayerIndex: 0,
        currentColor: '',
        currentNumber: '',
        direction: 1,
        status: 'waiting',
        createdAt: new Date().toISOString()
    };

    unoGames.set(gameId, newGame);

    res.json({ success: true, gameId, game: newGame });
});

app.post("/api/uno/join/:gameId", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId } = req.params;
    const game = unoGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.players.length >= game.maxPlayers) {
        return res.status(400).json({ success: false, message: 'Game is full' });
    }

    if (game.players.some(p => p.name === req.session.user.username)) {
        return res.status(400).json({ success: false, message: 'Already in this game' });
    }

    game.players.push({
        name: req.session.user.username,
        hand: [],
        saidUNO: false
    });

    if (game.players.length >= 2) {
        game.status = 'playing';
        initializeUNOGame(game);
    }

    io.to('gaming-room').emit('uno-game-updated', { gameId, game });

    res.json({ success: true, game });
});

app.post("/api/uno/play-card", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId, cardIndex, chosenColor } = req.body;
    const game = unoGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.name !== req.session.user.username) {
        return res.status(400).json({ success: false, message: 'Not your turn' });
    }

    if (cardIndex >= currentPlayer.hand.length) {
        return res.status(400).json({ success: false, message: 'Invalid card index' });
    }

    const card = currentPlayer.hand[cardIndex];

    // Validate card can be played
    if (!canPlayUNOCard(card, game.currentColor, game.currentNumber)) {
        return res.status(400).json({ success: false, message: 'Cannot play this card' });
    }

    // Play the card
    currentPlayer.hand.splice(cardIndex, 1);
    game.discardPile.push(card);

    // Update game state
    if (card.type === 'wild') {
        game.currentColor = chosenColor || 'red';
    } else {
        game.currentColor = card.color;
    }
    game.currentNumber = card.value;

    // Process card effects
    processUNOCardEffect(game, card);

    // Check for winner
    if (currentPlayer.hand.length === 0) {
        game.status = 'finished';
        game.winner = currentPlayer.name;
    } else {
        // Move to next player
        game.currentPlayerIndex = (game.currentPlayerIndex + game.direction + game.players.length) % game.players.length;
    }

    io.to('gaming-room').emit('uno-card-played', { gameId, card, game });

    res.json({ success: true, game });
});

app.post("/api/uno/draw-card", requireAuth, (req, res) => {
    if (req.session.user.role !== 'gamer') {
        return res.status(403).json({ success: false, message: 'Gaming access required' });
    }

    const { gameId } = req.body;
    const game = unoGames.get(gameId);

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.name !== req.session.user.username) {
        return res.status(400).json({ success: false, message: 'Not your turn' });
    }

    if (game.deck.length === 0) {
        reshuffleUNODeck(game);
    }

    if (game.deck.length > 0) {
        currentPlayer.hand.push(game.deck.pop());

        // Move to next player
        game.currentPlayerIndex = (game.currentPlayerIndex + game.direction + game.players.length) % game.players.length;
    }

    io.to('gaming-room').emit('uno-card-drawn', { gameId, game });

    res.json({ success: true, game });
});

function initializeUNOGame(game) {
    // Create UNO deck
    game.deck = createUNODeck();
    shuffleArray(game.deck);

    // Deal 7 cards to each player
    game.players.forEach(player => {
        player.hand = [];
        for (let i = 0; i < 7; i++) {
            player.hand.push(game.deck.pop());
        }
    });

    // Place first card
    let firstCard;
    do {
        firstCard = game.deck.pop();
    } while (firstCard.type === 'wild');

    game.discardPile = [firstCard];
    game.currentColor = firstCard.color;
    game.currentNumber = firstCard.value;
    game.currentPlayerIndex = 0;
    game.direction = 1;
}

function createUNODeck() {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const specials = ['skip', 'reverse', 'draw2'];
    const deck = [];

    // Number cards
    colors.forEach(color => {
        // One 0 per color
        deck.push({ color, value: '0', type: 'number' });
        // Two of each 1-9 per color
        for (let i = 1; i <= 9; i++) {
            deck.push({ color, value: i.toString(), type: 'number' });
            deck.push({ color, value: i.toString(), type: 'number' });
        }
    });

    // Special cards (2 per color)
    colors.forEach(color => {
        specials.forEach(special => {
            deck.push({ color, value: special, type: 'special' });
            deck.push({ color, value: special, type: 'special' });
        });
    });

    // Wild cards (4 each)
    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', value: 'wild', type: 'wild' });
        deck.push({ color: 'wild', value: 'wild4', type: 'wild' });
    }

    return deck;
}

function canPlayUNOCard(card, currentColor, currentNumber) {
    if (card.type === 'wild') return true;
    return card.color === currentColor || card.value === currentNumber;
}

function processUNOCardEffect(game, card) {
    const nextPlayerIndex = (game.currentPlayerIndex + game.direction + game.players.length) % game.players.length;

    switch (card.value) {
        case 'skip':
            // Skip next player
            game.currentPlayerIndex = (nextPlayerIndex + game.direction + game.players.length) % game.players.length;
            break;
        case 'reverse':
            game.direction *= -1;
            if (game.players.length === 2) {
                // In 2-player game, reverse acts like skip
                game.currentPlayerIndex = (game.currentPlayerIndex + game.direction + game.players.length) % game.players.length;
            }
            break;
        case 'draw2':
            // Next player draws 2 cards and loses turn
            for (let i = 0; i < 2 && game.deck.length > 0; i++) {
                game.players[nextPlayerIndex].hand.push(game.deck.pop());
            }
            game.currentPlayerIndex = (nextPlayerIndex + game.direction + game.players.length) % game.players.length;
            break;
        case 'wild4':
            // Next player draws 4 cards and loses turn
            for (let i = 0; i < 4 && game.deck.length > 0; i++) {
                game.players[nextPlayerIndex].hand.push(game.deck.pop());
            }
            game.currentPlayerIndex = (nextPlayerIndex + game.direction + game.players.length) % game.players.length;
            break;
    }
}

function reshuffleUNODeck(game) {
    if (game.discardPile.length <= 1) return;

    const topCard = game.discardPile.pop();
    game.deck = game.discardPile;
    game.discardPile = [topCard];
    shuffleArray(game.deck);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function initializeLudoBoard() {
    return Array(52).fill(null);
}

function getValidMoves(game, playerIndex, diceRoll) {
    const player = game.players[playerIndex];
    const validMoves = [];

    player.pieces.forEach((piece, pieceIndex) => {
        if (piece.position === -1 && diceRoll === 6) {
            // Can move piece out of home
            validMoves.push({ pieceIndex, from: -1, to: 0 });
        } else if (piece.position >= 0 && piece.position < 51) {
            const newPosition = piece.position + diceRoll;
            if (newPosition <= 56) {
                validMoves.push({ pieceIndex, from: piece.position, to: newPosition });
            }
        }
    });

    return validMoves;
}

// Chess game storage
const chessGames = new Map();

// Ludo game storage
const ludoGames = new Map();

// Tic-Tac-Toe game storage
const ticTacToeGames = new Map();

// UNO game storage
const unoGames = new Map();

// Chess game logic functions
function initializeChessBoard() {
    return [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
}

function isValidMove(board, from, to, playerColor) {
    const [fromRow, fromCol] = [parseInt(from[1]), from.charCodeAt(0) - 97];
    const [toRow, toCol] = [parseInt(to[1]), to.charCodeAt(0) - 97];

    // Basic bounds checking
    if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
        toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
        return false;
    }

    const piece = board[7 - fromRow][fromCol];
    if (!piece) return false;

    // Check if piece belongs to current player
    const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
    if (pieceColor !== playerColor) return false;

    // Basic move validation (simplified)
    return true;
}

function makeMove(board, from, to) {
    const [fromRow, fromCol] = [7 - parseInt(from[1]), from.charCodeAt(0) - 97];
    const [toRow, toCol] = [7 - parseInt(to[1]), to.charCodeAt(0) - 97];

    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = null;
}

function isCheckmate(board, color) {
    // Simplified checkmate detection
    return false;
}

function isStalemate(board, color) {
    // Simplified stalemate detection
    return false;
}

// Logout endpoint
app.post("/api/logout", async (req, res) => {
    try {
        // Mark session as inactive
        if (req.sessionID) {
            await pool.query(
                `UPDATE network_sessions SET is_active = FALSE WHERE session_id = ?`,
                [req.sessionID]
            );
        }

        if (req.session && req.session.user) {
            await logNetworkActivity(req, 'logout', req.session.user.username, req.session.user.role);
        }

        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Could not log out" });
            }
            res.clearCookie('connect.sid');
            res.status(200).json({ success: true, message: "Logged out successfully" });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Check session status
app.get("/api/session", (req, res) => {
    if (req.session && req.session.user) {
        res.status(200).json({
            success: true,
            user: req.session.user
        });
    } else {
        res.status(401).json({ success: false, message: "No active session" });
    }
});

// Initialize network activity tables
async function initializeNetworkTables() {
    try {
        // Create network_activity table for storing all access logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS network_activity (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL,
                username VARCHAR(50),
                user_role VARCHAR(20),
                activity_type VARCHAR(20) NOT NULL,
                page_accessed VARCHAR(100),
                user_agent TEXT,
                browser VARCHAR(50),
                os VARCHAR(50),
                device_info JSON,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ip (ip_address),
                INDEX idx_username (username),
                INDEX idx_timestamp (timestamp)
            )
        `);

        // Create network_sessions table for active session tracking
        await pool.query(`
            CREATE TABLE IF NOT EXISTS network_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(100) UNIQUE NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                username VARCHAR(50),
                user_role VARCHAR(20),
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                pc_info JSON,
                is_active BOOLEAN DEFAULT TRUE,
                INDEX idx_session (session_id),
                INDEX idx_ip (ip_address),
                INDEX idx_active (is_active)
            )
        `);

        console.log('Network monitoring tables initialized');
    } catch (error) {
        console.error('Error initializing network tables:', error);
    }
}

// Call initialization
initializeNetworkTables();

// Middleware to log network activity
async function logNetworkActivity(req, activityType, username = null, role = null) {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   '127.0.0.1';

        const userAgent = req.headers['user-agent'] || '';
        const browser = getBrowserFromUA(userAgent);
        const os = getOSFromUA(userAgent);

        await pool.query(
            `INSERT INTO network_activity (ip_address, username, user_role, activity_type, page_accessed, user_agent, browser, os, device_info) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ip,
                username,
                role,
                activityType,
                req.path,
                userAgent,
                browser,
                os,
                JSON.stringify({
                    referer: req.headers.referer || null,
                    acceptLanguage: req.headers['accept-language'] || null
                })
            ]
        );
    } catch (error) {
        console.error('Error logging network activity:', error);
    }
}

function getBrowserFromUA(ua) {
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown';
}

function getOSFromUA(ua) {
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
}

// Get all active sessions (network role only)
app.get("/api/network/sessions", requireAuth, async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        if (req.session.user.role !== 'network') {
            return res.status(403).json({ success: false, message: 'Network access required' });
        }

        // Get logged-in sessions from database
        const [dbSessions] = await pool.query(
            `SELECT * FROM network_sessions ORDER BY last_activity DESC`
        );

        // Get all network activity logs
        const [activityLogs] = await pool.query(
            `SELECT * FROM network_activity ORDER BY timestamp DESC LIMIT 100`
        );

        console.log(`Network sessions fetched: ${dbSessions.length} sessions, ${activityLogs.length} activity logs`);

        res.json({
            success: true,
            sessions: dbSessions,
            activityLogs: activityLogs,
            totalSessions: dbSessions.length
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Track homepage visits
app.post("/api/network/track-visit", async (req, res) => {
    try {
        const { pcInfo } = req.body;
        await logNetworkActivity(req, 'homepage_visit', 'visitor', 'visitor');

        const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.connection.remoteAddress || 
                   '127.0.0.1';

        // Store visitor info
        await pool.query(
            `INSERT INTO network_sessions (session_id, ip_address, username, user_role, pc_info, is_active) 
             VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE last_activity = CURRENT_TIMESTAMP, pc_info = ?`,
            [`visitor_${ip}_${Date.now()}`, ip, 'visitor', 'visitor', JSON.stringify(pcInfo), true, JSON.stringify(pcInfo)]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking visit:', error);
        res.status(500).json({ success: false });
    }
});

// Extend session
app.post("/api/extend-session", requireAuth, (req, res) => {
    req.session.touch(); // This resets the session timeout
    res.status(200).json({ success: true, message: "Session extended" });
});

app.post("/api/verify-security", async (req, res) => {
    const { username, answer } = req.body;

    try {
        const isValid = await verifySecurityAnswer(username, answer);
        if (isValid) {
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ success: false, message: "Incorrect answer. Please try again." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Verification failed. Please try again." });
    }
});

app.post("/api/change-password", async (req, res) => {
    const { username, newPassword } = req.body;

    try {
        await changePassword(username, newPassword);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Permission management endpoints
app.get("/api/permissions", requireSuperAdmin, async (req, res) => {
    try {
        const permissions = await getAllPermissions();
        res.json(permissions);
    } catch (error) {
        console.error("Error fetching permissions:", error);
        res.status(500).json({ error: "Failed to fetch permissions" });
    }
});

app.post("/api/permissions/update", requireSuperAdmin, async (req, res) => {
    const { role, permissionName, enabled } = req.body;

    try {
        const success = await updatePermission(role, permissionName, enabled);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false, message: "Failed to update permission" });
        }
    } catch (error) {
        console.error("Error updating permission:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/api/user-permissions", requireAuth, async (req, res) => {
    try {
        const userRole = req.session.user.role;
        const permissions = await getUserPermissions(userRole);
        res.json({ permissions });
    } catch (error) {
        console.error("Error fetching user permissions:", error);
        res.status(500).json({ error: "Failed to fetch user permissions" });
    }
});

app.get("/api/supply-orders", requireAuth, async (req, res) => {
    const { year, sort = "serial_no" } = req.query;

    // Whitelist allowed sort columns to prevent SQL injection
    const allowedSortColumns = [
        "serial_no", "supply_order_no", "so_date", "firm_name", "nomenclature", 
        "quantity", "original_date", "revised_date1", "revised_date2", 
        "revised_date3", "build_up", "maint", "misc", "project_less_2cr", "project_more_2cr", "project_no_pdc", 
        "imms_demand_no", "actual_delivery_date", "procurement_mode", "delivery_done", "remarks"
    ];

    const safeSort = allowedSortColumns.includes(sort) ? sort : "serial_no";

    try {
        const [rows] = await pool.query(
            `SELECT id, serial_no, supply_order_no, DATE_FORMAT(so_date, '%Y-%m-%d') as so_date, 
                    firm_name, nomenclature, quantity, 
                    DATE_FORMAT(original_date, '%Y-%m-%d') as original_date, 
                    DATE_FORMAT(revised_date1, '%Y-%m-%d') as revised_date1, 
                    DATE_FORMAT(revised_date2, '%Y-%m-%d') as revised_date2, 
                    DATE_FORMAT(revised_date3, '%Y-%m-%d') as revised_date3, 
                    build_up, maint, misc, project_less_2cr, project_more_2cr, project_no_pdc, p_np, expenditure_head, rev_cap,
                    imms_demand_no, DATE_FORMAT(actual_delivery_date, '%Y-%m-%d') as actual_delivery_date,
                    procurement_mode, delivery_done, remarks, financial_year 
             FROM supply_orders WHERE financial_year = ? ORDER BY ${safeSort}`,
            [year],
        );
        console.log(`Found ${rows.length} supply orders for year ${year}`);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch supply orders" });
    }
});

// New endpoint to get available supply orders for bill register dropdown
app.get("/api/available-supply-orders", requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT s.supply_order_no, DATE_FORMAT(s.so_date, '%Y-%m-%d') as so_date, s.financial_year, s.firm_name
             FROM supply_orders s
             LEFT JOIN bill_orders b ON s.supply_order_no = b.supply_order_no
             WHERE s.supply_order_no IS NOT NULL 
             AND s.supply_order_no != ''
             AND b.supply_order_no IS NULL
             ORDER BY s.financial_year DESC, s.supply_order_no`,
        );
        res.json(rows.map(row => ({
            value: row.supply_order_no,
            label: `${row.supply_order_no} (${row.financial_year}) - ${row.firm_name}`,
            so_date: row.so_date,
            financial_year: row.financial_year
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch available supply orders" });
    }
});

app.get("/api/demand-orders", requireAuth, async (req, res) => {
    const { year, sort = "serial_no" } = req.query;

    const allowedSortColumns = [
        "serial_no", "demand_date", "imms_demand_no", "mmg_control_no", 
        "nomenclature", "quantity", "expenditure_head", "rev_cap", 
        "procurement_mode", "est_cost", "imms_control_no", "supply_order_placed", "remarks"
    ];

    const safeSort = allowedSortColumns.includes(sort) ? sort : "serial_no";

    try {
        const [rows] = await pool.query(
            `SELECT id, serial_no, imms_demand_no, DATE_FORMAT(demand_date, '%Y-%m-%d') as demand_date, 
                    mmg_control_no, DATE_FORMAT(control_date, '%Y-%m-%d') as control_date, nomenclature, quantity, 
                    expenditure_head, code_head, rev_cap, procurement_mode, est_cost, imms_control_no, 
                    supply_order_placed, remarks, financial_year 
             FROM demand_orders WHERE financial_year = ? ORDER BY ${safeSort}`,
            [year],
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch demand orders" });
    }
});

app.get("/api/bill-orders", requireAuth, async (req, res) => {
    const { year, sort = "serial_no" } = req.query;

    const allowedSortColumns = [
        "serial_no", "bill_control_date", "firm_name", "supply_order_no", 
        "so_date", "project_no", "build_up", "maintenance", "project_less_2cr", 
        "project_more_2cr", "procurement_mode", "rev_cap", "date_amount_passed", 
        "ld_amount", "remarks"
    ];

    const safeSort = allowedSortColumns.includes(sort) ? sort : "serial_no";

    try {
        const [rows] = await pool.query(
            `SELECT id, serial_no, DATE_FORMAT(bill_control_date, '%Y-%m-%d') as bill_control_date, 
                    firm_name, supply_order_no, DATE_FORMAT(so_date, '%Y-%m-%d') as so_date, 
                    project_no, build_up, maintenance, project_less_2cr, project_more_2cr, 
                    procurement_mode, rev_cap, date_amount_passed, ld_amount, remarks, financial_year 
             FROM bill_orders WHERE financial_year = ? ORDER BY ${safeSort}`,
            [year],
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch bill orders" });
    }
});

app.get("/api/supply-orders/max-serial", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [rows] = await pool.query(
            "SELECT MAX(serial_no) as maxSerialNo FROM supply_orders WHERE financial_year = ?",
            [year],
        );
        res.json({ maxSerialNo: rows[0].maxSerialNo || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/demand-orders/max-serial", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [rows] = await pool.query(
            "SELECT MAX(serial_no) as maxSerialNo FROM demand_orders WHERE financial_year = ?",
            [year],
        );
        res.json({ maxSerialNo: rows[0].maxSerialNo || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/bill-orders/max-serial", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [rows] = await pool.query(
            "SELECT MAX(serial_no) as maxSerialNo FROM bill_orders WHERE financial_year = ?",
            [year],
        );
        res.json({ maxSerialNo: rows[0].maxSerialNo || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/imms-demand-numbers", requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT DISTINCT imms_demand_no, financial_year FROM demand_orders WHERE supply_order_placed = 'No' AND imms_demand_no IS NOT NULL AND imms_demand_no != '' ORDER BY financial_year DESC, imms_demand_no",
        );
        res.json(rows.map(row => ({
            value: row.imms_demand_no,
            label: `${row.imms_demand_no} (${row.financial_year})`
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch IMMS demand numbers" });
    }
});

app.get("/api/supply-orders/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            "SELECT * FROM supply_orders WHERE id = ?",
            [id],
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send("Not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/demand-orders/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            "SELECT * FROM demand_orders WHERE id = ?",
            [id],
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send("Not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/bill-orders/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            "SELECT * FROM bill_orders WHERE id = ?",
            [id],
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send("Not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/supply-orders", requireAuth, requirePermission('add_records'), async (req, res) => {
    const data = req.body;
    try {
        const [result] = await pool.query(
            `INSERT INTO supply_orders (serial_no, supply_order_no, so_date, firm_name, nomenclature, quantity, 
                original_date, revised_date1, revised_date2, revised_date3, 
                build_up, maint, misc, project_less_2cr, project_more_2cr, project_no_pdc, p_np, expenditure_head, rev_cap, imms_demand_no, actual_delivery_date,
                procurement_mode, delivery_done, remarks, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.serial_no || null,
                data.supply_order_no || null,
                data.so_date || null,
                (data.firm_name && data.firm_name !== 'null') ? data.firm_name : null,
                (data.nomenclature && data.nomenclature !== 'null') ? data.nomenclature : null,
                (data.quantity && data.quantity !== 'null') ? data.quantity : null,
                data.original_date || null,
                data.revised_date1 || null,
                data.revised_date2 || null,
                data.revised_date3 || null,
                (data.build_up && data.build_up !== 'null') ? data.build_up : null,
                (data.maint && data.maint !== 'null') ? data.maint : null,
                (data.misc && data.misc !== 'null') ? data.misc : null,
                data.project_less_2cr || null,
                data.project_more_2cr || null,
                (data.project_no_pdc && data.project_no_pdc !== 'null') ? data.project_no_pdc : null,
                data.p_np || null,
                data.expenditure_head || null,
                data.rev_cap || null,
                data.imms_demand_no || null,
                data.actual_delivery_date || null,
                (data.procurement_mode && data.procurement_mode !== 'null') ? data.procurement_mode : null,
                data.delivery_done || null,
                (data.remarks && data.remarks !== 'null') ? data.remarks : null,
                data.financial_year || null,
            ],
        );

        // Update supply order placed status if IMMS demand number is provided
        await updateSupplyOrderPlacedStatus(data.imms_demand_no, data.financial_year);

        // Broadcast the change to all connected clients
        broadcastDataChange('supply', 'create', { ...data, id: result.insertId }, data.financial_year);

        // Also emit a general data update event for homepage
        io.emit('homepage-data-update', {
            type: 'supply',
            action: 'create',
            financial_year: data.financial_year,
            timestamp: new Date().toISOString()
        });

        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/demand-orders", requireAuth, requirePermission('add_records'), async (req, res) => {
    const data = req.body;
    try {
        const [result] = await pool.query(
            `INSERT INTO demand_orders (serial_no, imms_demand_no, demand_date, mmg_control_no, control_date, nomenclature, quantity, 
                expenditure_head, code_head, rev_cap, procurement_mode, est_cost, imms_control_no, supply_order_placed, remarks, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.serial_no || null,
                data.imms_demand_no || null,
                data.demand_date || null,
                data.mmg_control_no || null,
                data.control_date || null,
                data.nomenclature || null,
                data.quantity || null,
                data.expenditure_head || null,
                data.code_head || null,
                data.rev_cap || null,
                data.procurement_mode || null,
                data.est_cost || null,
                data.imms_control_no || null,
                data.supply_order_placed || 'No',
                data.remarks || null,
                data.financial_year || null,
            ],
        );

        // Broadcast the change to all connected clients
        broadcastDataChange('demand', 'create', { ...data, id: result.insertId }, data.financial_year);

        // Emit homepage data update event
        io.emit('homepage-data-update', {
            type: 'demand',
            action: 'create',
            financial_year: data.financial_year,
            timestamp: new Date().toISOString()
        });

        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/bill-orders", requireAuth, requirePermission('add_records'), async (req, res) => {
    const data = req.body;
    try {
        const [result] = await pool.query(
            `INSERT INTO bill_orders (serial_no, bill_control_date, firm_name, supply_order_no, so_date, 
                project_no, build_up, maintenance, project_less_2cr, project_more_2cr, 
                procurement_mode, rev_cap, date_amount_passed, ld_amount, remarks, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.serial_no || null,
                data.bill_control_date || null,
                (data.firm_name && data.firm_name !== 'null') ? data.firm_name : null,
                data.supply_order_no || null,
                data.so_date || null,
                (data.project_no && data.project_no !== 'null') ? data.project_no : null,
                (data.build_up && data.build_up !== 'null') ? data.build_up : null,
                (data.maintenance && data.maintenance !== 'null') ? data.maintenance : null,
                (data.project_less_2cr && data.project_less_2cr !== 'null') ? data.project_less_2cr : null,
                (data.project_more_2cr && data.project_more_2cr !== 'null') ? data.project_more_2cr : null,
                (data.procurement_mode && data.procurement_mode !== 'null') ? data.procurement_mode : null,
                data.rev_cap || null,
                (data.date_amount_passed && data.date_amount_passed !== 'null') ? data.date_amount_passed : null,
                (data.ld_amount && data.ld_amount !== 'null') ? data.ld_amount : null,
                (data.remarks && data.remarks !== 'null') ? data.remarks : null,
                data.financial_year || null,
            ],
        );

        // Broadcast the change to all connected clients
        broadcastDataChange('bill', 'create', { ...data, id: result.insertId }, data.financial_year);

        // Emit homepage data update event
        io.emit('homepage-data-update', {
            type: 'bill',
            action: 'create',
            financial_year: data.financial_year,
            timestamp: new Date().toISOString()
        });

        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.put("/api/supply-orders/:id", requireAuth, requirePermission('edit_records'), async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE supply_orders SET serial_no = ?, supply_order_no = ?, so_date = ?, firm_name = ?, nomenclature = ?, quantity = ?, 
                original_date = ?, revised_date1 = ?, revised_date2 = ?, revised_date3 = ?, 
                build_up = ?, maint = ?, misc = ?, project_less_2cr = ?, project_more_2cr = ?, project_no_pdc = ?, p_np = ?, expenditure_head = ?, rev_cap = ?, imms_demand_no = ?, 
                actual_delivery_date = ?, procurement_mode = ?, delivery_done = ?, remarks = ?, financial_year = ? 
             WHERE id = ?`,
            [
                data.serial_no || null,
                data.supply_order_no || null,
                data.so_date || null,
                (data.firm_name && data.firm_name !== 'null') ? data.firm_name : null,
                (data.nomenclature && data.nomenclature !== 'null') ? data.nomenclature : null,
                (data.quantity && data.quantity !== 'null') ? data.quantity : null,
                data.original_date || null,
                data.revised_date1 || null,
                data.revised_date2 || null,
                data.revised_date3 || null,
                (data.build_up && data.build_up !== 'null') ? data.build_up : null,
                (data.maint && data.maint !== 'null') ? data.maint : null,
                (data.misc && data.misc !== 'null') ? data.misc : null,
                data.project_less_2cr || null,
                data.project_more_2cr || null,
                (data.project_no_pdc && data.project_no_pdc !== 'null') ? data.project_no_pdc : null,
                data.p_np || null,
                data.expenditure_head || null,
                data.rev_cap || null,
                data.imms_demand_no || null,
                data.actual_delivery_date || null,
                (data.procurement_mode && data.procurement_mode !== 'null') ? data.procurement_mode : null,
                data.delivery_done || null,
                (data.remarks && data.remarks !== 'null') ? data.remarks : null,
                data.financial_year || null,
                id,
            ],
        );

        // Update supply order placed status if IMMS demand number is provided
        await updateSupplyOrderPlacedStatus(data.imms_demand_no, data.financial_year);

        // Broadcast the change to all connected clients
        broadcastDataChange('supply', 'update', { ...data, id }, data.financial_year);

        // Also emit a general data update event for homepage
        io.emit('homepage-data-update', {
            type: 'supply',
            action: 'update',
            financial_year: data.financial_year,
            timestamp: new Date().toISOString()
        });

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.put("/api/demand-orders/:id", requireAuth, requirePermission('edit_records'), async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE demand_orders SET serial_no = ?, imms_demand_no = ?, demand_date = ?, mmg_control_no = ?, control_date = ?, 
                nomenclature = ?, quantity = ?, expenditure_head = ?, code_head = ?, rev_cap = ?, 
                procurement_mode = ?, est_cost = ?, imms_control_no = ?, supply_order_placed = ?, remarks = ?, financial_year = ? 
             WHERE id = ?`,
            [
                data.serial_no || null,
                data.imms_demand_no || null,
                data.demand_date || null,
                data.mmg_control_no || null,
                data.control_date || null,
                data.nomenclature || null,
                data.quantity || null,
                data.expenditure_head || null,
                data.code_head || null,
                data.rev_cap || null,
                data.procurement_mode || null,
                data.est_cost || null,
                data.imms_control_no || null,
                data.supply_order_placed || null,
                data.remarks || null,
                data.financial_year || null,
                id,
            ],
        );

        // Broadcast the change to all connected clients
        broadcastDataChange('demand', 'update', { ...data, id }, data.financial_year);

        // Emit homepage data update event
        io.emit('homepage-data-update', {
            type: 'demand',
            action: 'update',
            financial_year: data.financial_year,
            timestamp: new Date().toISOString()
        });

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.put("/api/bill-orders/:id", requireAuth, requirePermission('edit_records'), async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE bill_orders SET serial_no = ?, bill_control_date = ?, firm_name = ?, supply_order_no = ?, so_date = ?, 
                project_no = ?, build_up = ?, maintenance = ?, project_less_2cr = ?, project_more_2cr = ?, 
                procurement_mode = ?, rev_cap = ?, date_amount_passed = ?, ld_amount = ?, remarks = ?, financial_year = ? 
             WHERE id = ?`,
            [
                data.serial_no || null,
                data.bill_control_date || null,
                (data.firm_name && data.firm_name !== 'null') ? data.firm_name : null,
                data.supply_order_no || null,
                data.so_date || null,
                (data.project_no && data.project_no !== 'null') ? data.project_no : null,
                (data.build_up && data.build_up !== 'null') ? data.build_up : null,
                (data.maintenance && data.maintenance !== 'null') ? data.maintenance : null,
                (data.project_less_2cr && data.project_less_2cr !== 'null') ? data.project_less_2cr : null,
                (data.project_more_2cr && data.project_more_2cr !== 'null') ? data.project_more_2cr : null,
                (data.procurement_mode && data.procurement_mode !== 'null') ? data.procurement_mode : null,
                data.rev_cap || null,
                (data.date_amount_passed && data.date_amount_passed !== 'null') ? data.date_amount_passed : null,
                (data.ld_amount && data.ld_amount !== 'null') ? data.ld_amount : null,
                (data.remarks && data.remarks !== 'null') ? data.remarks : null,
                data.financial_year || null,
                id,
            ],
        );

        // Broadcast the change to all connected clients
        broadcastDataChange('bill', 'update', { ...data, id }, data.financial_year);

        // Emit homepage data update event
        io.emit('homepage-data-update', {
            type: 'bill',
            action: 'update',
            financial_year: data.financial_year,
            timestamp: new Date().toISOString()
        });

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.delete("/api/supply-orders/:id", requireAuth, requirePermission('delete_records'), async (req, res) => {
    const { id } = req.params;
    try {
        // Get the financial year before deletion for broadcasting
        const [rows] = await pool.query("SELECT financial_year FROM supply_orders WHERE id = ?", [id]);
        const financialYear = rows[0]?.financial_year;

        await pool.query("DELETE FROM supply_orders WHERE id = ?", [id]);

        // Broadcast the change to all connected clients
        if (financialYear) {
            broadcastDataChange('supply', 'delete', { id }, financialYear);

            // Also emit a general data update event for homepage
            io.emit('homepage-data-update', {
                type: 'supply',
                action: 'delete',
                financial_year: financialYear,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.delete("/api/demand-orders/:id", requireAuth, requirePermission('delete_records'), async (req, res) => {
    const { id } = req.params;
    try {
        // Get the financial year before deletion for broadcasting
        const [rows] = await pool.query("SELECT financial_year FROM demand_orders WHERE id = ?", [id]);
        const financialYear = rows[0]?.financial_year;

        await pool.query("DELETE FROM demand_orders WHERE id = ?", [id]);

        // Broadcast the change to all connected clients
        if (financialYear) {
            broadcastDataChange('demand', 'delete', { id }, financialYear);

            // Also emit a general data update event for homepage
            io.emit('homepage-data-update', {
                type: 'demand',
                action: 'delete',
                financial_year: financialYear,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.delete("/api/bill-orders/:id", requireAuth, requirePermission('delete_records'), async (req, res) => {
    const { id } = req.params;
    try {
        // Get the financial year before deletion for broadcasting
        const [rows] = await pool.query("SELECT financial_year FROM bill_orders WHERE id = ?", [id]);
        const financialYear = rows[0]?.financial_year;

        await pool.query("DELETE FROM bill_orders WHERE id = ?", [id]);

        // Broadcast the change to all connected clients
        if (financialYear) {
            broadcastDataChange('bill', 'delete', { id }, financialYear);

            // Also emit a general data update event for homepage
            io.emit('homepage-data-update', {
                type: 'bill',
                action: 'delete',
                financial_year: financialYear,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/supply-orders/move/:id", requireAuth, requirePermission('move_records'), async (req, res) => {
    const { id } = req.params;
    const { direction, financial_year } = req.body;
    try {
        const [rows] = await pool.query(
            "SELECT id, serial_no FROM supply_orders WHERE financial_year = ? ORDER BY serial_no",
            [financial_year],
        );
        const currentIndex = rows.findIndex((row) => row.id == id);
        if (
            currentIndex === -1 ||
            (direction === "up" && currentIndex === 0) ||
            (direction === "down" && currentIndex === rows.length - 1)
        ) {
            return res.status(400).send("Cannot move row");
        }
        const swapIndex =
            direction === "up" ? currentIndex - 1 : currentIndex + 1;
        await pool.query(
            "UPDATE supply_orders SET serial_no = ? WHERE id = ?",
            [rows[swapIndex].serial_no, rows[currentIndex].id],
        );
        await pool.query(
            "UPDATE supply_orders SET serial_no = ? WHERE id = ?",
            [rows[currentIndex].serial_no, rows[swapIndex].id],
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/demand-orders/move/:id", requireAuth, requirePermission('move_records'), async (req, res) => {
    const { id } = req.params;
    const { direction, financial_year } = req.body;
    try {
        const [rows] = await pool.query(
            "SELECT id, serial_no FROM demand_orders WHERE financial_year = ? ORDER BY serial_no",
            [financial_year],
        );
        const currentIndex = rows.findIndex((row) => row.id == id);
        if (
            currentIndex === -1 ||
            (direction === "up" && currentIndex === 0) ||
            (direction === "down" && currentIndex === rows.length - 1)
        ) {
            return res.status(400).send("Cannot move row");
        }
        const swapIndex =
            direction === "up" ? currentIndex - 1 : currentIndex + 1;
        await pool.query(
            "UPDATE demand_orders SET serial_no = ? WHERE id = ?",
            [rows[swapIndex].serial_no, rows[currentIndex].id],
        );
        await pool.query(
            "UPDATE demand_orders SET serial_no = ? WHERE id = ?",
            [rows[currentIndex].serial_no, rows[swapIndex].id],
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/bill-orders/move/:id", requireAuth, requirePermission('move_records'), async (req, res) => {
    const { id } = req.params;
    const { direction, financial_year } = req.body;
    try {
        const [rows] = await pool.query(
            "SELECT id, serial_no FROM bill_orders WHERE financial_year = ? ORDER BY serial_no",
            [financial_year],
        );
        const currentIndex = rows.findIndex((row) => row.id == id);
        if (
            currentIndex === -1 ||
            (direction === "up" && currentIndex === 0) ||
            (direction === "down" && currentIndex === rows.length - 1)
        ) {
            return res.status(400).send("Cannot move row");
        }
        const swapIndex =
            direction === "up" ? currentIndex - 1 : currentIndex + 1;
        await pool.query("UPDATE bill_orders SET serial_no = ? WHERE id = ?", [
            rows[swapIndex].serial_no,
            rows[currentIndex].id,
        ]);
        await pool.query("UPDATE bill_orders SET serial_no = ? WHERE id = ?", [
            rows[currentIndex].serial_no,
            rows[swapIndex].id,
        ]);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/supply-orders/import", requireAuth, requirePermission('import_excel'), async (req, res) => {
    try {
        const { data, financialYear } = req.body;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: 'No data provided' });
        }

        const values = data.map(row => [
            row.serial_no,
            row.supply_order_no,
            row.so_date,
            row.firm_name,
            row.nomenclature,
            row.quantity,
            row.original_date,
            row.revised_date1,
            row.revised_date2,
            row.revised_date3,
            row.build_up,
            row.maint,
            row.misc,
            row.project_less_2cr,
            row.project_more_2cr,
            row.project_no_pdc,
            row.p_np,
            row.expenditure_head,
            row.rev_cap,
            row.imms_demand_no,
            row.actual_delivery_date,
            row.procurement_mode,
            row.delivery_done,
            row.remarks,
            financialYear
        ]);

        await pool.query(
            `INSERT INTO supply_orders (
                serial_no, supply_order_no, so_date, firm_name, nomenclature, quantity,
                original_date, revised_date1, revised_date2, revised_date3,
                build_up, maint, misc, project_less_2cr, project_more_2cr,
                project_no_pdc, p_np, expenditure_head, rev_cap, imms_demand_no,
                actual_delivery_date, procurement_mode, delivery_done, remarks, financial_year
            ) VALUES ?`,
            [values]
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/demand-orders/import", requireAuth, requirePermission('import_excel'), async (req, res) => {
    try {
        const { data, financialYear } = req.body;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: 'No data provided' });
        }

        const values = data.filter(row => {
            // Filter out rows where all values are null
            return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
        }).map(row => [
            row.serial_no || null,
            row.imms_demand_no || null,
            row.demand_date || null,
            row.mmg_control_no || null,
            row.control_date || null,
            row.nomenclature || null,
            row.quantity || null,
            row.expenditure_head || null,
            row.code_head || null,
            row.rev_cap || null,
            row.procurement_mode || null,
            row.est_cost || null,
            row.imms_control_no || null,
            row.supply_order_placed || 'No',
            row.remarks || null,
            financialYear
        ]);

        if (values.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid data to import' });
        }

        await pool.query(
            `INSERT INTO demand_orders (
                serial_no, imms_demand_no, demand_date, mmg_control_no, control_date,
                nomenclature, quantity, expenditure_head, code_head, rev_cap,
                procurement_mode, est_cost, imms_control_no, supply_order_placed,
                remarks, financial_year
            ) VALUES ?`,
            [values]
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/bill-orders/import", requireAuth, requirePermission('import_excel'), async (req, res) => {
    try {
        const { data, financialYear } = req.body;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: 'No data provided' });
        }

        const values = data.filter(row => {
            // Filter out rows where all values are null
            return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
        }).map(row => [
            row.serial_no || null,
            row.bill_control_date || null,
            row.firm_name || null,
            row.supply_order_no || null,
            row.so_date || null,
            row.project_no || null,
            row.build_up || null,
            row.maintenance || null,
            row.project_less_2cr || null,
            row.project_more_2cr || null,
            row.procurement_mode || null,
            row.rev_cap || null,
            row.date_amount_passed || null,
            row.ld_amount || null,
            row.remarks || null,
            financialYear
        ]);

        if (values.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid data to import' });
        }

        await pool.query(
            `INSERT INTO bill_orders (
                serial_no, bill_control_date, firm_name, supply_order_no, so_date,
                project_no, build_up, maintenance, project_less_2cr, project_more_2cr,
                procurement_mode, rev_cap, date_amount_passed, ld_amount, remarks, financial_year
            ) VALUES ?`,
            [values]
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/supply-backups", requireAuth, async (req, res) => {
    try {
        const files = await fs.readdir(backupDirs.supply);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/demand-backups", requireAuth, async (req, res) => {
    try {
        const files = await fs.readdir(backupDirs.demand);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/bill-backups", requireAuth, async (req, res) => {
    try {
        const files = await fs.readdir(backupDirs.bill);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-gen-project-backups", requireAuth, async (req, res) => {
    try {
        const files = await fs.readdir(backupDirs["sanction-gen-project"]);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-misc-backups", requireAuth, async (req, res) => {
    try {
        const files = await fs.readdir(backupDirs["sanction-misc"]);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-training-backups", requireAuth, async (req, res) => {
    try {
        const files = await fs.readdir(backupDirs["sanction-training"]);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

// Sanction Code Register API endpoints
app.get("/api/sanction-gen-project", requireAuth, async (req, res) => {
    const { year, sort = "serial_no" } = req.query;

    const allowedSortColumns = [
        "serial_no", "date", "file_no", "sanction_code", "code",
        "np_proj", "power", "code_head", "rev_cap", "amount",
        "uo_no", "uo_date", "amendment", "financial_year"
    ];
    const safeSort = allowedSortColumns.includes(sort) ? sort : "serial_no";

    try {
        const [rows] = await pool.query(
            `SELECT id, serial_no, DATE_FORMAT(date, '%Y-%m-%d') as date, file_no, sanction_code, code, 
                    np_proj, power, code_head, rev_cap, amount, uo_no, 
                    DATE_FORMAT(uo_date, '%Y-%m-%d') as uo_date, amendment, financial_year 
             FROM sanction_gen_project WHERE financial_year = ? ORDER BY ${safeSort}`,
            [year],
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-misc", requireAuth, async (req, res) => {
    const { year, sort = "serial_no" } = req.query;

    const allowedSortColumns = [
        "serial_no", "date", "file_no", "sanction_code", "code",
        "np_proj", "power", "code_head", "rev_cap", "amount",
        "uo_no", "uo_date", "amendment", "financial_year"
    ];
    const safeSort = allowedSortColumns.includes(sort) ? sort : "serial_no";

    try {
        const [rows] = await pool.query(
            `SELECT id, serial_no, DATE_FORMAT(date, '%Y-%m-%d') as date, file_no, sanction_code, code, 
                    np_proj, power, code_head, rev_cap, amount, uo_no, 
                    DATE_FORMAT(uo_date, '%Y-%m-%d') as uo_date, amendment, financial_year 
             FROM sanction_misc WHERE financial_year = ? ORDER BY ${safeSort}`,
            [year],
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-training", requireAuth, async (req, res) => {
    const { year, sort = "serial_no" } = req.query;

    const allowedSortColumns = [
        "serial_no", "date", "file_no", "sanction_code", "code",
        "np_proj", "power", "code_head", "rev_cap", "amount",
        "uo_no", "uo_date", "amendment", "financial_year"
    ];
    const safeSort = allowedSortColumns.includes(sort) ? sort : "serial_no";

    try {
        const [rows] = await pool.query(
            `SELECT id, serial_no, DATE_FORMAT(date, '%Y-%m-%d') as date, file_no, sanction_code, code, 
                    np_proj, power, code_head, rev_cap, amount, uo_no, 
                    DATE_FORMAT(uo_date, '%Y-%m-%d') as uo_date, amendment, financial_year 
             FROM sanction_training WHERE financial_year = ? ORDER BY ${safeSort}`,
            [year],
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-gen-project/max-serial", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [rows] = await pool.query(
            "SELECT MAX(serial_no) as maxSerialNo FROM sanction_gen_project WHERE financial_year = ?",
            [year],
        );
        res.json({ maxSerialNo: rows[0].maxSerialNo || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-misc/max-serial", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [rows] = await pool.query(
            "SELECT MAX(serial_no) as maxSerialNo FROM sanction_misc WHERE financial_year = ?",
            [year],
        );
        res.json({ maxSerialNo: rows[0].maxSerialNo || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-training/max-serial", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [rows] = await pool.query(
            "SELECT MAX(serial_no) as maxSerialNo FROM sanction_training WHERE financial_year = ?",
            [year],
        );
        res.json({ maxSerialNo: rows[0].maxSerialNo || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-gen-project/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            "SELECT * FROM sanction_gen_project WHERE id = ?",
            [id],
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send("Not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-misc/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            "SELECT * FROM sanction_misc WHERE id = ?",
            [id],
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send("Not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.get("/api/sanction-training/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            "SELECT * FROM sanction_training WHERE id = ?",
            [id],
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send("Not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/sanction-gen-project", requireAuth, requirePermission('add_records'), async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
            `INSERT INTO sanction_gen_project (serial_no, date, file_no, sanction_code, code, np_proj, power, 
                code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.serial_no || null,
                data.date || null,
                data.file_no || null,
                data.sanction_code || null,
                data.code || null,
                data.np_proj || null,
                data.power || null,
                data.code_head || null,
                data.rev_cap || null,
                data.amount || null,
                data.uo_no || null,
                data.uo_date || null,
                data.amendment || null,
                data.financial_year || null,
            ],
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/sanction-misc", requireAuth, requirePermission('add_records'), async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
            `INSERT INTO sanction_misc (serial_no, date, file_no, sanction_code, code, np_proj, power, 
                code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.serial_no || null,
                data.date || null,
                data.file_no || null,
                data.sanction_code || null,
                data.code || null,
                data.np_proj || null,
                data.power || null,
                data.code_head || null,
                data.rev_cap || null,
                data.amount || null,
                data.uo_no || null,
                data.uo_date || null,
                data.amendment || null,
                data.financial_year || null,
            ],
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/sanction-training", requireAuth, requirePermission('add_records'), async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
            `INSERT INTO sanction_training (serial_no, date, file_no, sanction_code, code, np_proj, power, 
                code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.serial_no || null,
                data.date || null,
                data.file_no || null,
                data.sanction_code || null,
                data.code || null,
                data.np_proj || null,
                data.power || null,
                data.code_head || null,
                data.rev_cap || null,
                data.amount || null,
                data.uo_no || null,
                data.uo_date || null,
                data.amendment || null,
                data.financial_year || null,
            ],
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.put("/api/sanction-gen-project/:id", requireAuth, requirePermission('edit_records'), async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE sanction_gen_project SET serial_no = ?, date = ?, file_no = ?, sanction_code = ?, 
                code = ?, np_proj = ?, power = ?, code_head = ?, rev_cap = ?, amount = ?, 
                uo_no = ?, uo_date = ?, amendment = ?, financial_year = ? WHERE id = ?`,
            [
                data.serial_no || null,
                data.date || null,
                data.file_no || null,
                data.sanction_code || null,
                data.code || null,
                data.np_proj || null,
                data.power || null,
                data.code_head || null,
                data.rev_cap || null,
                data.amount || null,
                data.uo_no || null,
                data.uo_date || null,
                data.amendment || null,
                data.financial_year || null,
                id,
            ],
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.put("/api/sanction-misc/:id", requireAuth, requirePermission('edit_records'), async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE sanction_misc SET serial_no = ?, date = ?, file_no = ?, sanction_code = ?, 
                code = ?, np_proj = ?, power = ?, code_head = ?, rev_cap = ?, amount = ?, 
                uo_no = ?, uo_date = ?, amendment = ?, financial_year = ? WHERE id = ?`,
            [
                data.serial_no || null,
                data.date || null,
                data.file_no || null,
                data.sanction_code || null,
                data.code || null,
                data.np_proj || null,
                data.power || null,
                data.code_head || null,
                data.rev_cap || null,
                data.amount || null,
                data.uo_no || null,
                data.uo_date || null,
                data.amendment || null,
                data.financial_year || null,
                id,
            ],
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.put("/api/sanction-training/:id", requireAuth, requirePermission('edit_records'), async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE sanction_training SET serial_no = ?, date = ?, file_no = ?, sanction_code = ?, 
                code = ?, np_proj = ?, power = ?, code_head = ?, rev_cap = ?, amount = ?, 
                uo_no = ?, uo_date = ?, amendment = ?, financial_year = ? WHERE id = ?`,
            [
                data.serial_no || null,
                data.date || null,
                data.file_no || null,
                data.sanction_code || null,
                data.code || null,
                data.np_proj || null,
                data.power || null,
                data.code_head || null,
                data.rev_cap || null,
                data.amount || null,
                data.uo_no || null,
                data.uo_date || null,
                data.amendment || null,
                data.financial_year || null,
                id,
            ],
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.delete("/api/sanction-gen-project/:id", requireAuth, requirePermission('delete_records'), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM sanction_gen_project WHERE id = ?", [id]);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.delete("/api/sanction-misc/:id", requireAuth, requirePermission('delete_records'), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM sanction_misc WHERE id = ?", [id]);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.delete("/api/sanction-training/:id", requireAuth, requirePermission('delete_records'), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM sanction_training WHERE id = ?", [id]);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/sanction-gen-project/move/:id", requireAuth, requirePermission('move_records'), async (req, res) => {
    const { id } = req.params;
    const { direction, financial_year } = req.body;
    try {
        const [rows] = await pool.query(
            "SELECT id, serial_no FROM sanction_gen_project WHERE financial_year = ? ORDER BY serial_no",
            [financial_year],
        );
        const currentIndex = rows.findIndex((row) => row.id == id);
        if (
            currentIndex === -1 ||
            (direction === "up" && currentIndex === 0) ||
            (direction === "down" && currentIndex === rows.length - 1)
        ) {
            return res.status(400).send("Cannot move row");
        }
        const swapIndex =
            direction === "up" ? currentIndex - 1 : currentIndex + 1;
        await pool.query(
            "UPDATE sanction_gen_project SET serial_no = ? WHERE id = ?",
            [rows[swapIndex].serial_no, rows[currentIndex].id],
        );
        await pool.query(
            "UPDATE sanction_gen_project SET serial_no = ? WHERE id = ?",
            [rows[currentIndex].serial_no, rows[swapIndex].id],
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/sanction-misc/move/:id", requireAuth, requirePermission('move_records'), async (req, res) => {
    const { id } = req.params;
    const { direction, financial_year } = req.body;
    try {
        const [rows] = await pool.query(
            "SELECT id, serial_no FROM sanction_misc WHERE financial_year = ? ORDER BY serial_no",
            [financial_year],
        );
        const currentIndex = rows.findIndex((row) => row.id == id);
        if (
            currentIndex === -1 ||
            (direction === "up" && currentIndex === 0) ||
            (direction === "down" && currentIndex === rows.length - 1)
        ) {
            return res.status(400).send("Cannot move row");
        }
        const swapIndex =
            direction === "up" ? currentIndex - 1 : currentIndex + 1;
        await pool.query(
            "UPDATE sanction_misc SET serial_no = ? WHERE id = ?",
            [rows[swapIndex].serial_no, rows[currentIndex].id],
        );
        await pool.query(
            "UPDATE sanction_misc SET serial_no = ? WHERE id = ?",
            [rows[currentIndex].serial_no, rows[swapIndex].id],
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/sanction-training/move/:id", requireAuth, requirePermission('move_records'), async (req, res) => {
    const { id } = req.params;
    const { direction, financial_year } = req.body;
    try {
        const [rows] = await pool.query(
            "SELECT id, serial_no FROM sanction_training WHERE financial_year = ? ORDER BY serial_no",
            [financial_year],
        );
        const currentIndex = rows.findIndex((row) => row.id == id);
        if (
            currentIndex === -1 ||
            (direction === "up" && currentIndex === 0) ||
            (direction === "down" && currentIndex === rows.length - 1)
        ) {
            return res.status(400).send("Cannot move row");
        }
        const swapIndex =
            direction === "up" ? currentIndex - 1 : currentIndex + 1;
        await pool.query(
            "UPDATE sanction_training SET serial_no = ? WHERE id = ?",
            [rows[swapIndex].serial_no, rows[currentIndex].id],
        );
        await pool.query(
            "UPDATE sanction_training SET serial_no = ? WHERE id = ?",
            [rows[currentIndex].serial_no, rows[swapIndex].id],
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/sanction-gen-project/import", requireAuth, requirePermission('import_excel'), async (req, res) => {
    const { data, financial_year } = req.body;
    try {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: 'No data provided' });
        }

        const values = data.filter(row => {
            // Filter out rows where all values are null
            return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
        }).map(row => [
            row.serial_no || null,
            row.date || null,
            row.file_no || null,
            row.sanction_code || null,
            row.code || null,
            row.np_proj || null,
            row.power || null,
            row.code_head || null,
            row.rev_cap || null,
            row.amount || null,
            row.uo_no || null,
            row.uo_date || null,
            row.amendment || null,
            financial_year
        ]);

        if (values.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid data to import' });
        }

        await pool.query(
            `INSERT INTO sanction_gen_project (serial_no, date, file_no, sanction_code, code, np_proj, power, 
                code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) 
             VALUES ?`,
            [values]
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/sanction-misc/import", requireAuth, requirePermission('import_excel'), async (req, res) => {
    const { data, financial_year } = req.body;
    try {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: 'No data provided' });
        }

        const values = data.filter(row => {
            // Filter out rows where all values are null
            return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
        }).map(row => [
            row.serial_no || null,
            row.date || null,
            row.file_no || null,
            row.sanction_code || null,
            row.code || null,
            row.np_proj || null,
            row.power || null,
            row.code_head || null,
            row.rev_cap || null,
            row.amount || null,
            row.uo_no || null,
            row.uo_date || null,
            row.amendment || null,
            financial_year
        ]);

        if (values.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid data to import' });
        }

        await pool.query(
            `INSERT INTO sanction_misc (serial_no, date, file_no, sanction_code, code, np_proj, power, 
                code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) 
             VALUES ?`,
            [values]
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.post("/api/sanction-training/import", requireAuth, requirePermission('import_excel'), async (req, res) => {
    const { data, financial_year } = req.body;
    try {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: 'No data provided' });
        }

        const values = data.filter(row => {
            // Filter out rows where all values are null
            return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
        }).map(row => [
            row.serial_no || null,
            row.date || null,
            row.file_no || null,
            row.sanction_code || null,
            row.code || null,
            row.np_proj || null,
            row.power || null,
            row.code_head || null,
            row.rev_cap || null,
            row.amount || null,
            row.uo_no || null,
            row.uo_date || null,
            row.amendment || null,
            financial_year
        ]);

        if (values.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid data to import' });
        }

        await pool.query(
            `INSERT INTO sanction_training (serial_no, date, file_no, sanction_code, code, np_proj, power, 
                code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) 
             VALUES ?`,
            [values]
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

// Dashboard analytics endpoints
app.get("/api/dashboard/overview", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [supplyResult, demandResult, billResult] = await Promise.all([
            pool.query("SELECT COUNT(*) as count FROM supply_orders WHERE financial_year = ?", [year]),
            pool.query("SELECT COUNT(*) as count FROM demand_orders WHERE financial_year = ?", [year]),
            pool.query("SELECT COUNT(*) as count FROM bill_orders WHERE financial_year = ?", [year])
        ]);

        const [deliveredResult] = await pool.query(
            "SELECT COUNT(*) as count FROM supply_orders WHERE financial_year = ? AND delivery_done = 'Yes'", 
            [year]
        );

        const [totalValueResult] = await pool.query(
            "SELECT SUM(build_up + maintenance + project_less_2cr + project_more_2cr) as total FROM bill_orders WHERE financial_year = ?", 
            [year]
        );

        res.json({
            totalSupply: supplyResult[0][0].count,
            totalDemand: demandResult[0][0].count,
            totalBill: billResult[0][0].count,
            deliveredOrders: deliveredResult[0].count,
            totalValue: totalValueResult[0].total || 0
        });
    } catch (error) {
        console.error("Dashboard overview error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard overview" });
    }
});

app.get("/api/dashboard/trends", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [monthlySupply] = await pool.query(
            `SELECT DATE_FORMAT(original_date, '%Y-%m') as month, COUNT(*) as count 
             FROM supply_orders 
             WHERE financial_year = ? AND original_date IS NOT NULL 
             GROUP BY DATE_FORMAT(original_date, '%Y-%m') 
             ORDER BY month`, 
            [year]
        );

        const [monthlyDemand] = await pool.query(
            `SELECT DATE_FORMAT(demand_date, '%Y-%m') as month, COUNT(*) as count 
             FROM demand_orders 
             WHERE financial_year = ? AND demand_date IS NOT NULL 
             GROUP BY DATE_FORMAT(demand_date, '%Y-%m') 
             ORDER BY month`, 
            [year]
        );

        const [monthlyBill] = await pool.query(
            `SELECT DATE_FORMAT(bill_control_date, '%Y-%m') as month, COUNT(*) as count 
             FROM bill_orders 
             WHERE financial_year = ? AND bill_control_date IS NOT NULL 
             GROUP BY DATE_FORMAT(bill_control_date, '%Y-%m') 
             ORDER BY month`, 
            [year]
        );

        res.json({
            supply: monthlySupply,
            demand: monthlyDemand,
            bill: monthlyBill
        });
    } catch (error) {
        console.error("Dashboard trends error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard trends" });
    }
});

app.get("/api/dashboard/procurement-analysis", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [procurementData] = await pool.query(
            `SELECT procurement_mode, COUNT(*) as count 
             FROM supply_orders 
             WHERE financial_year = ? 
             GROUP BY procurement_mode`, 
            [year]
        );

        res.json(procurementData);
    } catch (error) {
        console.error("Procurement analysis error:", error);
        res.status(500).json({ error: "Failed to fetch procurement analysis" });
    }
});

app.get("/api/dashboard/firm-analysis", requireAuth, async (req, res) => {
    const { year } = req.query;
    try {
        const [firmData] = await pool.query(
            `SELECT firm_name, COUNT(*) as count 
             FROM supply_orders 
             WHERE financial_year = ? 
             GROUP BY firm_name 
             ORDER BY count DESC 
             LIMIT 10`, 
            [year]
        );

        res.json(firmData);
    } catch (error) {
        console.error("Firm analysis error:", error);
        res.status(500).json({ error: "Failed to fetch firm analysis" });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

// Enhanced memory cleanup interval
setInterval(() => {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;

    // Clean up abandoned games
    for (let [gameId, game] of chessGames.entries()) {
        if (game.status === 'abandoned' && new Date(game.createdAt).getTime() < fiveMinutesAgo) {
            chessGames.delete(gameId);
        }
    }

    for (let [gameId, game] of ludoGames.entries()) {
        if (game.status === 'abandoned' && new Date(game.createdAt).getTime() < fiveMinutesAgo) {
            ludoGames.delete(gameId);
        }
    }

    for (let [gameId, game] of ticTacToeGames.entries()) {
        if (game.status === 'abandoned' && new Date(game.createdAt).getTime() < fiveMinutesAgo) {
            ticTacToeGames.delete(gameId);
        }
    }

    for (let [gameId, game] of unoGames.entries()) {
        if (game.status === 'abandoned' && new Date(game.createdAt).getTime() < fiveMinutesAgo) {
            unoGames.delete(gameId);
        }
    }

    // Clean up expired cache entries
    const cacheExpiry = now - CACHE_DURATION;
    const homepageCacheExpiry = now - HOMEPAGE_CACHE_DURATION;

    for (let [key, value] of dataCache.entries()) {
        if (value.timestamp < cacheExpiry) {
            dataCache.delete(key);
        }
    }

    for (let [key, value] of homepageCache.entries()) {
        if (value.timestamp < homepageCacheExpiry) {
            homepageCache.delete(key);
        }
    }

    // Log memory usage with detailed connection info
    const memUsage = process.memoryUsage();
    console.log(`Memory Usage - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`Connections - Total: ${activeConnections}, Homepage: ${homepageConnections}, Auth: ${authenticatedConnections}`);
    console.log(`Cache - Data: ${dataCache.size}, Homepage: ${homepageCache.size}`);
    console.log(`Games - Chess: ${chessGames.size}, Ludo: ${ludoGames.size}, TicTacToe: ${ticTacToeGames.size}, UNO: ${unoGames.size}`);
}, 60000); // Run every minute

// Graceful shutdown handlers to save visitor count
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, saving visitor count...');
    await saveVisitorCount();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, saving visitor count...');
    await saveVisitorCount();
    process.exit(0);
});

process.on('exit', () => {
    console.log('Process exiting...');
});

// Enhanced server startup with port conflict handling
const startServer = () => {
    server.listen(port, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${port}`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.log(
                `Port ${port} is already in use. Trying to kill existing process...`,
            );

            // For Replit environment, try a different port
            const newPort = port + 1;
            console.log(`Attempting to start server on port ${newPort}...`);

            server.listen(newPort, "0.0.0.0", () => {
                console.log(`Server running on http://0.0.0.0:${newPort}`);
            });

            server.on("error", (newErr) => {
                console.error(
                    "Failed to start server on alternative port:",
                    newErr,
                );
                process.exit(1);
            });
        } else {
            console.error("Server error:", err);
            process.exit(1);
        }
    });
};

startServer();