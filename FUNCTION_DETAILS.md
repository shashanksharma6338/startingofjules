
# Material Management Group - Function Details & Architecture

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [File Structure](#file-structure)
- [Core Functions by File](#core-functions-by-file)
- [Function Dependencies](#function-dependencies)
- [Authentication Flow](#authentication-flow)
- [Data Flow](#data-flow)

## 🏗️ Project Overview

This is a comprehensive Material Management System for DRDO with the following key features:
- Role-based authentication (Admin, Viewer, Transfer, PDF, Network)
- Supply, Demand, and Bill order management
- Real-time data updates via WebSocket
- Dashboard analytics with Chart.js
- PDF tools portal
- Network monitoring
- File transfer portal

## 📁 File Structure

```
project/
├── server.js           # Main server file
├── db.js              # Database connection
├── auth.js            # Authentication logic
├── public/
│   ├── homepage.html  # Public homepage
│   ├── index.html     # Main dashboard
│   ├── transfer.html  # File transfer portal
│   ├── pdf.html       # PDF tools portal
│   └── network.html   # Network monitoring
```

## 🔧 Core Functions by File

### 1. server.js (Main Server)

#### `broadcastDataChange(type, action, data, financialYear)`
**Purpose:** Broadcasts real-time data changes to connected WebSocket clients
**Parameters:**
- `type` (string): Type of data (supply, demand, bill)
- `action` (string): Action performed (create, update, delete)
- `data` (object): The data that was changed
- `financialYear` (string): Financial year for targeted broadcast

**Used By:**
- Supply order CRUD operations
- Demand order CRUD operations
- Bill order CRUD operations

**Dependencies:**
- socket.io for WebSocket communication

**Example:**
```javascript
broadcastDataChange('supply', 'create', { ...data, id: result.insertId }, data.financial_year);
```

**Related Files:**
- Links to: `public/index.html` (receives broadcasts)
- Links to: `public/homepage.html` (receives broadcasts)

---

#### `updateSupplyOrderPlacedStatus(imms_demand_no, financial_year)`
**Purpose:** Updates demand order status when supply order is linked via IMMS demand number
**Parameters:**
- `imms_demand_no` (string): The IMMS demand number to update
- `financial_year` (string): Financial year for the update

**Used By:**
- `/api/supply-orders` POST endpoint
- `/api/supply-orders/:id` PUT endpoint

**Dependencies:**
- `db.js` (pool) for database operations

**Example:**
```javascript
await updateSupplyOrderPlacedStatus(data.imms_demand_no, data.financial_year);
```

**Related Files:**
- Updates: Demand orders table
- Called from: Supply order endpoints

---

#### `requireAuth(req, res, next)`
**Purpose:** Authentication middleware - checks if user has valid session
**Parameters:**
- `req` (object): Express request object
- `res` (object): Express response object
- `next` (function): Express next function

**Used By:**
- All protected API endpoints

**Dependencies:**
- express-session for session management

**Example:**
```javascript
app.get("/api/supply-orders", requireAuth, async (req, res) => { ... });
```

**Related Files:**
- Used by: All protected routes in `server.js`
- Depends on: Session middleware

---

#### `requirePermission(permissionName)`
**Purpose:** Permission-based access control middleware
**Parameters:**
- `permissionName` (string): The permission name to check

**Returns:** Express middleware function

**Used By:**
- Feature-specific endpoints throughout the application

**Dependencies:**
- `auth.js` (getUserPermissions)
- Session management

**Example:**
```javascript
app.post("/api/supply-orders", requirePermission('add_records'), async (req, res) => { ... });
```

**Related Files:**
- Uses: `auth.js::getUserPermissions()`
- Used by: Protected endpoints

---

#### `getCachedData(key)` & `setCachedData(key, data)`
**Purpose:** Cache management for improved performance
**Parameters:**
- `key` (string): Cache key identifier
- `data` (any): Data to cache

**Used By:**
- Data fetch endpoints

**Dependencies:**
- In-memory Map storage

**Example:**
```javascript
const cached = getCachedData(`supply-${year}`);
if (cached) return res.json(cached);
```

**Related Files:**
- Used by: All data fetch endpoints
- Cleared by: Data modification endpoints

---

### 2. auth.js (Authentication Module)

#### `initializeAuth()`
**Purpose:** Initializes the authentication system
**Actions:**
- Creates users table
- Creates permissions table
- Creates default users (admin, viewer, king, permission, transfer, pdf, network)
- Initializes default permissions

**Used By:**
- `server.js` on startup

**Dependencies:**
- `db.js` (pool connection)
- bcryptjs for password hashing

**Example:**
```javascript
initializeAuth(); // Called in server.js
```

**Related Files:**
- Creates: users table, permissions table
- Used by: `server.js`

---

#### `authenticateUser(username, password)`
**Purpose:** Authenticates a user by verifying username and password
**Parameters:**
- `username` (string): The username to authenticate
- `password` (string): The plain text password to verify

**Returns:** User object if authenticated, false otherwise

**Used By:**
- `/api/login` endpoint in `server.js`

**Dependencies:**
- `db.js` (pool)
- bcryptjs for password comparison

**Example:**
```javascript
const user = await authenticateUser(username, password);
if (user) { /* Login successful */ }
```

**Related Files:**
- Called by: `server.js::POST /api/login`
- Queries: users table

---

#### `getUserPermissions(role)`
**Purpose:** Retrieves all enabled permissions for a specific user role
**Parameters:**
- `role` (string): The user role (viewer, admin, gamer, super_admin)

**Returns:** Array of permission names

**Used By:**
- `server.js` login endpoint
- `requirePermission` middleware
- Permissions endpoints

**Dependencies:**
- `db.js` (pool)

**Example:**
```javascript
const permissions = await getUserPermissions('admin');
// Returns: ['view_supply_register', 'add_records', ...]
```

**Related Files:**
- Called by: `server.js::POST /api/login`
- Called by: `server.js::requirePermission()`
- Queries: permissions table

---

### 3. db.js (Database Module)

#### `pool` (MySQL Connection Pool)
**Purpose:** Creates and manages database connection pool
**Configuration:**
- connectionLimit: 50
- acquireTimeout: 30000ms
- timeout: 30000ms
- queueLimit: 150

**Used By:**
- All database operations in `server.js` and `auth.js`

**Dependencies:**
- mysql2/promise

**Example:**
```javascript
const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
```

**Related Files:**
- Used by: `server.js`, `auth.js`
- Connects to: MySQL database

---

### 4. public/homepage.html

#### `loadAnalyticsData(year)`
**Purpose:** Loads and displays analytics data for a specific financial year
**Parameters:**
- `year` (string): Financial year (e.g., "2025-2026")

**Actions:**
- Fetches supply, demand, and bill orders
- Updates statistics cards
- Creates/updates charts

**Dependencies:**
- `/api/public/supply-orders?year=${year}`
- `/api/public/demand-orders?year=${year}`
- `/api/public/bill-orders?year=${year}`

**Example:**
```javascript
await loadAnalyticsData('2025-2026');
```

**Related Files:**
- Calls: `server.js::GET /api/public/*-orders`
- Updates: Chart.js charts
- Uses: `updateAnalyticsStats()`, `createAnalyticsCharts()`

---

#### `createTrendChart(supplyData, demandData, billData)`
**Purpose:** Creates monthly trend chart for orders
**Parameters:**
- `supplyData` (array): Supply order data
- `demandData` (array): Demand order data
- `billData` (array): Bill order data

**Used By:**
- `loadAnalyticsData()`

**Dependencies:**
- Chart.js library

**Example:**
```javascript
createTrendChart(supplyData, demandData, billData);
```

**Related Files:**
- Called by: `loadAnalyticsData()`
- Renders to: `#analytics-trend-chart` canvas

---

#### `loadVisitorCounter()`
**Purpose:** Loads and displays visitor count
**Actions:**
- Increments visitor count via API
- Updates display with animation

**Dependencies:**
- `/api/public/visitor-count`

**Example:**
```javascript
await loadVisitorCounter();
```

**Related Files:**
- Calls: `server.js::GET /api/public/visitor-count`
- Updates: `#visitor-count` element

---

### 5. public/index.html (Main Dashboard)

#### `loadData(type, year, sortColumn)`
**Purpose:** Loads data for a specific register type
**Parameters:**
- `type` (string): Register type (supply, demand, bill)
- `year` (string): Financial year
- `sortColumn` (string): Column to sort by

**Actions:**
- Fetches data from API
- Renders table
- Sets up event listeners

**Dependencies:**
- `/api/${type}-orders?year=${year}&sort=${sortColumn}`

**Example:**
```javascript
await loadData('supply', '2025-2026', 'serial_no');
```

**Related Files:**
- Calls: `server.js::GET /api/*-orders`
- Uses: `renderTable()`, `populateDropdowns()`

---

#### `addData(type)`
**Purpose:** Adds new record to database
**Parameters:**
- `type` (string): Register type (supply, demand, bill)

**Actions:**
- Collects form data
- Sends POST request
- Refreshes table

**Dependencies:**
- `/api/${type}-orders` POST endpoint

**Example:**
```javascript
await addData('supply');
```

**Related Files:**
- Calls: `server.js::POST /api/*-orders`
- Triggers: `broadcastDataChange()` in server

---

### 6. public/transfer.html

#### `handleFileSelect(e)`
**Purpose:** Handles file selection and upload
**Parameters:**
- `e` (event): File input change event

**Actions:**
- Reads files using FileReader
- Stores in localStorage
- Updates UI

**Example:**
```javascript
fileInput.addEventListener('change', handleFileSelect);
```

**Related Files:**
- Stores in: Browser localStorage
- Used by: File transfer functionality

---

#### `downloadFile(id)`
**Purpose:** Downloads a file from storage
**Parameters:**
- `id` (number): File ID

**Actions:**
- Retrieves file from localStorage
- Creates download link
- Triggers download

**Example:**
```javascript
onclick="downloadFile(${file.id})"
```

**Related Files:**
- Reads from: Browser localStorage

---

### 7. public/pdf.html

#### `mergePDFs()`
**Purpose:** Merges multiple PDF files into one
**Actions:**
- Uses PDFLib to merge files
- Creates download

**Dependencies:**
- pdf-lib library

**Example:**
```javascript
await mergePDFs();
```

**Related Files:**
- Standalone functionality
- Uses: pdf-lib

---

#### `splitPDF()`
**Purpose:** Splits PDF by page range
**Actions:**
- Extracts specified pages
- Creates new PDF

**Dependencies:**
- pdf-lib library

**Example:**
```javascript
await splitPDF();
```

**Related Files:**
- Standalone functionality
- Uses: pdf-lib

---

### 8. public/network.html

#### `fetchSessions()`
**Purpose:** Fetches and displays active sessions
**Actions:**
- Gets current session data
- Updates statistics
- Renders session table

**Dependencies:**
- `/api/session`

**Example:**
```javascript
await fetchSessions();
```

**Related Files:**
- Calls: `server.js::GET /api/session`
- Updates: Session table

---

## 🔄 Function Dependencies

### Authentication Flow
```
Client (homepage.html) 
  → POST /api/login (server.js)
    → authenticateUser() (auth.js)
      → pool.query() (db.js)
    → getUserPermissions() (auth.js)
      → pool.query() (db.js)
  → Response with user data and permissions
  → Redirect to appropriate page
```

### Data Fetch Flow
```
Client (index.html)
  → GET /api/supply-orders?year=2025-2026 (server.js)
    → getCachedData() (server.js)
      → If cached: return cached data
      → If not cached:
        → pool.query() (db.js)
        → setCachedData() (server.js)
    → Response with data
  → renderTable() (index.html)
```

### Data Update Flow
```
Client (index.html)
  → POST /api/supply-orders (server.js)
    → requireAuth() middleware (server.js)
    → requirePermission('add_records') (server.js)
      → getUserPermissions() (auth.js)
    → pool.query() INSERT (db.js)
    → updateSupplyOrderPlacedStatus() (server.js)
    → broadcastDataChange() (server.js)
      → socket.io emit to clients
  → Response success
  → Refresh table
```

### Real-time Update Flow
```
Server (broadcastDataChange)
  → socket.io.emit('data-change')
    → All connected clients receive event
      → Client (index.html) socket.on('data-change')
        → loadData() to refresh table
      → Client (homepage.html) socket.on('homepage-data-update')
        → loadAnalyticsData() to refresh charts
```

## 🔑 Key Integration Points

### 1. Login Integration
- **Files:** `homepage.html`, `index.html` → `server.js` → `auth.js` → `db.js`
- **Flow:** User enters credentials → Server authenticates → Creates session → Returns permissions → Redirects based on role

### 2. Data Management Integration
- **Files:** `index.html` → `server.js` → `db.js`
- **Flow:** User performs CRUD → Server validates → Updates database → Broadcasts change → Clients update UI

### 3. Analytics Integration
- **Files:** `homepage.html` → `server.js` → `db.js`
- **Flow:** Page loads → Fetches data for year → Processes data → Renders charts

### 4. File Transfer Integration
- **Files:** `transfer.html` (standalone)
- **Flow:** Upload → Store in localStorage → Download when needed

### 5. PDF Tools Integration
- **Files:** `pdf.html` (standalone with pdf-lib)
- **Flow:** Upload PDF → Process with pdf-lib → Download result

### 6. Network Monitoring Integration
- **Files:** `network.html` → `server.js`
- **Flow:** Fetch session → Display stats → Auto-refresh

## 📊 Database Schema Integration

### Tables Used:
1. **users** - Created by: `auth.js::initializeAuth()`
2. **permissions** - Created by: `auth.js::initializeAuth()`
3. **supply_orders** - Used by: Supply order endpoints
4. **demand_orders** - Used by: Demand order endpoints
5. **bill_orders** - Used by: Bill order endpoints

### Key Relationships:
- `supply_orders.imms_demand_no` → `demand_orders.imms_demand_no`
- `bill_orders.supply_order_no` → `supply_orders.supply_order_no`

---

**Last Updated:** January 2025
**Version:** 1.0.0
