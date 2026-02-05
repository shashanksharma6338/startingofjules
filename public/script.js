const financialYears = [];
for (let year = 2010; year <= 2099; year++) {
  financialYears.push(`${year}-${year + 1}`);
}

// Register Chart.js plugins
Chart.register(ChartDataLabels);

// Global variables
let currentType = "supply";
let currentFinancialYear = getCurrentFinancialYear();
let tableData = [];
let currentUser = null;

// Calculator Variables
let calculatorEnabled = false;
let selectedCells = new Set();
let selectedRows = new Set();
let calculatorData = [];
let manualEntries = [];
let currentCalculation = ""
let previousValue = null;
let currentOperation = null;
let waitingForOperand = false;

// Function to get current financial year (April to March)
function getCurrentFinancialYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

  if (currentMonth >= 4) {
    // April to December
    return `${currentYear}-${currentYear + 1}`;
  } else {
    // January to March
    return `${currentYear - 1}-${currentYear}`;
  }
}
let sessionTimeout = null;
let warningTimeout = null;
let sessionCheckInterval = null;
let socket = null;

// Dashboard charts
let deliveryChart = null;
let trendChart = null;
let comparisonChart = null;
let valueComparisonChart = null;
let advancedChart = null;
let demandPipelineChart = null;

// WebSocket and real-time synchronization functions
function initializeWebSocket() {
  if (currentUser) {
    socket = io({
      auth: {
        sessionId: "session-" + currentUser.username + "-" + Date.now(),
      },
    });

    socket.on("connect", () => {
      console.log("Connected to real-time server");
      // Join rooms for current data views
      joinDataRoom();
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from real-time server");
    });

    socket.on("data-change", (changeData) => {
      handleRealTimeDataChange(changeData);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });
  }
}

function joinDataRoom() {
  if (socket && currentUser) {
    const room = `${currentType}-${currentFinancialYear}`;
    socket.emit("join-room", room);
  }
}

function leaveDataRoom() {
  if (socket && currentUser) {
    const room = `${currentType}-${currentFinancialYear}`;
    socket.emit("leave-room", room);
  }
}

function handleRealTimeDataChange(changeData) {
  const { type, action, data, timestamp } = changeData;

  // Only handle changes for the currently viewed register and year
  if (type !== currentType) return;

  console.log(`Real-time ${action} received for ${type}:`, data);

  // Show notification
  showRealTimeNotification(action, type, data);

  // Refresh the current view
  setTimeout(() => {
    loadData(currentType);
  }, 1000);
}

function showRealTimeNotification(action, type, data) {
  const notification = document.createElement("div");
  notification.className =
    "fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg shadow-lg z-50";

  let message = "";
  switch (action) {
    case "create":
      message = `New ${type} record added`;
      break;
    case "update":
      message = `${type} record updated`;
      break;
    case "delete":
      message = `${type} record deleted`;
      break;
    default:
      message = `${type} data changed`;
  }

  notification.innerHTML = `
    <div class="flex items-center">
      <div class="flex-1">
        <strong>Real-time Update:</strong> ${message}
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-blue-700 hover:text-blue-900">×</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Session management functions
function startSessionTimer() {
  clearTimeout(sessionTimeout);
  clearTimeout(warningTimeout);

  // Warning 5 minutes before timeout (25 minutes)
  warningTimeout = setTimeout(
    () => {
      if (
        confirm(
          "Your session will expire in 5 minutes. Do you want to extend it?",
        )
      ) {
        extendSession();
      }
    },
    25 * 60 * 1000,
  );

  // Auto logout after 30 minutes
  sessionTimeout = setTimeout(
    () => {
      alert("Session expired. Please login again.");
      logout();
    },
    30 * 60 * 1000,
  );
}

function resetSessionTimer() {
  if (currentUser) {
    startSessionTimer();
  }
}

async function extendSession() {
  try {
    const response = await fetch("/api/extend-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      resetSessionTimer();
    }
  } catch (error) {
    console.error("Session extension error:", error);
  }
}

async function checkSession() {
  try {
    const response = await fetch("/api/session");
    if (!response.ok) {
      if (currentUser) {
        alert("Session expired. Please login again.");
        logout();
      }
    }
  } catch (error) {
    console.error("Session check error:", error);
  }
}

// Add activity listeners to reset session timer
function addActivityListeners() {
  const events = [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ];
  events.forEach((event) => {
    document.addEventListener(event, resetSessionTimer, true);
  });
}

// Keyboard shortcuts functionality
function addKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Check if user is typing in an input field
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "SELECT"
    ) {
      return;
    }

    // Prevent shortcuts if user is not logged in
    if (!currentUser) {
      return;
    }

    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "n": // Ctrl/Cmd + N - Add new row
          e.preventDefault();
          addNewRowShortcut();
          break;
        case "f": // Ctrl/Cmd + F - Focus search
          e.preventDefault();
          focusSearchShortcut();
          break;
        case "e": // Ctrl/Cmd + E - Export to Excel
          e.preventDefault();
          exportCurrentRegisterShortcut();
          break;
        case "d": // Ctrl/Cmd + D - Toggle dashboard
          e.preventDefault();
          toggleDashboardShortcut();
          break;
        case "l": // Ctrl/Cmd + L - Logout
          e.preventDefault();
          if (confirm("Are you sure you want to logout?")) {
            logout();
          }
          break;
        case "/": // Ctrl/Cmd + / - Show keyboard shortcuts help
        case "?": // Ctrl/Cmd + ? - Show keyboard shortcuts help
          e.preventDefault();
          showKeyboardShortcutsHelp();
          break;
      }
    } else if (e.altKey) {
      switch (e.key) {
        case "1": // Alt + 1 - Switch to Demand Register
          e.preventDefault();
          switchToRegister("demand");
          break;
        case "2": // Alt + 2 - Switch to Supply Register
          e.preventDefault();
          switchToRegister("supply");
          break;
        case "3": // Alt + 3 - Switch to Bill Register
          e.preventDefault();
          switchToRegister("bill");
          break;
        case "4": // Alt + 4 - Switch to Sanction Register
          e.preventDefault();
          switchToRegister("sanction");
          break;
        case "f": // Alt + F - Toggle advanced filter
          e.preventDefault();
          toggleAdvancedFilterShortcut();
          break;
        case "d": // Alt + D - Toggle dark mode
          e.preventDefault();
          if (currentUser) {
            toggleDarkMode();
          }
          break;
      }
    } else {
      switch (e.key) {
        case "Escape": // ESC - Close modals or cancel edits
          e.preventDefault();
          handleEscapeKey();
          break;
      }
    }
  });
}

// Calculator Functions
function initializeCalculator() {
  const toggleBtn = document.getElementById("toggle-calculator");
  const closeBtn = document.getElementById("close-calculator");
  const calculatorPanel = document.getElementById("side-calculator-panel");

  // Tab switching
  const columnTab = document.getElementById("column-calc-tab");
  const manualTab = document.getElementById("manual-calc-tab");
  const selectionTab = document.getElementById("selection-calc-tab");

  const columnSection = document.getElementById("column-calculator");
  const manualSection = document.getElementById("manual-calculator");
  const selectionSection = document.getElementById("selection-calculator");

  // Only add toggle button listener if it exists
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      if (calculatorPanel.classList.contains("translate-x-full")) {
        calculatorPanel.classList.remove("translate-x-full");
        calculatorPanel.classList.add("open");
        populateCalculatorColumns();
      } else {
        calculatorPanel.classList.add("translate-x-full");
        calculatorPanel.classList.remove("open");
        disableSelection();
      }
    });
  }

  closeBtn.addEventListener("click", () => {
    calculatorPanel.classList.add("translate-x-full");
    calculatorPanel.classList.remove("open");
    disableSelection();
    hideResizeHandle();
  });

  // Tab switching
  columnTab.addEventListener("click", () => switchCalculatorTab("column"));
  manualTab.addEventListener("click", () => switchCalculatorTab("manual"));
  selectionTab.addEventListener("click", () =>
    switchCalculatorTab("selection"),
  );

  // Column Calculator Events
  document
    .getElementById("calc-register-select")
    .addEventListener("change", populateCalculatorColumns);
  document
    .getElementById("calculate-columns")
    .addEventListener("click", calculateColumns);

  // Manual Calculator Events
  initializeManualCalculator();

  // Selection Calculator Events
  document
    .getElementById("enable-selection")
    .addEventListener("click", enableSelection);
  document
    .getElementById("clear-selection")
    .addEventListener("click", clearSelection);
  document
    .getElementById("add-manual-entry")
    .addEventListener("click", addManualEntry);

  // Enter key for manual entry
  document.getElementById("manual-entry").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addManualEntry();
    }
  });
}

function switchCalculatorTab(tab) {
  // Remove active classes
  document
    .querySelectorAll("#side-calculator-panel nav button")
    .forEach((btn) => {
      btn.classList.remove(
        "text-blue-600",
        "border-blue-500",
        "bg-blue-50",
        "dark:bg-blue-900",
      );
      btn.classList.add("text-gray-500", "border-transparent");
    });

  // Hide all sections
  document.getElementById("column-calculator").classList.add("hidden");
  document.getElementById("manual-calculator").classList.add("hidden");
  document.getElementById("selection-calculator").classList.add("hidden");

  // Show selected section and activate tab
  if (tab === "column") {
    document
      .getElementById("column-calc-tab")
      .classList.add(
        "text-blue-600",
        "border-blue-500",
        "bg-blue-50",
        "dark:bg-blue-900",
      );
    document
      .getElementById("column-calc-tab")
      .classList.remove("text-gray-500", "border-transparent");
    document.getElementById("column-calculator").classList.remove("hidden");
    populateCalculatorColumns();
  } else if (tab === "manual") {
    document
      .getElementById("manual-calc-tab")
      .classList.add(
        "text-blue-600",
        "border-blue-500",
        "bg-blue-50",
        "dark:bg-blue-900",
      );
    document
      .getElementById("manual-calc-tab")
      .classList.remove("text-gray-500", "border-transparent");
    document.getElementById("manual-calculator").classList.remove("hidden");
  } else if (tab === "selection") {
    document
      .getElementById("selection-calc-tab")
      .classList.add(
        "text-blue-600",
        "border-blue-500",
        "bg-blue-50",
        "dark:bg-blue-900",
      );
    document
      .getElementById("selection-calc-tab")
      .classList.remove("text-gray-500", "border-transparent");
    document.getElementById("selection-calculator").classList.remove("hidden");
  }
}

function populateCalculatorColumns() {
  const registerSelect = document.getElementById("calc-register-select");
  const columnsContainer = document.getElementById("calculator-columns");
  const selectedRegister = registerSelect.value;

  columnsContainer.innerHTML = "";

  let columns = [];

  if (selectedRegister === "supply") {
    columns = [
      { id: "quantity", name: "Quantity", numeric: true },
      { id: "project_less_2cr", name: "Project Less than 2Cr", numeric: true },
      { id: "project_more_2cr", name: "Project More than 2Cr", numeric: true },
      { id: "build_up", name: "Build Up", numeric: false },
      { id: "maint", name: "Maintenance", numeric: false },
      { id: "misc", name: "Miscellaneous", numeric: false },
    ];
  } else if (selectedRegister === "demand") {
    columns = [
      { id: "quantity", name: "Quantity", numeric: true },
      { id: "est_cost", name: "Estimated Cost", numeric: true },
    ];
  } else if (selectedRegister === "bill") {
    columns = [
      { id: "build_up", name: "Build Up", numeric: false },
      { id: "maintenance", name: "Maintenance", numeric: false },
      { id: "project_less_2cr", name: "Project Less than 2Cr", numeric: false },
      { id: "project_more_2cr", name: "Project More than 2Cr", numeric: false },
      { id: "ld_amount", name: "LD Amount", numeric: false },
    ];
  } else if (["gen-project", "misc", "training"].includes(selectedRegister)) {
    columns = [
      { id: "serial_no", name: "Serial No", numeric: true },
      { id: "amount", name: "Amount", numeric: true },
      { id: "date", name: "Date", numeric: false },
      { id: "file_no", name: "File No", numeric: false },
      { id: "sanction_code", name: "Sanction Code", numeric: false },
      { id: "code", name: "Code", numeric: false },
      { id: "np_proj", name: "NP/Project", numeric: false },
      { id: "power", name: "Power", numeric: false },
      { id: "code_head", name: "Code Head", numeric: false },
      { id: "rev_cap", name: "Rev/Cap", numeric: false },
      { id: "uo_no", name: "UO No", numeric: false },
      { id: "uo_date", name: "UO Date", numeric: false },
      { id: "amendment", name: "Amendment", numeric: false },
    ];
  }

  columns.forEach((column) => {
    const div = document.createElement("div");
    div.className =
      "flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded";
    div.innerHTML = `
      <input type="checkbox" id="calc-col-${column.id}" value="${column.id}" class="rounded">
      <label for="calc-col-${column.id}" class="flex-1 text-sm cursor-pointer">
        ${column.name} ${column.numeric ? "🔢" : "📝"}
      </label>
    `;
    columnsContainer.appendChild(div);
  });
}

async function calculateColumns() {
  const registerSelect = document.getElementById("calc-register-select");
  const operation = document.getElementById("calc-operation").value;
  const selectedRegister = registerSelect.value;

  // Get selected columns
  const selectedColumns = Array.from(
    document.querySelectorAll(
      '#calculator-columns input[type="checkbox"]:checked',
    ),
  ).map((cb) => cb.value);

  if (selectedColumns.length === 0) {
    document.getElementById("column-results-content").innerHTML =
      '<div class="text-red-500">Please select at least one column</div>';
    return;
  }

  try {
    // Get current financial year
    let yearSelect, apiEndpoint;

    if (selectedRegister === "supply") {
      yearSelect = document.getElementById("financial-year");
      apiEndpoint = `/api/${selectedRegister}-orders`;
    } else if (selectedRegister === "demand") {
      yearSelect = document.getElementById("demand-financial-year");
      apiEndpoint = `/api/${selectedRegister}-orders`;
    } else if (selectedRegister === "bill") {
      yearSelect = document.getElementById("bill-financial-year");
      apiEndpoint = `/api/${selectedRegister}-orders`;
    } else if (["gen-project", "misc", "training"].includes(selectedRegister)) {
      yearSelect = document.getElementById(
        `${selectedRegister}-financial-year`,
      );
      apiEndpoint = `/api/sanction-${selectedRegister}`;
    }

    const year = yearSelect.value;

    // Fetch data
    const response = await fetch(`${apiEndpoint}?year=${year}`);
    const data = await response.json();

    // Calculate for each column
    const results = {};

    selectedColumns.forEach((columnId) => {
      const values = data
        .map((row) => {
          let value = row[columnId];
          if (value === null || value === undefined || value === "")
            return null;

          // Try to parse as number
          const numValue = parseFloat(value);
          return isNaN(numValue) ? null : numValue;
        })
        .filter((v) => v !== null);

      if (values.length === 0) {
        results[columnId] = { error: "No numeric values found" };
        return;
      }

      switch (operation) {
        case "sum":
          results[columnId] = {
            value: values.reduce((a, b) => a + b, 0),
            unit: "Total",
          };
          break;
        case "average":
          results[columnId] = {
            value: values.reduce((a, b) => a + b, 0) / values.length,
            unit: "Average",
          };
          break;
        case "count":
          results[columnId] = { value: values.length, unit: "Count" };
          break;
        case "max":
          results[columnId] = { value: Math.max(...values), unit: "Maximum" };
          break;
        case "min":
          results[columnId] = { value: Math.min(...values), unit: "Minimum" };
          break;
        case "median":
          const sorted = values.sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          results[columnId] = {
            value:
              sorted.length % 2 === 0
                ? (sorted[mid - 1] + sorted[mid]) / 2
                : sorted[mid],
            unit: "Median",
          };
          break;
        case "stddev":
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance =
            values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
            values.length;
          results[columnId] = { value: Math.sqrt(variance), unit: "Std Dev" };
          break;
      }
    });

    // Display results
    let html = "";
    Object.keys(results).forEach((columnId) => {
      const column = results[columnId];
      const columnName = document
        .querySelector(`label[for="calc-col-${columnId}"]`)
        .textContent.replace(/[🔢📝]/g, "")
        .trim();

      if (column.error) {
        html += `<div class="mb-2 p-2 bg-red-100 text-red-700 rounded">
          <strong>${columnName}:</strong> ${column.error}
        </div>`;
      } else {
        html += `<div class="mb-2 p-2 bg-green-100 text-green-700 rounded">
          <strong>${columnName}:</strong><br>
          ${column.unit}: <span class="font-mono">${formatNumber(column.value)}</span>
        </div>`;
      }
    });

    document.getElementById("column-results-content").innerHTML = html;
  } catch (error) {
    console.error("Calculation error:", error);
    document.getElementById("column-results-content").innerHTML =
      '<div class="text-red-500">Error calculating results</div>';
  }
}

function formatNumber(num) {
  if (num % 1 === 0) {
    return num.toLocaleString();
  } else {
    return num.toFixed(2).replace(/\.?0+$/, "");
  }
}

// Manual Calculator Functions
function initializeManualCalculator() {
  const calcButtons = document.querySelectorAll(".calc-btn");
  const display = document.getElementById("calc-display");

  calcButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.number) {
        inputNumber(button.dataset.number);
      } else if (button.dataset.action) {
        performAction(button.dataset.action);
      }
    });
  });
}

function inputNumber(num) {
  const display = document.getElementById("calc-display");

  if (waitingForOperand) {
    display.value = num;
    waitingForOperand = false;
  } else {
    display.value = display.value === "0" ? num : display.value + num;
  }
}

function performAction(action) {
  const display = document.getElementById("calc-display");
  const inputValue = parseFloat(display.value);

  switch (action) {
    case "clear":
      display.value = "0";
      previousValue = null;
      currentOperation = null;
      waitingForOperand = false;
      break;

    case "clear-entry":
      display.value = "0";
      break;

    case "backspace":
      display.value = display.value.slice(0, -1) || "0";
      break;

    case "decimal":
      if (waitingForOperand) {
        display.value = "0.";
        waitingForOperand = false;
      } else if (display.value.indexOf(".") === -1) {
        display.value += ".";
      }
      break;

    case "equals":
      if (currentOperation && previousValue !== null) {
        const result = calculate(previousValue, inputValue, currentOperation);
        display.value = result;
        previousValue = null;
        currentOperation = null;
        waitingForOperand = true;
      }
      break;

    default:
      if (currentOperation && !waitingForOperand) {
        const result = calculate(previousValue, inputValue, currentOperation);
        display.value = result;
        previousValue = result;
      } else {
        previousValue = inputValue;
      }

      currentOperation = action;
      waitingForOperand = true;
  }
}

function calculate(firstValue, secondValue, operation) {
  switch (operation) {
    case "add":
      return firstValue + secondValue;
    case "subtract":
      return firstValue - secondValue;
    case "multiply":
      return firstValue * secondValue;
    case "divide":
      return secondValue !== 0 ? firstValue / secondValue : 0;
    default:
      return secondValue;
  }
}

function addManualEntry() {
  const input = document.getElementById("manual-entry");
  const inputValue = input.value.trim();

  if (!inputValue) {
    alert("Please enter a number or comma-separated numbers");
    return;
  }

  // Check if input contains commas (multiple numbers)
  if (inputValue.includes(",")) {
    const numbers = inputValue
      .split(",")
      .map((num) => num.trim())
      .filter((num) => num !== "");
    let validNumbers = [];
    let invalidNumbers = [];

    numbers.forEach((num) => {
      const parsedNum = parseFloat(num);
      if (isNaN(parsedNum)) {
        invalidNumbers.push(num);
      } else {
        validNumbers.push(parsedNum);
      }
    });

    if (invalidNumbers.length > 0) {
      alert(
        `Invalid numbers found: ${invalidNumbers.join(", ")}\nPlease enter valid numbers separated by commas.`,
      );
      return;
    }

    // Add all valid numbers
    manualEntries.push(...validNumbers);
    input.value = "";

    updateManualEntriesDisplay();
    updateManualStats();

    // Show success message for multiple entries
    if (validNumbers.length > 1) {
      const successMsg = document.createElement("div");
      successMsg.className = "text-green-600 text-sm mt-1";
      successMsg.textContent = `Added ${validNumbers.length} numbers successfully!`;
      input.parentNode.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 2000);
    }
  } else {
    // Single number entry (existing functionality)
    const value = parseFloat(inputValue);

    if (isNaN(value)) {
      alert("Please enter a valid number");
      return;
    }

    manualEntries.push(value);
    input.value = "";

    updateManualEntriesDisplay();
    updateManualStats();
  }
}

function updateManualEntriesDisplay() {
  const container = document.getElementById("manual-entries");

  if (manualEntries.length === 0) {
    container.innerHTML =
      '<div class="text-sm text-gray-500">No entries yet</div>';
    return;
  }

  const html = manualEntries
    .map(
      (entry, index) =>
        `<div class="flex justify-between items-center py-1">
      <span class="font-mono">${entry}</span>
      <button onclick="removeManualEntry(${index})" class="text-red-500 hover:text-red-700 text-xs">×</button>
    </div>`,
    )
    .join("");

  container.innerHTML = html;
}

function removeManualEntry(index) {
  manualEntries.splice(index, 1);
  updateManualEntriesDisplay();
  updateManualStats();
}

function updateManualStats() {
  const statsContainer = document.getElementById("manual-stats");

  if (manualEntries.length === 0) {
    statsContainer.innerHTML = "Add numbers to see statistics";
    return;
  }

  const sum = manualEntries.reduce((a, b) => a + b, 0);
  const avg = sum / manualEntries.length;
  const max = Math.max(...manualEntries);
  const min = Math.min(...manualEntries);

  statsContainer.innerHTML = `
    <div>Sum: <span class="font-mono font-bold">${formatNumber(sum)}</span></div>
    <div>Average: <span class="font-mono font-bold">${formatNumber(avg)}</span></div>
    <div>Count: <span class="font-mono font-bold">${manualEntries.length}</span></div>
    <div>Max: <span class="font-mono font-bold">${formatNumber(max)}</span></div>
    <div>Min: <span class="font-mono font-bold">${formatNumber(min)}</span></div>
  `;
}

// Selection Calculator Functions
let isSelecting = false;
let isDragging = false;
let startCell = null;

function enableSelection() {
  calculatorEnabled = true;
  selectedCells.clear();
  selectedRows.clear();
  isSelecting = false;
  isDragging = false;
  startCell = null;

  // Add click listeners to all table rows and cells
  addSelectionListeners();

  // Make calculator panel semi-transparent and allow click-through for better visibility
  const calculatorPanel = document.getElementById("side-calculator-panel");
  if (calculatorPanel) {
    calculatorPanel.style.opacity = "0.9";
    calculatorPanel.style.pointerEvents = "auto";

    // Add a visual indicator that selection mode is active
    calculatorPanel.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.6)";
    calculatorPanel.style.border = "2px solid #3b82f6";
  }

  // Update UI
  document.getElementById("enable-selection").innerHTML = "✅ Selection Active";
  document
    .getElementById("enable-selection")
    .classList.add("bg-green-600", "animate-pulse");
  document.getElementById("enable-selection").classList.remove("bg-blue-600");

  // Add selection mode indicator
  addSelectionModeIndicator();

  // Show instruction
  showSelectionNotification(
    "Enhanced selection mode enabled! Click rows/cells or drag to select multiple cells for calculation.",
  );
}

function disableSelection() {
  calculatorEnabled = false;
  isSelecting = false;
  isDragging = false;
  startCell = null;

  // Remove selection styling from rows and cells
  document.querySelectorAll(".calculator-selected-row").forEach((row) => {
    row.classList.remove("calculator-selected-row");
    row.style.background = "";
    row.style.boxShadow = "";
    row.style.transform = "";
    row.style.borderLeft = "";
  });

  document.querySelectorAll(".calculator-selected-cell").forEach((cell) => {
    cell.classList.remove("calculator-selected-cell");
    cell.style.background = "";
    cell.style.border = "";
    cell.style.boxShadow = "";
  });

  // Remove checkboxes and badges
  document.querySelectorAll(".row-checkbox").forEach((checkbox) => {
    checkbox.parentElement.parentElement.remove();
  });

  // Reset calculator panel transparency
  const calculatorPanel = document.getElementById("side-calculator-panel");
  if (calculatorPanel) {
    calculatorPanel.style.opacity = "1";
    calculatorPanel.style.boxShadow = "";
    calculatorPanel.style.border = "";
  }

  // Remove bulk selection tools
  const bulkTools = document.querySelector(".bulk-selection-tools");
  if (bulkTools) {
    bulkTools.remove();
  }

  // Remove selection mode indicator
  const indicator = document.getElementById("selection-mode-indicator");
  if (indicator) {
    indicator.remove();
  }

  // Remove click listeners
  removeSelectionListeners();

  // Clear selections
  selectedRows.clear();
  selectedCells.clear();

  // Update UI
  document.getElementById("enable-selection").innerHTML = "🎯 Enable Selection";
  document
    .getElementById("enable-selection")
    .classList.remove("bg-green-600", "animate-pulse");
  document.getElementById("enable-selection").classList.add("bg-blue-600");
}

function addSelectionListeners() {
  const tables = document.querySelectorAll("table tbody tr");
  tables.forEach((row, index) => {
    row.classList.add("calculator-selectable-row");
    row.dataset.rowIndex = index;

    // Add row checkbox
    addRowCheckbox(row, index);

    // Add click listener for row selection
    row.addEventListener("click", (e) => handleRowSelection(e, row));

    // Add visual highlighting on hover when in selection mode
    row.addEventListener("mouseenter", () => handleRowHover(row));
    row.addEventListener("mouseleave", () => handleRowHoverExit(row));

    // Add cell-level selection listeners
    const cells = row.querySelectorAll("td");
    cells.forEach((cell, cellIndex) => {
      cell.classList.add("calculator-selectable-cell");
      cell.dataset.rowIndex = index;
      cell.dataset.cellIndex = cellIndex;

      // Cell click handler
      cell.addEventListener("click", (e) => handleCellSelection(e, cell));

      // Cell drag handlers
      cell.addEventListener("mousedown", (e) => handleCellMouseDown(e, cell));
      cell.addEventListener("mouseenter", (e) => handleCellMouseEnter(e, cell));
      cell.addEventListener("mouseup", (e) => handleCellMouseUp(e, cell));

      // Prevent text selection while dragging
      cell.addEventListener("selectstart", (e) => {
        if (isDragging) e.preventDefault();
      });

      // Cell hover effects
      cell.addEventListener("mouseenter", () => handleCellHover(cell));
      cell.addEventListener("mouseleave", () => handleCellHoverExit(cell));
    });
  });

  // Add global mouse handlers for drag selection
  document.addEventListener("mouseup", handleGlobalMouseUp);
  document.addEventListener("mouseleave", handleGlobalMouseUp);

  // Add bulk selection tools
  addBulkSelectionTools();

  // Add keyboard support for selection
  document.addEventListener("keydown", handleSelectionKeyboard);
}

function removeSelectionListeners() {
  const tables = document.querySelectorAll("table td");
  tables.forEach((cell) => {
    cell.classList.remove("calculator-selectable-cell");
    cell.removeEventListener("click", handleCellSelection);
    cell.removeEventListener("mouseenter", handleCellHover);
    cell.removeEventListener("mouseleave", handleCellHoverExit);
    cell.removeEventListener("mousedown", handleCellMouseDown);
    cell.removeEventListener("mouseenter", handleCellMouseEnter);
    cell.removeEventListener("mouseup", handleCellMouseUp);
    cell.removeEventListener("selectstart", (e) => e.preventDefault());
  });

  document.removeEventListener("mouseup", handleGlobalMouseUp);
  document.removeEventListener("mouseleave", handleGlobalMouseUp);
  document.removeEventListener("keydown", handleSelectionKeyboard);
}

// New cell selection handler functions
function handleCellSelection(event, cell) {
  if (!calculatorEnabled) return;

  // Don't trigger if clicking on row checkbox or other interactive elements
  if (
    event.target.type === "checkbox" ||
    event.target.tagName === "BUTTON" ||
    event.target.tagName === "INPUT" ||
    event.target.tagName === "SELECT"
  ) {
    return;
  }

  event.stopPropagation();
  event.preventDefault();

  const cellKey = `${cell.dataset.rowIndex}_${cell.dataset.cellIndex}`;
  const value = parseFloat(cell.textContent);

  if (cell.classList.contains("calculator-selected-cell")) {
    // Deselect cell
    cell.classList.remove("calculator-selected-cell");
    cell.style.background = "";
    cell.style.border = "";
    cell.style.boxShadow = "";
    selectedCells.delete(cellKey);
    showSelectionNotification(`Cell deselected`);
  } else {
    // Select cell
    cell.classList.add("calculator-selected-cell");
    cell.style.background =
      "linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))";
    cell.style.border = "2px solid #3b82f6";
    cell.style.boxShadow = "0 0 10px rgba(59, 130, 246, 0.5)";
    selectedCells.add(cellKey);

    // Store value for calculation if numeric
    if (!isNaN(value)) {
      cell.dataset.calculatorValue = value;
    }

    showSelectionNotification(`Cell selected`);
  }

  updateSelectionResults();
  updateBulkSelectionControls();
}

function handleCellMouseDown(event, cell) {
  if (!calculatorEnabled) return;

  event.preventDefault();
  isDragging = true;
  startCell = cell;
  isSelecting = !cell.classList.contains("calculator-selected-cell");

  // Select or deselect the starting cell
  const cellKey = `${cell.dataset.rowIndex}_${cell.dataset.cellIndex}`;
  const value = parseFloat(cell.textContent);

  if (isSelecting) {
    cell.classList.add("calculator-selected-cell");
    cell.style.background =
      "linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))";
    cell.style.border = "2px solid #3b82f6";
    cell.style.boxShadow = "0 0 10px rgba(59, 130, 246, 0.5)";
    selectedCells.add(cellKey);

    if (!isNaN(value)) {
      cell.dataset.calculatorValue = value;
    }
  } else {
    cell.classList.remove("calculator-selected-cell");
    cell.style.background = "";
    cell.style.border = "";
    cell.style.boxShadow = "";
    selectedCells.delete(cellKey);
  }

  updateSelectionResults();
  updateBulkSelectionControls();
}

function handleCellMouseEnter(event, cell) {
  if (!calculatorEnabled || !isDragging) return;

  const cellKey = `${cell.dataset.rowIndex}_${cell.dataset.cellIndex}`;
  const value = parseFloat(cell.textContent);

  if (isSelecting && !cell.classList.contains("calculator-selected-cell")) {
    cell.classList.add("calculator-selected-cell");
    cell.style.background =
      "linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))";
    cell.style.border = "2px solid #3b82f6";
    cell.style.boxShadow = "0 0 10px rgba(59, 130, 246, 0.5)";
    selectedCells.add(cellKey);

    if (!isNaN(value)) {
      cell.dataset.calculatorValue = value;
    }
  } else if (
    !isSelecting &&
    cell.classList.contains("calculator-selected-cell")
  ) {
    cell.classList.remove("calculator-selected-cell");
    cell.style.background = "";
    cell.style.border = "";
    cell.style.boxShadow = "";
    selectedCells.delete(cellKey);
  }

  updateSelectionResults();
  updateBulkSelectionControls();
}

function handleCellMouseUp(event, cell) {
  if (!calculatorEnabled) return;

  if (isDragging) {
    isDragging = false;
    startCell = null;
    showSelectionNotification(`Selection completed`);
  }
}

function handleGlobalMouseUp(event) {
  if (isDragging) {
    isDragging = false;
    startCell = null;
  }
}

function handleCellHover(cell) {
  if (!calculatorEnabled) return;

  if (!cell.classList.contains("calculator-selected-cell") && !isDragging) {
    cell.style.background = "rgba(59, 130, 246, 0.1)";
    cell.style.border = "1px solid rgba(59, 130, 246, 0.3)";
    cell.style.transition = "all 0.2s ease";
    cell.style.cursor = "pointer";
  }
}

function handleCellHoverExit(cell) {
  if (!calculatorEnabled) return;

  if (!cell.classList.contains("calculator-selected-cell")) {
    cell.style.background = "";
    cell.style.border = "";
  }
}

function addBulkSelectionTools() {
  const selectionSection = document.getElementById("selection-calculator");
  const existingTools = selectionSection.querySelector(".bulk-selection-tools");

  if (existingTools) {
    existingTools.remove();
  }

  const bulkToolsHtml = `
    <div class="bulk-selection-tools mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg border border-blue-200 dark:border-blue-700">
      <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
        🔧 Bulk Selection Tools
        <span id="live-selection-count" class="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-bold">0 rows</span>
      </h4>
      <div class="grid grid-cols-2 gap-2">
        <button id="select-all-rows" class="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition">
          ✅ Select All Visible
        </button>
        <button id="select-numeric-rows" class="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition">
          🔢 Select Numeric Only
        </button>
        <button id="select-alternate-rows" class="bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition">
          🔄 Select Alternate
        </button>
        <button id="invert-selection" class="bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700 transition">
          🔀 Invert Selection
        </button>
      </div>
    </div>
  `;

  const enableSelectionButton =
    selectionSection.querySelector("#enable-selection");
  enableSelectionButton.insertAdjacentHTML("afterend", bulkToolsHtml);

  // Add event listeners for bulk tools
  document
    .getElementById("select-all-rows")
    .addEventListener("click", selectAllRows);
  document
    .getElementById("select-numeric-rows")
    .addEventListener("click", selectNumericRows);
  document
    .getElementById("select-alternate-rows")
    .addEventListener("click", selectAlternateRows);
  document
    .getElementById("invert-selection")
    .addEventListener("click", invertSelection);
}

function selectAllRows() {
  const rows = document.querySelectorAll(".calculator-selectable-row");
  rows.forEach((row) => {
    const checkbox = row.querySelector(".row-checkbox");
    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
      toggleRowSelection(row, true);
    }
  });
  showSelectionNotification(`Selected all ${rows.length} visible rows`);
}

function selectNumericRows() {
  const rows = document.querySelectorAll(".calculator-selectable-row");
  let numericCount = 0;

  rows.forEach((row) => {
    const hasNumericData = Array.from(row.querySelectorAll("td")).some(
      (cell) => {
        const value = parseFloat(cell.textContent);
        return !isNaN(value) && value !== 0;
      },
    );

    const checkbox = row.querySelector(".row-checkbox");
    if (checkbox && hasNumericData && !checkbox.checked) {
      checkbox.checked = true;
      toggleRowSelection(row, true);
      numericCount++;
    }
  });

  showSelectionNotification(`Selected ${numericCount} rows with numeric data`);
}

function selectAlternateRows() {
  const rows = document.querySelectorAll(".calculator-selectable-row");
  let alternateCount = 0;

  rows.forEach((row, index) => {
    if (index % 2 === 0) {
      const checkbox = row.querySelector(".row-checkbox");
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        toggleRowSelection(row, true);
        alternateCount++;
      }
    }
  });

  showSelectionNotification(`Selected ${alternateCount} alternate rows`);
}

function invertSelection() {
  const rows = document.querySelectorAll(".calculator-selectable-row");

  rows.forEach((row) => {
    const checkbox = row.querySelector(".row-checkbox");
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      toggleRowSelection(row, checkbox.checked);
    }
  });

  showSelectionNotification("Selection inverted");
}

function updateBulkSelectionControls() {
  const liveCount = document.getElementById("live-selection-count");
  if (liveCount) {
    liveCount.textContent = `${selectedRows.size} rows`;

    // Add pulsing animation when count changes
    liveCount.classList.add("animate-pulse");
    setTimeout(() => liveCount.classList.remove("animate-pulse"), 500);
  }
}

function addSelectionModeIndicator() {
  const existingIndicator = document.getElementById("selection-mode-indicator");
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const indicator = document.createElement("div");
  indicator.id = "selection-mode-indicator";
  indicator.className =
    "fixed top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center space-x-2 animate-bounce";
  indicator.innerHTML = `
    <span class="text-lg">🎯</span>
    <span class="font-semibold">Row Selection Mode Active</span>
    <span class="text-sm opacity-75">Click rows to select</span>
  `;

  document.body.appendChild(indicator);

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (indicator.parentElement) {
      indicator.style.transform = "translate(-50%, -100%)";
      indicator.style.opacity = "0";
      setTimeout(() => indicator.remove(), 300);
    }
  }, 3000);
}

function handleRowHover(row) {
  if (!calculatorEnabled) return;

  if (!row.classList.contains("calculator-selected-row")) {
    row.style.background =
      "linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))";
    row.style.transform = "scale(1.005)";
    row.style.transition = "all 0.2s ease";
    row.style.boxShadow = "0 2px 4px rgba(59, 130, 246, 0.2)";
  }
}

function handleRowHoverExit(row) {
  if (!calculatorEnabled) return;

  if (!row.classList.contains("calculator-selected-row")) {
    row.style.background = "";
    row.style.transform = "";
    row.style.boxShadow = "";
  }
}

function handleSelectionKeyboard(event) {
  if (!calculatorEnabled) return;

  // ESC to clear selection
  if (event.key === "Escape") {
    clearSelection();
  }

  // Ctrl+A to select all visible numeric cells
  if (event.ctrlKey && event.key === "a") {
    event.preventDefault();
    selectAllNumericCells();
  }
}

function selectAllNumericCells() {
  const tables = document.querySelectorAll("table td");
  let numericCellsSelected = 0;

  tables.forEach((cell) => {
    const value = parseFloat(cell.textContent);
    if (!isNaN(value) && cell.textContent.trim() !== "") {
      if (!cell.classList.contains("calculator-selected-cell")) {
        cell.classList.add("calculator-selected-cell");
        const cellKey = cell.textContent + "_" + Math.random();
        selectedCells.add(cellKey);
        cell.dataset.calculatorValue = value;
        numericCellsSelected++;
      }
    }
  });

  updateSelectionResults();

  // Show notification
  if (numericCellsSelected > 0) {
    showSelectionNotification(`Selected ${numericCellsSelected} numeric cells`);
  }
}

function showSelectionNotification(message) {
  const notification = document.createElement("div");
  notification.className =
    "fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded-lg shadow-lg z-50";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 2000);
}

function addRowCheckbox(row, index) {
  const firstCell = row.querySelector("td");
  if (!firstCell) return;

  const checkboxContainer = document.createElement("div");
  checkboxContainer.className =
    "absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-8 z-10 opacity-0 transition-opacity duration-200";
  checkboxContainer.innerHTML = `
    <div class="relative">
      <input type="checkbox" class="row-checkbox w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600" data-row-index="${index}">
      <div class="selection-badge absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold opacity-0 transition-opacity duration-200">${selectedRows.size + 1}</div>
    </div>
  `;

  firstCell.style.position = "relative";
  firstCell.appendChild(checkboxContainer);

  // Show checkbox on row hover
  row.addEventListener("mouseenter", () => {
    if (calculatorEnabled) {
      checkboxContainer.style.opacity = "1";
    }
  });

  row.addEventListener("mouseleave", () => {
    if (!row.classList.contains("calculator-selected-row")) {
      checkboxContainer.style.opacity = "0";
    }
  });

  // Handle checkbox click
  const checkbox = checkboxContainer.querySelector(".row-checkbox");
  checkbox.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleRowSelection(row, checkbox.checked);
  });
}

function handleRowSelection(event, row) {
  if (!calculatorEnabled) return;

  // Don't trigger if clicking on checkbox or other interactive elements
  if (
    event.target.type === "checkbox" ||
    event.target.tagName === "BUTTON" ||
    event.target.tagName === "INPUT" ||
    event.target.tagName === "SELECT"
  ) {
    return;
  }

  event.stopPropagation();
  event.preventDefault();

  const checkbox = row.querySelector(".row-checkbox");
  if (checkbox) {
    // Toggle the checkbox state (this allows both select and deselect with single click)
    checkbox.checked = !checkbox.checked;
    toggleRowSelection(row, checkbox.checked);
  }
}

function toggleRowSelection(row, isSelected) {
  const rowIndex = row.dataset.rowIndex;
  const checkboxContainer =
    row.querySelector(".row-checkbox").parentElement.parentElement;
  const badge = checkboxContainer.querySelector(".selection-badge");

  if (isSelected) {
    // Select row
    row.classList.add("calculator-selected-row");
    selectedRows.add(rowIndex);

    // Enhanced visual feedback
    row.style.background =
      "linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15))";
    row.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.3)";
    row.style.transform = "scale(1.01)";
    row.style.borderLeft = "4px solid #3b82f6";

    // Show checkbox and badge
    checkboxContainer.style.opacity = "1";
    badge.style.opacity = "1";
    badge.textContent = selectedRows.size;

    // Extract numeric values from row
    const cells = row.querySelectorAll("td");
    cells.forEach((cell) => {
      const value = parseFloat(cell.textContent);
      if (!isNaN(value)) {
        const cellKey = `${rowIndex}_${cell.cellIndex}_${value}`;
        selectedCells.add(cellKey);
        cell.classList.add("calculator-selected-cell");
      }
    });

    showSelectionNotification(`Row ${parseInt(rowIndex) + 1} selected`);
  } else {
    // Deselect row
    row.classList.remove("calculator-selected-row");
    selectedRows.delete(rowIndex);

    // Reset visual state
    row.style.background = "";
    row.style.boxShadow = "";
    row.style.transform = "";
    row.style.borderLeft = "";

    // Hide checkbox container if no selections remain
    if (selectedRows.size === 0) {
      checkboxContainer.style.opacity = "0";
    } else {
      checkboxContainer.style.opacity = "1";
    }
    badge.style.opacity = "0";

    // Remove cell selections from this row
    const cells = row.querySelectorAll("td");
    cells.forEach((cell) => {
      const value = parseFloat(cell.textContent);
      if (!isNaN(value)) {
        const cellKey = `${rowIndex}_${cell.cellIndex}_${value}`;
        selectedCells.delete(cellKey);
        cell.classList.remove("calculator-selected-cell");
      }
    });

    showSelectionNotification(`Row ${parseInt(rowIndex) + 1} deselected`);
  }

  updateSelectionResults();
  updateBulkSelectionControls();
}

function updateSelectionResults() {
  const values = [];

  // Collect values from selected rows
  document.querySelectorAll(".calculator-selected-row").forEach((row) => {
    const cells = row.querySelectorAll("td");
    cells.forEach((cell) => {
      const value = parseFloat(cell.textContent);
      if (!isNaN(value) && value !== 0) {
        values.push(value);
      }
    });
  });

  // Collect values from individually selected cells
  document.querySelectorAll(".calculator-selected-cell").forEach((cell) => {
    const value = parseFloat(cell.textContent);
    if (!isNaN(value)) {
      // Only add if not already counted from row selection
      const row = cell.closest("tr");
      if (!row.classList.contains("calculator-selected-row")) {
        values.push(value);
      }
    }
  });

  // Update counter with more detailed info
  const selectedRowsCount = selectedRows.size;
  const individualCellsCount = document.querySelectorAll(
    ".calculator-selected-cell",
  ).length;
  const totalSelectedCells = values.length;

  let counterText = "";
  if (selectedRowsCount > 0 && individualCellsCount > 0) {
    counterText = `${selectedRowsCount} rows + ${individualCellsCount} cells (${totalSelectedCells} values)`;
  } else if (selectedRowsCount > 0) {
    counterText = `${selectedRowsCount} rows (${totalSelectedCells} values)`;
  } else if (individualCellsCount > 0) {
    counterText = `${individualCellsCount} cells (${totalSelectedCells} values)`;
  } else {
    counterText = "0 selected";
  }

  document.getElementById("selected-cells-count").textContent = counterText;

  if (values.length === 0) {
    document.getElementById("selection-sum").textContent = "0";
    document.getElementById("selection-average").textContent = "0";
    document.getElementById("selection-count").textContent = "0";
    document.getElementById("selection-max").textContent = "-";
    document.getElementById("selection-min").textContent = "-";
    document.getElementById("selected-values-list").textContent =
      "No numeric values selected";

    // Clear median and std dev if they exist
    const medianEl = document.getElementById("selection-median");
    const stddevEl = document.getElementById("selection-stddev");
    if (medianEl) medianEl.textContent = "-";
    if (stddevEl) stddevEl.textContent = "-";

    return;
  }

  // Calculate results
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const median = calculateMedian(values);
  const stdDev = calculateStandardDeviation(values, average);

  // Update display with enhanced statistics
  document.getElementById("selection-sum").textContent = formatNumber(sum);
  document.getElementById("selection-average").textContent =
    formatNumber(average);
  document.getElementById("selection-count").textContent = values.length;
  document.getElementById("selection-max").textContent = formatNumber(max);
  document.getElementById("selection-min").textContent = formatNumber(min);

  // Add median and standard deviation if not already present
  const resultsContent = document.getElementById("selection-results-content");
  if (!resultsContent.querySelector("#selection-median")) {
    const medianDiv = document.createElement("div");
    medianDiv.innerHTML = 'Median: <span id="selection-median"></span>';
    resultsContent.appendChild(medianDiv);

    const stdDevDiv = document.createElement("div");
    stdDevDiv.innerHTML = 'Std Dev: <span id="selection-stddev"></span>';
    resultsContent.appendChild(stdDevDiv);
  }

  document.getElementById("selection-median").textContent =
    formatNumber(median);
  document.getElementById("selection-stddev").textContent =
    formatNumber(stdDev);

  // Update values list with better formatting
  const sortedValues = [...values].sort((a, b) => b - a);
  const valuesList = sortedValues
    .slice(0, 20)
    .map((v) => formatNumber(v))
    .join(", ");
  const remainingCount =
    sortedValues.length > 20 ? ` ... (${sortedValues.length - 20} more)` : "";
  document.getElementById("selected-values-list").textContent =
    valuesList + remainingCount;
}

function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStandardDeviation(values, mean) {
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

function clearSelection() {
  selectedCells.clear();
  selectedRows.clear();
  isSelecting = false;
  isDragging = false;
  startCell = null;

  // Remove styling from all rows and cells
  document.querySelectorAll(".calculator-selected-row").forEach((row) => {
    row.classList.remove("calculator-selected-row");
    row.style.background = "";
    row.style.boxShadow = "";
    row.style.transform = "";
    row.style.borderLeft = "";

    // Uncheck checkboxes
    const checkbox = row.querySelector(".row-checkbox");
    if (checkbox) {
      checkbox.checked = false;
      checkbox.parentElement.parentElement.style.opacity = "0";
    }
  });

  document.querySelectorAll(".calculator-selected-cell").forEach((cell) => {
    cell.classList.remove("calculator-selected-cell");
    cell.style.background = "";
    cell.style.border = "";
    cell.style.boxShadow = "";
  });

  updateSelectionResults();
  updateBulkSelectionControls();
  showSelectionNotification("All selections cleared");
}

// Global function for removing manual entries
window.removeManualEntry = removeManualEntry;

// Global function for toggling calculator
window.toggleCalculator = function () {
  const calculatorPanel = document.getElementById("side-calculator-panel");

  if (calculatorPanel.classList.contains("translate-x-full")) {
    calculatorPanel.classList.remove("translate-x-full");
    calculatorPanel.classList.add("open");
    populateCalculatorColumns();
    showResizeHandle();
  } else {
    calculatorPanel.classList.add("translate-x-full");
    calculatorPanel.classList.remove("open");
    disableSelection();
    hideResizeHandle();
  }
};

// Resize handle functionality
let isResizing = false;
let startX = 0;
let startWidth = 384; // Default width of 384px (w-96)

function showResizeHandle() {
  const resizeHandle = document.getElementById("left-resize-handle");
  if (resizeHandle) {
    resizeHandle.style.opacity = "1";
    updateResizeHandlePosition();
  }
}

function hideResizeHandle() {
  const resizeHandle = document.getElementById("left-resize-handle");
  if (resizeHandle) {
    resizeHandle.style.opacity = "0";
  }
}

function updateResizeHandlePosition() {
  const calculatorPanel = document.getElementById("side-calculator-panel");
  const resizeHandle = document.getElementById("left-resize-handle");
  if (calculatorPanel && resizeHandle) {
    const panelWidth = calculatorPanel.offsetWidth;
    resizeHandle.style.right = `${panelWidth}px`;
  }
}

function initializeResizeHandle() {
  const resizeHandle = document.getElementById("left-resize-handle");
  const calculatorPanel = document.getElementById("side-calculator-panel");

  if (!resizeHandle || !calculatorPanel) return;

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = calculatorPanel.offsetWidth;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    // Add event listeners to document for mouse move and up
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  });

  function handleResize(e) {
    if (!isResizing) return;

    const deltaX = startX - e.clientX; // Reversed because we're resizing from the left
    const newWidth = Math.max(300, Math.min(800, startWidth + deltaX)); // Min 300px, Max 800px

    calculatorPanel.style.width = `${newWidth}px`;
    resizeHandle.style.right = `${newWidth}px`;
  }

  function stopResize() {
    isResizing = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    // Remove event listeners
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  }
}

// Add keyboard shortcuts functionality
function addKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Check if user is typing in an input field
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "SELECT"
    ) {
      return;
    }

    // Prevent shortcuts if user is not logged in or is a viewer
    if (!currentUser || currentUser.role === "viewer") {
      return;
    }

    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "n": // Ctrl/Cmd + N - Add new row
          e.preventDefault();
          addNewRowShortcut();
          break;
        case "f": // Ctrl/Cmd + F - Focus search
          e.preventDefault();
          focusSearchShortcut();
          break;
        case "e": // Ctrl/Cmd + E - Export to Excel
          e.preventDefault();
          exportCurrentRegisterShortcut();
          break;
        case "d": // Ctrl/Cmd + D - Toggle dashboard
          e.preventDefault();
          toggleDashboardShortcut();
          break;
        case "l": // Ctrl/Cmd + L - Logout
          e.preventDefault();
          if (confirm("Are you sure you want to logout?")) {
            logout();
          }
          break;
        case "/": // Ctrl/Cmd + / - Show keyboard shortcuts help
        case "?": // Ctrl/Cmd + ? - Show keyboard shortcuts help
          e.preventDefault();
          showKeyboardShortcutsHelp();
          break;
      }
    } else if (e.altKey) {
      switch (e.key) {
        case "1": // Alt + 1 - Switch to Demand Register
          e.preventDefault();
          switchToRegister("demand");
          break;
        case "2": // Alt + 2 - Switch to Supply Register
          e.preventDefault();
          switchToRegister("supply");
          break;
        case "3": // Alt + 3 - Switch to Bill Register
          e.preventDefault();
          switchToRegister("bill");
          break;
        case "4": // Alt + 4 - Switch to Sanction Register
          e.preventDefault();
          switchToRegister("sanction");
          break;
        case "f": // Alt + F - Toggle advanced filter
          e.preventDefault();
          toggleAdvancedFilterShortcut();
          break;
        case "d": // Alt + D - Toggle dark mode
          e.preventDefault();
          if (currentUser) {
            toggleDarkMode();
          }
          break;
      }
    } else {
      switch (e.key) {
        case "Escape": // ESC - Close modals or cancel edits
          e.preventDefault();
          handleEscapeKey();
          break;
      }
    }
  });
}

// Keyboard shortcut helper functions
function addNewRowShortcut() {
  const currentRegister = getCurrentActiveRegister();
  if (currentRegister && currentUser && currentUser.role !== "viewer") {
    if (["gen-project", "misc", "training"].includes(currentRegister)) {
      addSanctionRow(currentRegister);
    } else {
      addRow(currentRegister);
    }
  }
}

function focusSearchShortcut() {
  const currentRegister = getCurrentActiveRegister();
  if (currentRegister) {
    const searchInput = document.getElementById(
      `${currentRegister === "supply" ? "" : currentRegister + "-"}search`,
    );
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }
}

function exportCurrentRegisterShortcut() {
  const currentRegister = getCurrentActiveRegister();
  if (currentRegister) {
    if (["gen-project", "misc", "training"].includes(currentRegister)) {
      exportSanctionToExcel(currentRegister);
    } else {
      exportToExcel(currentRegister);
    }
  }
}

function toggleDashboardShortcut() {
  // Check if viewer has permission to view dashboard
  if (currentUser && currentUser.role === "viewer") {
    if (
      !currentUser.permissions ||
      !currentUser.permissions.includes("view_dashboard")
    ) {
      alert("You do not have permission to access the dashboard.");
      return;
    }
  }

  const dashboardModal = document.getElementById("dashboard-modal");
  if (dashboardModal.classList.contains("hidden")) {
    showDashboard();
  } else {
    hideDashboard();
  }
}

function switchToRegister(register) {
  if (register === "demand") {
    document.getElementById("demand-register-btn").click();
  } else if (register === "supply") {
    document.getElementById("supply-register-btn").click();
  } else if (register === "bill") {
    document.getElementById("bill-register-btn").click();
  } else if (register === "sanction") {
    document.getElementById("sanction-register-btn").click();
  }
}

function toggleAdvancedFilterShortcut() {
  const currentRegister = getCurrentActiveRegister();
  if (
    currentRegister &&
    !["gen-project", "misc", "training"].includes(currentRegister)
  ) {
    toggleAdvancedFilter(currentRegister);
  }
}

function handleEscapeKey() {
  // Close dashboard modal if open
  const dashboardModal = document.getElementById("dashboard-modal");
  if (!dashboardModal.classList.contains("hidden")) {
    hideDashboard();
    return;
  }

  // Cancel any active edits
  const editingRows = document.querySelectorAll("tr input, tr select");
  if (editingRows.length > 0) {
    const firstEditingRow = editingRows[0].closest("tr");
    const cancelButton = firstEditingRow.querySelector(
      'button[onclick*="cancelEdit"]',
    );
    if (cancelButton) {
      cancelButton.click();
    }
  }
}

function getCurrentActiveRegister() {
  if (
    !document.getElementById("supply-register").classList.contains("hidden")
  ) {
    return "supply";
  } else if (
    !document.getElementById("demand-register").classList.contains("hidden")
  ) {
    return "demand";
  } else if (
    !document.getElementById("bill-register").classList.contains("hidden")
  ) {
    return "bill";
  } else if (
    !document.getElementById("sanction-register").classList.contains("hidden")
  ) {
    // Check which sanction section is active
    if (
      !document
        .getElementById("gen-project-section")
        .classList.contains("hidden")
    ) {
      return "gen-project";
    } else if (
      !document.getElementById("misc-section").classList.contains("hidden")
    ) {
      return "misc";
    } else if (
      !document.getElementById("training-section").classList.contains("hidden")
    ) {
      return "training";
    }
  }
  return null;
}

// Show keyboard shortcuts help
function showKeyboardShortcutsHelp() {
  const helpContent = `
    <div class="p-6">
      <h3 class="text-lg font-bold mb-4">Keyboard Shortcuts</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 class="font-semibold mb-2">General Actions:</h4>
          <ul class="space-y-1">
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Ctrl/Cmd + N</kbd> - Add new row</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Ctrl/Cmd + F</kbd> - Focus search</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Ctrl/Cmd + E</kbd> - Export to Excel</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Ctrl/Cmd + D</kbd> - Toggle dashboard</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Ctrl/Cmd + L</kbd> - Logout</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">ESC</kbd> - Close modals/Cancel edits</li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-2">Register Navigation:</h4>
          <ul class="space-y-1">
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Alt + 1</kbd> - Demand Register</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Alt + 2</kbd> - Supply Register</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Alt + 3</kbd> - Bill Register</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Alt + 4</kbd> - Sanction Register</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Alt + F</kbd> - Toggle advanced filter</li>
            <li><kbd class="bg-gray-200 px-2 py-1 rounded">Alt + D</kbd> - Toggle dark mode</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Create and show help modal
  const helpModal = document.createElement("div");
  helpModal.className =
    "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center";
  helpModal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4">
      ${helpContent}
      <div class="px-6 pb-6">
        <button onclick="this.closest('.fixed').remove()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(helpModal);
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize dark mode
  initializeDarkMode();

  // Don't initialize keyboard shortcuts on page load - they will be initialized after login
  // Initialize calculator
  initializeCalculator();

  // Initialize resize handle
  initializeResizeHandle();

  const loginForm = document.getElementById("login-form");
  const loginContainer = document.getElementById("login-container");
  const dashboard = document.getElementById("dashboard");
  const alertContainer = document.getElementById("alert-container");
  const supplyRegister = document.getElementById("supply-register");
  const demandRegister = document.getElementById("demand-register");
  const billRegister = document.getElementById("bill-register");
  const sanctionRegister = document.getElementById("sanction-register");
  const supplyFinancialYearSelect = document.getElementById("financial-year");
  const demandFinancialYearSelect = document.getElementById(
    "demand-financial-year",
  );
  const billFinancialYearSelect = document.getElementById(
    "bill-financial-year",
  );
  const genProjectFinancialYearSelect = document.getElementById(
    "gen-project-financial-year",
  );
  const miscFinancialYearSelect = document.getElementById(
    "misc-financial-year",
  );
  const trainingFinancialYearSelect = document.getElementById(
    "training-financial-year",
  );
  const supplyTableBody = document.getElementById("supply-table-body");
  const demandTableBody = document.getElementById("demand-table-body");
  const billTableBody = document.getElementById("bill-table-body");
  const genProjectTableBody = document.getElementById("gen-project-table-body");
  const miscTableBody = document.getElementById("misc-table-body");
  const trainingTableBody = document.getElementById("training-table-body");
  const supplySearchInput = document.getElementById("search");
  const demandSearchInput = document.getElementById("demand-search");
  const billSearchInput = document.getElementById("bill-search");
  const genProjectSearchInput = document.getElementById("gen-project-search");
  const miscSearchInput = document.getElementById("misc-search");
  const trainingSearchInput = document.getElementById("training-search");
  const supplySortSelect = document.getElementById("sort");
  const demandSortSelect = document.getElementById("demand-sort");
  const billSortSelect = document.getElementById("bill-sort");
  const supplyImportExcel = document.getElementById("import-excel-supply");
  const demandImportExcel = document.getElementById("import-excel-demand");
  const billImportExcel = document.getElementById("import-excel-bill");
  const genProjectImportExcel = document.getElementById(
    "import-excel-gen-project",
  );
  const miscImportExcel = document.getElementById("import-excel-misc");
  const trainingImportExcel = document.getElementById("import-excel-training");

  const financialYearSelects = [
    supplyFinancialYearSelect,
    demandFinancialYearSelect,
    billFinancialYearSelect,
    genProjectFinancialYearSelect,
    miscFinancialYearSelect,
    trainingFinancialYearSelect,
  ];

  financialYears.forEach((year) => {
    financialYearSelects.forEach((select) => {
      if (select) {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        if (year === currentFinancialYear) {
          option.selected = true;
        }
        select.appendChild(option);
      }
    });
  });

  const changePasswordContainer = document.getElementById(
    "change-password-container",
  );
  const changePasswordBtn = document.getElementById("change-password-btn");
  const backToLoginBtn = document.getElementById("back-to-login-btn");
  const verifyAnswerBtn = document.getElementById("verify-answer-btn");
  const updatePasswordBtn = document.getElementById("update-password-btn");
  const securityQuestionForm = document.getElementById(
    "security-question-form",
  );
  const newPasswordForm = document.getElementById("new-password-form");

  // Login form handling
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        currentUser = result.user; // Store user info including permissions

        // Check if there's a redirect URL (for transfer users)
        if (result.redirectTo) {
          window.location.href = result.redirectTo;
          return;
        }

        // Set current financial year
        currentFinancialYear = getCurrentFinancialYear();

        // Update all financial year selectors to current year
        const allFinancialYearSelects = [
          supplyFinancialYearSelect,
          demandFinancialYearSelect,
          billFinancialYearSelect,
          genProjectFinancialYearSelect,
          miscFinancialYearSelect,
          trainingFinancialYearSelect,
        ];
        allFinancialYearSelects.forEach((select) => {
          if (select) {
            select.value = currentFinancialYear;
          }
        });

        loginContainer.classList.add("hidden");
        dashboard.classList.remove("hidden");
        updateUIForUserRole(); // Update UI based on role
        startSessionTimer(); // Start session management
        addActivityListeners(); // Add activity listeners

        // Initialize keyboard shortcuts only for authenticated users (not viewers)
        if (currentUser.role !== "viewer") {
          addKeyboardShortcuts();
        }

        // Initialize WebSocket connection
        initializeWebSocket();

        // Start periodic session check
        sessionCheckInterval = setInterval(checkSession, 5 * 60 * 1000); // Check every 5 minutes

        showRegister("supply");
      } else {
        alert(result.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  });

  changePasswordBtn.addEventListener("click", () => {
    loginContainer.classList.add("hidden");
    changePasswordContainer.classList.remove("hidden");
    securityQuestionForm.classList.remove("hidden");
    newPasswordForm.classList.add("hidden");
    document.getElementById("security-answer").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
    window.changePasswordUsername = null;

    // Reset form visibility
    securityQuestionForm.classList.remove("hidden");
    newPasswordForm.classList.add("hidden");
  });

  backToLoginBtn.addEventListener("click", () => {
    changePasswordContainer.classList.add("hidden");
    loginContainer.classList.remove("hidden");

    // Clear form fields
    document.getElementById("change-username").value = "";
    document.getElementById("security-answer").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
    window.changePasswordUsername = null;

    // Reset form visibility
    securityQuestionForm.classList.remove("hidden");
    newPasswordForm.classList.add("hidden");
  });

  verifyAnswerBtn.addEventListener("click", async () => {
    const username = document.getElementById("change-username").value.trim();
    const answer = document
      .getElementById("security-answer")
      .value.toLowerCase()
      .trim();

    if (!username) {
      alert("Please enter a username.");
      return;
    }

    try {
      const response = await fetch("/api/verify-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, answer }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store username for password update
        window.changePasswordUsername = username;
        securityQuestionForm.classList.add("hidden");
        newPasswordForm.classList.remove("hidden");
      } else {
        alert(result.message || "Incorrect answer. Please try again.");
        document.getElementById("security-answer").value = "";
      }
    } catch (error) {
      console.error("Security verification error:", error);
      alert("Verification failed. Please try again.");
    }
  });

  updatePasswordBtn.addEventListener("click", async () => {
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (!newPassword || !confirmPassword) {
      alert("Please fill in both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: window.changePasswordUsername,
          newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(result.message || "Password changed successfully");
        changePasswordContainer.classList.add("hidden");
        loginContainer.classList.remove("hidden");
        document.getElementById("change-username").value = "";
        document.getElementById("security-answer").value = "";
        document.getElementById("new-password").value = "";
        document.getElementById("confirm-password").value = "";
        window.changePasswordUsername = null;
      } else {
        alert(result.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Password change error:", error);
      alert("Password change failed. Please try again.");
    }
  });

  document.getElementById("logout").addEventListener("click", () => {
    logout();
  });

  // Dark mode toggle - only add listener if user is logged in
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", () => {
      toggleDarkMode();
    });
  }

  // Dashboard event listeners
  document.getElementById("dashboard-btn").addEventListener("click", () => {
    showDashboard();
  });

  document.getElementById("close-dashboard").addEventListener("click", () => {
    hideDashboard();
  });

  // Dashboard tab navigation
  document
    .getElementById("overview-tab")
    .addEventListener("click", () => switchDashboardTab("overview"));
  document
    .getElementById("reports-tab")
    .addEventListener("click", () => switchDashboardTab("reports"));
  document
    .getElementById("comparison-tab")
    .addEventListener("click", () => switchDashboardTab("comparison"));
  document
    .getElementById("visualization-tab")
    .addEventListener("click", () => switchDashboardTab("visualization"));

  // Report generation
  document
    .getElementById("generate-report")
    .addEventListener("click", generateReport);
  document
    .getElementById("print-report")
    .addEventListener("click", printReport);
  document
    .getElementById("download-pdf")
    .addEventListener("click", downloadPDF);

  // Comparison functionality
  document
    .getElementById("compare-years")
    .addEventListener("click", compareYears);

  // Advanced visualization
  document
    .getElementById("update-visualization")
    .addEventListener("click", updateAdvancedVisualization);

  // Check for existing session on page load
  checkSession().then(() => {
    fetch("/api/session")
      .then((response) => response.json())
      .then(async (result) => {
        if (result.success && result.user) {
          currentUser = result.user;

          // Get user permissions
          try {
            const permResponse = await fetch("/api/user-permissions");
            const permResult = await permResponse.json();
            currentUser.permissions = permResult.permissions;
          } catch (error) {
            console.error("Error fetching permissions:", error);
            currentUser.permissions = [];
          }

          // Set current financial year
          currentFinancialYear = getCurrentFinancialYear();

          // Update all financial year selectors to current year
          const allFinancialYearSelects = [
            supplyFinancialYearSelect,
            demandFinancialYearSelect,
            billFinancialYearSelect,
            genProjectFinancialYearSelect,
            miscFinancialYearSelect,
            trainingFinancialYearSelect,
          ];
          allFinancialYearSelects.forEach((select) => {
            if (select) {
              select.value = currentFinancialYear;
            }
          });

          loginContainer.classList.add("hidden");
          dashboard.classList.remove("hidden");
          updateUIForUserRole();
          startSessionTimer();
          addActivityListeners();
          sessionCheckInterval = setInterval(checkSession, 5 * 60 * 1000);
          showRegister("supply");
        }
      })
      .catch(() => {
        // Check if user came from homepage with session storage
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
          // Clear session storage and show login form
          sessionStorage.removeItem("user");
        }
        // Session not valid, stay on login page
      });
  });

  document
    .getElementById("supply-register-btn")
    .addEventListener("click", () => showRegister("supply"));
  document
    .getElementById("demand-register-btn")
    .addEventListener("click", () => showRegister("demand"));
  document
    .getElementById("bill-register-btn")
    .addEventListener("click", () => showRegister("bill"));
  document
    .getElementById("sanction-register-btn")
    .addEventListener("click", () => showRegister("sanction"));

  // Sanction code register sub-section navigation
  if (document.getElementById("gen-project-btn")) {
    document
      .getElementById("gen-project-btn")
      .addEventListener("click", () => showSanctionSection("gen-project"));
    document
      .getElementById("misc-btn")
      .addEventListener("click", () => showSanctionSection("misc"));
    document
      .getElementById("training-btn")
      .addEventListener("click", () => showSanctionSection("training"));
  }

  function showSanctionSection(type) {
    document
      .querySelectorAll(".sanction-section")
      .forEach((section) => section.classList.add("hidden"));
    document
      .querySelectorAll("#gen-project-btn, #misc-btn, #training-btn")
      .forEach((btn) => {
        btn.classList.remove("bg-blue-600", "text-white");
        btn.classList.add("bg-gray-200", "hover:bg-gray-300");
      });

    document
      .getElementById(`${type}-btn`)
      .classList.remove("bg-gray-200", "hover:bg-gray-300");
    document
      .getElementById(`${type}-btn`)
      .classList.add("bg-blue-600", "text-white");
    document.getElementById(`${type}-section`).classList.remove("hidden");
    loadSanctionData(type);
  }

  function showRegister(type) {
    // Leave current room before switching
    leaveDataRoom();

    currentType = type;

    supplyRegister.classList.add("hidden");
    demandRegister.classList.add("hidden");
    billRegister.classList.add("hidden");
    sanctionRegister.classList.add("hidden");

    document
      .querySelectorAll(
        "#supply-register-btn, #demand-register-btn, #bill-register-btn, #sanction-register-btn",
      )
      .forEach((btn) => {
        btn.classList.remove("bg-blue-600", "text-white");
        btn.classList.add("bg-gray-200", "hover:bg-gray-300");
      });

    document
      .getElementById(`${type}-register-btn`)
      .classList.remove("bg-gray-200", "hover:bg-gray-300");
    document
      .getElementById(`${type}-register-btn`)
      .classList.add("bg-blue-600", "text-white");
    document.getElementById(`${type}-register`).classList.remove("hidden");

    // Join new room for real-time updates
    joinDataRoom();

    if (type === "sanction") {
      showSanctionSection("gen-project");
    } else {
      loadData(type);
    }
  }

  async function loadData(type) {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
          ? demandFinancialYearSelect
          : billFinancialYearSelect;
    const year = financialYearSelect.value;

    // Get sort option
    const sortSelect =
      type === "supply"
        ? supplySortSelect
        : type === "demand"
          ? demandSortSelect
          : billSortSelect;
    const sortBy = sortSelect ? sortSelect.value : "";

    try {
      const response = await fetch(`/api/${type}-orders?year=${year}`);
      let data = await response.json();

      // Apply sorting if specified
      if (sortBy && data.length > 0) {
        data = sortData(data, sortBy, type);
      }

      renderTable(type, data);
      if (type === "supply") checkDeliveryAlerts(data);
      populateFilterDropdowns(type, data);
    } catch (error) {
      console.error(`Error loading ${type} data:`, error);
    }
  }

  async function loadSanctionData(type) {
    const financialYearSelect =
      type === "gen-project"
        ? genProjectFinancialYearSelect
        : type === "misc"
          ? miscFinancialYearSelect
          : trainingFinancialYearSelect;
    const year = financialYearSelect.value;

    // Get sort option
    const sortSelect = document.getElementById(`${type}-sort`);
    const sortBy = sortSelect ? sortSelect.value : "";

    try {
      const response = await fetch(`/api/sanction-${type}?year=${year}`);
      let data = await response.json();

      // Apply sorting if specified
      if (sortBy && data.length > 0) {
        data = sortSanctionData(data, sortBy);
      } else if (data && data.length > 0) {
        // Apply default sorting by serial number
        data = data.sort((a, b) => {
          const aSerial = parseInt(a.serial_no) || 0;
          const bSerial = parseInt(b.serial_no) || 0;
          return aSerial - bSerial;
        });
      }

      renderSanctionTable(type, data);
    } catch (error) {
      console.error(`Error loading sanction ${type} data:`, error);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  }

  function getLatestDate(row) {
    const dates = [
      row.revised_date3,
      row.revised_date2,
      row.revised_date1,
      row.original_date,
    ]
      .filter((date) => date)
      .map((date) => new Date(date));
    return dates.length ? new Date(Math.max(...dates)) : null;
  }

  function checkDeliveryAlerts(data) {
    alertContainer.innerHTML = "";
    const today = new Date();
    data.forEach((row) => {
      if (row.delivery_done === "No") {
        const latestDate = getLatestDate(row);
        if (latestDate) {
          const timeDiff = latestDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

          if (daysRemaining <= 5) {
            const alertDiv = document.createElement("div");
            alertDiv.className = `bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4`;
            alertDiv.innerHTML = `Delivery Alert for Supply Order No: ${row.supply_order_no_date} (Latest Date: ${formatDate(latestDate)}) - ${daysRemaining <= 0 ? "Overdue" : `Due in ${daysRemaining} days`}`;
            alertContainer.appendChild(alertDiv);
          }
        }
      }
    });
  }

  function renderTable(type, data) {
    const tableBody =
      type === "supply"
        ? supplyTableBody
        : type === "demand"
          ? demandTableBody
          : billTableBody;
    tableBody.innerHTML = "";

    data.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.dataset.id = row.id;
      tr.className =
        index % 2 === 0 ? "border-b bg-green-100" : "border-b bg-white";

      if (type === "supply") {
        tr.innerHTML = `
          <td class="p-3"><span class="serial-no">${row.serial_no}</span></td>
          <td class="p-3">${row.supply_order_no}</td>
          <td class="p-3">${row.so_date}</td>
          <td class="p-3">${row.firm_name}</td>
          <td class="p-3">${row.nomenclature}</td>
          <td class="p-3">${row.quantity}</td>
          <td class="p-3">${formatDate(row.original_date)}</td>
          <td class="p-3">${formatDate(row.revised_date1)}</td>
          <td class="p-3">${formatDate(row.revised_date2)}</td>
          <td class="p-3">${formatDate(row.revised_date3)}</td>
          <td class="p-3">${row.build_up}</td>
          <td class="p-3">${row.maint}</td>
          <td class="p-3">${row.misc}</td>
          <td class="p-3">${row.project_less_2cr || ""}</td>
          <td class="p-3">${row.project_more_2cr || ""}</td>
          <td class="p-3">${row.project_no_pdc}</td>
          <td class="p-3">${row.p_np || ""}</td>
          <td class="p-3">${row.expenditure_head || ""}</td>
          <td class="p-3">${row.rev_cap || ""}</td>
          <td class="p-3">${row.imms_demand_no || ""}</td>
          <td class="p-3">${formatDate(row.actual_delivery_date)}</td>
          <td class="p-3">${row.procurement_mode}</td>
          <td class="p-3">${row.delivery_done}</td>
          <td class="p-3">${row.remarks}</td>
          <td class="p-3">
            ${
              currentUser && currentUser.role !== "viewer"
                ? `
            <button onclick="editRow('${type}', ${row.id}, this)" class="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition">Edit</button>
            <button onclick="deleteRow('${type}', ${row.id})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition ml-2">Delete</button>
            `
                : '<span class="text-gray-500">View Only</span>'
            }
          </td>
          <td class="p-3 arrange-buttons">
            ${
              currentUser && currentUser.role !== "viewer"
                ? `
            <button onclick="moveRow('${type}', ${row.id}, 'up')" ${index === 0 ? "disabled" : ""} class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition">↑</button>
            <button onclick="moveRow('${type}', ${row.id}, 'down')" ${index === data.length - 1 ? "disabled" : ""} class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">↓</button>
            `
                : '<span class="text-gray-500">View Only</span>'
            }
          </td>
        `;
      } else if (type === "demand") {
        tr.innerHTML = `
          <td class="p-3">${row.serial_no}</td>
          <td class="p-3">${row.imms_demand_no || ""}</td>
          <td class="p-3">${formatDate(row.demand_date)}</td>
          <td class="p-3">${row.mmg_control_no || ""}</td>
          <td class="p-3">${formatDate(row.control_date)}</td>
          <td class="p-3">${row.nomenclature}</td>
          <td class="p-3">${row.quantity}</td>
          <td class="p-3">${row.expenditure_head}</td>
          <td class="p-3">${row.code_head || ""}</td>
          <td class="p-3">${row.rev_cap}</td>
          <td class="p-3">${row.procurement_mode}</td>
          <td class="p-3">${row.est_cost}</td>
          <td class="p-3">${row.imms_control_no}</td>
          <td class="p-3">${row.supply_order_placed}</td>
          <td class="p-3">${row.remarks}</td>
          <td class="p-3">
            ${
              currentUser && currentUser.role !== "viewer"
                ? `
            <button onclick="editRow('${type}', ${row.id}, this)" class="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition">Edit</button>
            <button onclick="deleteRow('${type}', ${row.id})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition ml-2">Delete</button>
            `
                : '<span class="text-gray-500">View Only</span>'
            }
          </td>
          <td class="p-3 arrange-buttons">
            ${
              currentUser && currentUser.role !== "viewer"
                ? `
            <button onclick="moveRow('${type}', ${row.id}, 'up')" ${index === 0 ? "disabled" : ""} class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition">↑</button>
            <button onclick="moveRow('${type}', ${row.id}, 'down')" ${index === data.length - 1 ? "disabled" : ""} class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">↓</button>
            `
                : '<span class="text-gray-500">View Only</span>'
            }
          </td>
        `;
      } else {
        // bill
        tr.innerHTML = `
          <td class="p-3">${row.serial_no}</td>
          <td class="p-3">${formatDate(row.bill_control_date)}</td>
          <td class="p-3">${row.firm_name}</td>
          <td class="p-3">${row.supply_order_no}</td>
          <td class="p-3">${formatDate(row.so_date)}</td>
          <td class="p-3">${row.project_no}</td>
          <td class="p-3">${row.build_up}</td>
          <td class="p-3">${row.maintenance}</td>
          <td class="p-3">${row.project_less_2cr}</td>
          <td class="p-3">${row.project_more_2cr}</td>
          <td class="p-3">${row.procurement_mode}</td>
          <td class="p-3">${row.rev_cap}</td>
          <td class="p-3">${row.date_amount_passed}</td>
          <td class="p-3">${row.ld_amount}</td>
          <td class="p-3">${row.remarks}</td>
          <td class="p-3">
            ${
              currentUser && currentUser.role !== "viewer"
                ? `
            <button onclick="editRow('${type}', ${row.id}, this)" class="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition">Edit</button>
            <button onclick="deleteRow('${type}', ${row.id})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition ml-2">Delete</button>
            `
                : '<span class="text-gray-500">View Only</span>'
            }
          </td>
          <td class="p-3 arrange-buttons">
            ${
              currentUser && currentUser.role !== "viewer"
                ? `
            <button onclick="moveRow('${type}', ${row.id}, 'up')" ${index === 0 ? "disabled" : ""} class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition">↑</button>
            <button onclick="moveRow('${type}', ${row.id}, 'down')" ${index === data.length - 1 ? "disabled" : ""} class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">↓</button>
            `
                : '<span class="text-gray-500">View Only</span>'
            }
          </td>
        `;
      }
      tableBody.appendChild(tr);
    });
  }

  function renderSanctionTable(type, data) {
    const tableBody =
      type === "gen-project"
        ? genProjectTableBody
        : type === "misc"
          ? miscTableBody
          : trainingTableBody;
    tableBody.innerHTML = "";

    data.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.dataset.id = row.id;
      tr.className =
        index % 2 === 0 ? "border-b bg-green-100" : "border-b bg-white";
      tr.innerHTML = `
        <td class="p-3">${row.serial_no}</td>
        <td class="p-3">${formatDate(row.date)}</td>
        <td class="p-3">${row.file_no}</td>
        <td class="p-3">${row.sanction_code}</td>
        <td class="p-3">${row.code}</td>
        <td class="p-3">${row.np_proj}</td>
        <td class="p-3">${row.power}</td>
        <td class="p-3">${row.code_head}</td>
        <td class="p-3">
          <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="R" ${row.rev_cap === "R" ? "selected" : ""}>R</option>
            <option value="C" ${row.rev_cap === "C" ? "selected" : ""}>C</option>
          </select>
        </td>
        <td class="p-3">${row.amount}</td>
        <td class="p-3">${row.uo_no}</td>
        <td class="p-3">${formatDate(row.uo_date)}</td>
        <td class="p-3">${row.amendment}</td>
        <td class="p-3">
          ${
            currentUser && currentUser.role !== "viewer"
              ? `
          <button onclick="editSanctionRow('${type}', ${row.id}, this)" class="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition">Edit</button>
          <button onclick="deleteSanctionRow('${type}', ${row.id})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition ml-2">Delete</button>
          `
              : '<span class="text-gray-500">View Only</span>'
          }
        </td>
        <td class="p-3 arrange-buttons">
          ${
            currentUser && currentUser.role !== "viewer"
              ? `
          <button onclick="moveSanctionRow('${type}', ${row.id}, 'up')" ${index === 0 ? "disabled" : ""} class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition">↑</button>
          <button onclick="moveSanctionRow('${type}', ${row.id}, 'down')" ${index === data.length - 1 ? "disabled" : ""} class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">↓</button>
          `
              : '<span class="text-gray-500">View Only</span>'
          }
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  window.addRow = async (type) => {
    // Check if user has permission to add
    if (currentUser && currentUser.role === "viewer") {
      alert("You do not have permission to add records.");
      return;
    }

    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
          ? demandFinancialYearSelect
          : billFinancialYearSelect;
    const tableBody =
      type === "supply"
        ? supplyTableBody
        : type === "demand"
          ? demandTableBody
          : billTableBody;
    const maxSerialNo = await getMaxSerialNo(type);

    const newRow = createNewRowData(
      type,
      maxSerialNo + 1,
      financialYearSelect.value,
    );
    const tr = createNewRowElement(type, newRow);

    // Insert at the top of the table
    if (tableBody.firstChild) {
      tableBody.insertBefore(tr, tableBody.firstChild);
    } else {
      tableBody.appendChild(tr);
    }
  };

  window.addSanctionRow = async (type) => {
    // Check if user has permission to add
    if (currentUser && currentUser.role === "viewer") {
      alert("You do not have permission to add records.");
      return;
    }

    const financialYearSelect =
      type === "gen-project"
        ? genProjectFinancialYearSelect
        : type === "misc"
          ? miscFinancialYearSelect
          : trainingFinancialYearSelect;
    const tableBody =
      type === "gen-project"
        ? genProjectTableBody
        : type === "misc"
          ? miscTableBody
          : trainingTableBody;
    const maxSerialNo = await getSanctionMaxSerialNo(type);

    const newRow = {
      serial_no: maxSerialNo + 1,
      date: "",
      file_no: "",
      sanction_code: "",
      code: "",
      np_proj: "",
      power: "",
      code_head: "",
      rev_cap: "R",
      amount: "",
      uo_no: "",
      uo_date: "",
      amendment: "",
      financial_year: financialYearSelect.value,
    };

    const tr = createSanctionRowElement(type, newRow);

    // Insert at the top of the table
    if (tableBody.firstChild) {
      tableBody.insertBefore(tr, tableBody.firstChild);
    } else {
      tableBody.appendChild(tr);
    }
  };

  function createNewRowData(type, serialNo, financialYear) {
    if (type === "supply") {
      return {
        serial_no: serialNo,
        supply_order_no: `ADRDE/AS-QMS/MMG/PM/8${String(serialNo).padStart(3, "0")}`,
        so_date: "", // Initialize SO Date as empty
        firm_name: "",
        nomenclature: "",
        quantity: "",
        original_date: "",
        revised_date1: "",
        revised_date2: "",
        revised_date3: "",
        build_up: "",
        maint: "",
        misc: "",
        project_less_2cr: "",
        project_more_2cr: "",
        project_no_pdc: "",
        p_np: "",
        expenditure_head: "",
        rev_cap: "R",
        actual_delivery_date: "",
        procurement_mode: "",
        delivery_done: "No",
        remarks: "",
        financial_year: financialYear,
      };
    } else if (type === "demand") {
      return {
        serial_no: serialNo,
        imms_demand_no: "",
        demand_date: "",
        mmg_control_no: `ADRDE/AS-QMS/MMG/PM/8/${String(serialNo).padStart(3, "0")}`,
        control_date: "",
        nomenclature: "",
        quantity: "",
        expenditure_head: "",
        code_head: "",
        rev_cap: "R",
        procurement_mode: "",
        est_cost: "",
        imms_control_no: "",
        supply_order_placed: "No",
        remarks: "",
        financial_year: financialYear,
      };
    } else {
      // bill
      return {
        serial_no: serialNo,
        bill_control_date: "",
        firm_name: "",
        supply_order_no: "", // Initialize as empty for dropdown
        so_date: "", // Initialize as empty
        project_no: "",
        build_up: "",
        maintenance: "",
        project_less_2cr: "",
        project_more_2cr: "",
        procurement_mode: "",
        rev_cap: "R",
        date_amount_passed: "",
        ld_amount: "",
        remarks: "",
        financial_year: financialYear,
      };
    }
  }

  function createNewRowElement(type, newRow) {
    const tr = document.createElement("tr");
    tr.className = "border-b bg-white";

    if (type === "supply") {
      tr.innerHTML = `
        <td class="p-3"><input type="text" value="${newRow.serial_no}" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 1, 10a, 10b"></td>
        <td class="p-3"><input type="text" value="${newRow.supply_order_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="date" value="${newRow.so_date}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.firm_name}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.nomenclature}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.quantity}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="date" value="${newRow.original_date}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="date" value="${formatDate(newRow.revised_date1)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="date" value="${formatDate(newRow.revised_date2)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="date" value="${formatDate(newRow.revised_date3)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.build_up}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.maint}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.misc}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="number" step="0.01" value="${newRow.project_less_2cr}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="number" step="0.01" value="${newRow.project_more_2cr}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.project_no_pdc}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.p_np || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.expenditure_head || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="R" ${newRow.rev_cap === "R" ? "selected" : ""}>R</option>
            <option value="C" ${newRow.rev_cap === "C" ? "selected" : ""}>C</option>
          </select>
        </td>
        <td class="p-3">
          <input list="imms-demand-list" class="imms-demand-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value="${newRow.imms_demand_no || ""}">
          <datalist id="imms-demand-list"></datalist>
        </td>
        <td class="p-3"><input type="date" value="${formatDate(newRow.actual_delivery_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.procurement_mode}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="No" ${newRow.delivery_done === "No" ? "selected" : ""}>No</option>
            <option value="Yes" ${newRow.delivery_done === "Yes" ? "selected" : ""}>Yes</option>
          </select>
        </td>
        <td class="p-3"><input type="text" value="${newRow.remarks}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <button onclick="saveRow('${type}', null, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
          <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
        </td>
        <td class="p-3 arrange-buttons"></td>
      `;

      // Load IMMS demand numbers for the input with datalist
      const immsInput = tr.querySelector(".imms-demand-input");
      populateIMMSDemandDatalist(
        "imms-demand-list",
        immsInput,
        newRow.imms_demand_no || "",
      );
    } else if (type === "demand") {
      tr.innerHTML = `
        <td class="p-3"><input type="text" value="${newRow.serial_no}" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 1, 10a, 10b"></td>
        <td class="p-3"><input type="text" value="${newRow.imms_demand_no || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="date" value="${formatDate(newRow.demand_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.mmg_control_no || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="date" value="${formatDate(newRow.control_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.nomenclature}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.quantity}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.expenditure_head}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.code_head || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="R" ${newRow.rev_cap === "R" ? "selected" : ""}>R</option>
            <option value="C" ${newRow.rev_cap === "C" ? "selected" : ""}>C</option>
          </select>
        </td>
        <td class="p-3"><input type="text" value="${newRow.procurement_mode}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="number" step="0.01" value="${newRow.est_cost}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.imms_control_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="No" ${newRow.supply_order_placed === "No" ? "selected" : ""}>No</option>
            <option value="Yes" ${newRow.supply_order_placed === "Yes" ? "selected" : ""}>Yes</option>
          </select>
        </td>
        <td class="p-3"><input type="text" value="${newRow.remarks}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <button onclick="saveRow('${type}', null, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
          <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
        </td>
        <td class="p-3 arrange-buttons"></td>
      `;
    } else {
      // bill
      tr.innerHTML = `
        <td class="p-3"><input type="text" value="${newRow.serial_no}" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 1, 10a, 10b"></td>
        <td class="p-3"><input type="date" value="${newRow.bill_control_date}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.firm_name}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.supply_order_no}" class="supply-order-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" list="supply-orders-list" onchange="updateSODate(this)">
          <datalist id="supply-orders-list"></datalist>
        </td>
        <td class="p-3"><input type="date" value="${newRow.so_date}" class="so-date-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" readonly></td>
        <td class="p-3"><input type="text" value="${newRow.project_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.build_up}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.maintenance}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.project_less_2cr}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.project_more_2cr}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.procurement_mode}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="R" ${newRow.rev_cap === "R" ? "selected" : ""}>R</option>
            <option value="C" ${newRow.rev_cap === "C" ? "selected" : ""}>C</option>
          </select>
        </td>
        <td class="p-3"><input type="text" value="${newRow.date_amount_passed}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.ld_amount}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${newRow.remarks}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <button onclick="saveRow('${type}', null, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
          <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
        </td>
        <td class="p-3 arrange-buttons"></td>
      `;

      // Populate supply orders dropdown for bill register
      if (type === "bill") {
        const supplyOrderInput = tr.querySelector(".supply-order-input");
        if (supplyOrderInput) {
          populateAvailableSupplyOrders(
            "supply-orders-list",
            supplyOrderInput,
            newRow.supply_order_no || "",
          );
        }
      }
    }
    return tr;
  }

  function createSanctionRowElement(type, newRow) {
    const tr = document.createElement("tr");
    tr.className = "border-b bg-white";
    tr.innerHTML = `
      <td class="p-3"><input type="text" value="${newRow.serial_no}" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 1, 10a, 10b"></td>
      <td class="p-3"><input type="date" value="${newRow.date}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3"><input type="text" value="${newRow.file_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3"><input type="text" value="${newRow.sanction_code}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3"><input type="text" value="${newRow.code}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3"><input type="text" value="${newRow.np_proj}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3"><input type="text" value="${newRow.power}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3"><input type="text" value="${newRow.code_head}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3">
        <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="R" ${newRow.rev_cap === "R" ? "selected" : ""}>R</option>
          <option value="C" ${newRow.rev_cap === "C" ? "selected" : ""}>C</option>
        </select>
      </td>
      <td class="p-3"><input type="number" step="0.01" value="${newRow.amount}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3"><input type="text" value="${newRow.uo_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3"><input type="date" value="${formatDate(newRow.uo_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3"><input type="text" value="${newRow.amendment}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
      <td class="p-3">
        <button onclick="saveSanctionRow('${type}', null, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
        <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
      </td>
      <td class="p-3 arrange-buttons"></td>
    `;
    return tr;
  }

  // Function to populate IMMS demand datalist
  async function populateIMMSDemandDatalist(
    datalistId,
    inputElement,
    selectedValue = "",
  ) {
    try {
      const response = await fetch(`/api/imms-demand-numbers`);
      const demandData = await response.json();

      const datalist = document.getElementById(datalistId);
      datalist.innerHTML = ""; // Clear existing options

      // Check if the response is an array of objects (new format) or strings (old format)
      if (demandData.length > 0 && typeof demandData[0] === "object") {
        demandData.forEach((item) => {
          const option = document.createElement("option");
          option.value = item.value;
          datalist.appendChild(option);
        });
      } else {
        // Fallback for old format
        demandData.forEach((demandNo) => {
          const option = document.createElement("option");
          option.value = demandNo;
          datalist.appendChild(option);
        });
      }

      // Set the selected value if provided
      if (selectedValue) {
        inputElement.value = selectedValue;
      }
    } catch (error) {
      console.error("Error loading IMMS demand numbers:", error);
    }
  }

  // Function to populate available supply orders datalist
  async function populateAvailableSupplyOrders(
    datalistId,
    inputElement,
    selectedValue = "",
  ) {
    try {
      const response = await fetch(`/api/available-supply-orders`);
      const supplyData = await response.json();

      const datalist = document.getElementById(datalistId);
      datalist.innerHTML = ""; // Clear existing options

      // Store supply orders data for SO date lookup
      window.availableSupplyOrders = {};

      supplyData.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        datalist.appendChild(option);

        // Store the SO date for later lookup
        window.availableSupplyOrders[item.value] = {
          so_date: item.so_date,
          financial_year: item.financial_year,
        };
      });

      // Set the selected value if provided
      if (selectedValue) {
        inputElement.value = selectedValue;
      }
    } catch (error) {
      console.error("Error loading available supply orders:", error);
    }
  }

  // Function to update SO date when supply order is selected
  window.updateSODate = function (supplyOrderInput) {
    const selectedSupplyOrder = supplyOrderInput.value;
    const row = supplyOrderInput.closest("tr");
    const soDateInput = row.querySelector(".so-date-input");

    if (
      window.availableSupplyOrders &&
      window.availableSupplyOrders[selectedSupplyOrder]
    ) {
      const soDate = window.availableSupplyOrders[selectedSupplyOrder].so_date;
      if (soDateInput && soDate) {
        soDateInput.value = soDate;
      }
    } else if (soDateInput) {
      soDateInput.value = "";
    }
  };

  window.editRow = async (type, id, button) => {
    // Check if user has permission to edit
    if (currentUser && currentUser.role === "viewer") {
      alert("You do not have permission to edit records.");
      return;
    }

    const row = button.closest("tr");
    const cells = row.querySelectorAll("td");

    // Save original content
    row.dataset.originalContent = row.innerHTML;

    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
          ? demandFinancialYearSelect
          : billFinancialYearSelect;

    try {
      const response = await fetch(`/api/${type}-orders/${id}`);
      const data = await response.json();

      if (type === "supply") {
        row.innerHTML = `
          <td class="p-3"><input type="number" min="1" value="${data.serial_no}" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.supply_order_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="date" value="${formatDate(data.so_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.firm_name}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.nomenclature}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.quantity}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="date" value="${formatDate(data.original_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="date" value="${formatDate(data.revised_date1)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="date" value="${formatDate(data.revised_date2)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="date" value="${formatDate(data.revised_date3)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.build_up}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.maint}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.misc}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="number" step="0.01" value="${data.project_less_2cr || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="number" step="0.01" value="${data.project_more_2cr || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.project_no_pdc}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.p_np || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.expenditure_head || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3">
            <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="R" ${data.rev_cap === "R" ? "selected" : ""}>R</option>
              <option value="C" ${data.rev_cap === "C" ? "selected" : ""}>C</option>
            </select>
          </td>
          <td class="p-3">
            <input list="imms-demand-list" class="imms-demand-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value="${data.imms_demand_no || ""}">
            <datalist id="imms-demand-list"></datalist>
          </td>
          <td class="p-3"><input type="date" value="${formatDate(data.actual_delivery_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.procurement_mode}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3">
            <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="No" ${data.delivery_done === "No" ? "selected" : ""}>No</option>
              <option value="Yes" ${data.delivery_done === "Yes" ? "selected" : ""}>Yes</option>
            </select>
          </td>
          <td class="p-3"><input type="text" value="${data.remarks}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3">
            <button onclick="saveRow('${type}', ${id}, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
            <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
          </td>
          <td class="p-3 arrange-buttons"></td>
        `;

        // Load IMMS demand numbers for the input with datalist
        const immsInput = row.querySelector(".imms-demand-input");
        populateIMMSDemandDatalist(
          "imms-demand-list",
          immsInput,
          data.imms_demand_no || "",
        );
      } else if (type === "demand") {
        row.innerHTML = `
          <td class="p-3"><input type="number" min="1" value="${data.serial_no}" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.imms_demand_no || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="date" value="${formatDate(data.demand_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.mmg_control_no || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="date" value="${formatDate(data.control_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.nomenclature}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.quantity}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.expenditure_head}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.code_head || ""}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3">
            <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="R" ${data.rev_cap === "R" ? "selected" : ""}>R</option>
              <option value="C" ${data.rev_cap === "C" ? "selected" : ""}>C</option>
            </select>
          </td>
          <td class="p-3"><input type="text" value="${data.procurement_mode}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="number" step="0.01" value="${data.est_cost}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.imms_control_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3">
            <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="No" ${data.supply_order_placed === "No" ? "selected" : ""}>No</option>
              <option value="Yes" ${data.supply_order_placed === "Yes" ? "selected" : ""}>Yes</option>
            </select>
          </td>
          <td class="p-3"><input type="text" value="${data.remarks}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3">
            <button onclick="saveRow('${type}', ${id}, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
            <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
          </td>
          <td class="p-3 arrange-buttons"></td>
        `;
      } else {
        // bill
        row.innerHTML = `
          <td class="p-3"><input type="number" min="1" value="${data.serial_no}" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="date" value="${formatDate(data.bill_control_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.firm_name}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.supply_order_no}" class="supply-order-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" list="supply-orders-list" onchange="updateSODate(this)">
            <datalist id="supply-orders-list"></datalist>
          </td>
          <td class="p-3"><input type="date" value="${formatDate(data.so_date)}" class="so-date-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" readonly></td>
          <td class="p-3"><input type="text" value="${data.project_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.build_up}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.maintenance}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.project_less_2cr}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.project_more_2cr}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.procurement_mode}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3">
            <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="R" ${data.rev_cap === "R" ? "selected" : ""}>R</option>
              <option value="C" ${data.rev_cap === "C" ? "selected" : ""}>C</option>
            </select>
          </td>
          <td class="p-3"><input type="text" value="${data.date_amount_passed}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.ld_amount}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3"><input type="text" value="${data.remarks}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
          <td class="p-3">
            <button onclick="saveRow('${type}', ${id}, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
            <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
          </td>
          <td class="p-3 arrange-buttons"></td>
        `;

        // Populate supply orders dropdown for bill register
        const supplyOrderInput = row.querySelector(".supply-order-input");
        if (supplyOrderInput) {
          populateAvailableSupplyOrders(
            "supply-orders-list",
            supplyOrderInput,
            data.supply_order_no || "",
          );
        }
      }
    } catch (error) {
      console.error(`Error fetching ${type} row ${id}:`, error);
    }
  };

  window.saveRow = async (type, id, button) => {
    const row = button.closest("tr");
    const inputs = row.querySelectorAll("input, select");
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
          ? demandFinancialYearSelect
          : billFinancialYearSelect;

    let data;
    if (type === "supply") {
      data = {
        serial_no: inputs[0].value,
        supply_order_no: inputs[1].value,
        so_date: inputs[2].value || null,
        firm_name: inputs[3].value,
        nomenclature: inputs[4].value,
        quantity: inputs[5].value,
        original_date: inputs[6].value || null,
        revised_date1: inputs[7].value || null,
        revised_date2: inputs[8].value || null,
        revised_date3: inputs[9].value || null,
        build_up: inputs[10].value,
        maint: inputs[11].value,
        misc: inputs[12].value,
        project_less_2cr: inputs[13].value,
        project_more_2cr: inputs[14].value,
        project_no_pdc: inputs[15].value,
        p_np: inputs[16].value,
        expenditure_head: inputs[17].value,
        rev_cap: inputs[18].value,
        imms_demand_no: inputs[19].value, // Read from the input field
        actual_delivery_date: inputs[20].value || null,
        procurement_mode: inputs[21].value,
        delivery_done: inputs[22].value,
        remarks: inputs[23].value,
        financial_year: financialYearSelect.value,
      };
    } else if (type === "demand") {
      data = {
        serial_no: inputs[0].value,
        imms_demand_no: inputs[1].value,
        demand_date: inputs[2].value || null,
        mmg_control_no: inputs[3].value,
        control_date: inputs[4].value || null,
        nomenclature: inputs[5].value,
        quantity: inputs[6].value,
        expenditure_head: inputs[7].value,
        code_head: inputs[8].value,
        rev_cap: inputs[9].value,
        procurement_mode: inputs[10].value,
        est_cost: inputs[11].value,
        imms_control_no: inputs[12].value,
        supply_order_placed: inputs[13].value,
        remarks: inputs[14].value,
        financial_year: financialYearSelect.value,
      };
    } else {
      // bill
      data = {
        serial_no: inputs[0].value,
        bill_control_date: inputs[1].value || null,
        firm_name: inputs[2].value,
        supply_order_no: inputs[3].value,
        so_date: inputs[4].value || null,
        project_no: inputs[5].value,
        build_up: inputs[6].value,
        maintenance: inputs[7].value,
        project_less_2cr: inputs[8].value,
        project_more_2cr: inputs[9].value,
        procurement_mode: inputs[10].value,
        rev_cap: inputs[11].value,
        date_amount_passed: inputs[12].value,
        ld_amount: inputs[13].value,
        remarks: inputs[14].value,
        financial_year: financialYearSelect.value,
      };
    }

    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/${type}-orders/${id}` : `/api/${type}-orders`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        loadData(type);
      } else {
        alert(`Failed to ${id ? "update" : "add"} row`);
      }
    } catch (error) {
      console.error(`Error saving ${type} row:`, error);
    }
  };

  // Sanction-specific functions
  window.editSanctionRow = async (type, id, button) => {
    // Check if user has permission to edit
    if (currentUser && currentUser.role === "viewer") {
      alert("You do not have permission to edit records.");
      return;
    }

    const row = button.closest("tr");
    try {
      const response = await fetch(`/api/sanction-${type}/${id}`);
      const data = await response.json();
      row.innerHTML = `
        <td class="p-3"><input type="number" min="1" value="${data.serial_no}" class="serial-no-input p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="date" value="${formatDate(data.date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${data.file_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${data.sanction_code}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${data.code}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${data.np_proj}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${data.power}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${data.code_head}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <select class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="R" ${data.rev_cap === "R" ? "selected" : ""}>R</option>
            <option value="C" ${data.rev_cap === "C" ? "selected" : ""}>C</option>
          </select>
        </td>
        <td class="p-3"><input type="number" step="0.01" value="${data.amount}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${data.uo_no}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="date" value="${formatDate(data.uo_date)}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3"><input type="text" value="${data.amendment}" class="p-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"></td>
        <td class="p-3">
          <button onclick="saveSanctionRow('${type}', ${id}, this)" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition">Save</button>
          <button onclick="cancelEdit(this)" class="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition ml-2">Cancel</button>
        </td>
        <td class="p-3 arrange-buttons"></td>
      `;
    } catch (error) {
      console.error(`Error fetching sanction ${type} row ${id}:`, error);
    }
  };

  window.saveSanctionRow = async (type, id, button) => {
    const row = button.closest("tr");
    const inputs = row.querySelectorAll("input, select");
    const financialYearSelect =
      type === "gen-project"
        ? genProjectFinancialYearSelect
        : type === "misc"
          ? miscFinancialYearSelect
          : trainingFinancialYearSelect;

    const data = {
      serial_no: inputs[0].value,
      date: inputs[1].value || null,
      file_no: inputs[2].value,
      sanction_code: inputs[3].value,
      code: inputs[4].value,
      np_proj: inputs[5].value,
      power: inputs[6].value,
      code_head: inputs[7].value,
      rev_cap: inputs[8].value,
      amount: inputs[9].value,
      uo_no: inputs[10].value,
      uo_date: inputs[11].value || null,
      amendment: inputs[12].value,
      financial_year: financialYearSelect.value,
    };

    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/sanction-${type}/${id}` : `/api/sanction-${type}`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        loadSanctionData(type);
      } else {
        alert(`Failed to ${id ? "update" : "add"} sanction row`);
      }
    } catch (error) {
      console.error(`Error saving sanction ${type} row:`, error);
    }
  };

  window.deleteSanctionRow = async (type, id) => {
    // Check if user has permission to delete
    if (currentUser && currentUser.role === "viewer") {
      alert("You do not have permission to delete records.");
      return;
    }

    if (confirm("Are you sure you want to delete this row?")) {
      try {
        const response = await fetch(`/api/sanction-${type}/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          loadSanctionData(type);
        } else {
          alert("Failed to delete row");
        }
      } catch (error) {
        console.error(`Error deleting sanction ${type} row ${id}:`, error);
      }
    }
  };

  window.moveSanctionRow = async (type, id, direction) => {
    const financialYearSelect =
      type === "gen-project"
        ? genProjectFinancialYearSelect
        : type === "misc"
          ? miscFinancialYearSelect
          : trainingFinancialYearSelect;
    try {
      const response = await fetch(`/api/sanction-${type}/move/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          financial_year: financialYearSelect.value,
        }),
      });
      if (response.ok) {
        loadSanctionData(type);
      } else {
        alert("Failed to move row");
      }
    } catch (error) {
      console.error(`Error moving sanction ${type} row:`, error);
    }
  };

  window.cancelEdit = (button) => {
    const row = button.closest("tr");
    const registerType = row.closest("#supply-table")
      ? "supply"
      : row.closest("#demand-table")
        ? "demand"
        : row.closest("#bill-table")
          ? "bill"
          : row.closest("#gen-project-table")
            ? "gen-project"
            : row.closest("#misc-table")
              ? "misc"
              : "training";

    if (["gen-project", "misc", "training"].includes(registerType)) {
      loadSanctionData(registerType);
    } else {
      loadData(registerType);
    }
  };

  window.deleteRow = async (type, id) => {
    // Check if user has permission to delete
    if (currentUser && currentUser.role === "viewer") {
      alert("You do not have permission to delete records.");
      return;
    }

    if (confirm("Are you sure you want to delete this row?")) {
      try {
        const response = await fetch(`/api/${type}-orders/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          loadData(type);
        } else {
          alert("Failed to delete row");
        }
      } catch (error) {
        console.error(`Error deleting ${type} row ${id}:`, error);
      }
    }
  };

  window.moveRow = async (type, id, direction) => {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
          ? demandFinancialYearSelect
          : billFinancialYearSelect;
    try {
      const response = await fetch(`/api/${type}-orders/move/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          financial_year: financialYearSelect.value,
        }),
      });
      if (response.ok) {
        loadData(type);
      } else {
        alert("Failed to move row");
      }
    } catch (error) {
      console.error(`Error moving ${type} row:`, error);
    }
  };

  async function getMaxSerialNo(type) {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
          ? demandFinancialYearSelect
          : billFinancialYearSelect;
    const year = financialYearSelect.value;
    try {
      const response = await fetch(
        `/api/${type}-orders/max-serial?year=${year}`,
      );
      const data = await response.json();
      return data.maxSerialNo || 0;
    } catch (error) {
      console.error(`Error fetching max serial no for ${type}:`, error);
      return 0;
    }
  }

  async function getSanctionMaxSerialNo(type) {
    const financialYearSelect =
      type === "gen-project"
        ? genProjectFinancialYearSelect
        : type === "misc"
          ? miscFinancialYearSelect
          : trainingFinancialYearSelect;
    const year = financialYearSelect.value;
    try {
      const response = await fetch(
        `/api/sanction-${type}/max-serial?year=${year}`,
      );
      const data = await response.json();
      return data.maxSerialNo || 0;
    } catch (error) {
      console.error(
        `Error fetching max serial no for sanction ${type}:`,
        error,
      );
      return 0;
    }
  }

  function populateFilterDropdowns(type, data) {
    const filterContainer = document.getElementById(`${type}-advanced-filter`);
    if (!filterContainer) return; // Exit if filter container doesn't exist

    const selects = filterContainer.querySelectorAll(".filter-select");
    const fields =
      type === "supply"
        ? [
            "serial_no",
            "supply_order_no",
            "so_date",
            "firm_name",
            "nomenclature",
            "quantity",
            "original_date",
            "revised_date1",
            "revised_date2",
            "revised_date3",
            "build_up",
            "maint",
            "misc",
            "project_less_2cr",
            "project_more_2cr",
            "project_no_pdc",
            "p_np",
            "expenditure_head",
            "rev_cap",
            "actual_delivery_date",
            "procurement_mode",
            "delivery_done",
            "remarks",
          ]
        : type === "demand"
          ? [
              "serial_no",
              "imms_demand_no",
              "demand_date",
              "mmg_control_no",
              "control_date",
              "nomenclature",
              "quantity",
              "expenditure_head",
              "code_head",
              "rev_cap",
              "procurement_mode",
              "est_cost",
              "imms_control_no",
              "supply_order_placed",
              "remarks",
            ]
          : [
              // bill
              "serial_no",
              "bill_control_date",
              "firm_name",
              "supply_order_no",
              "so_date",
              "project_no",
              "build_up",
              "maintenance",
              "project_less_2cr",
              "project_more_2cr",
              "procurement_mode",
              "rev_cap",
              "date_amount_passed",
              "ld_amount",
              "remarks",
            ];

    selects.forEach((select, index) => {
      // Ensure we don't try to access fields beyond the available ones
      if (index >= fields.length) return;

      const field = fields[index];
      select.innerHTML = `<option value="">Select ${field.replace(/_/g, " ")}</option>`;

      // Filter out null/undefined values and create unique sorted options
      const uniqueValues = [
        ...new Set(
          data
            .map((row) => row[field])
            .filter((val) => val !== null && val !== undefined),
        ),
      ].sort();

      uniqueValues.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    });
  }

  window.toggleAdvancedFilter = (type) => {
    const filterDiv = document.getElementById(`${type}-advanced-filter`);
    if (filterDiv) {
      filterDiv.classList.toggle("hidden");
    }
  };

  window.applyFilter = (type) => {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
          ? demandFinancialYearSelect
          : billFinancialYearSelect;
    const filterContainer = document.getElementById(`${type}-advanced-filter`);
    if (!filterContainer) return;

    const selects = filterContainer.querySelectorAll(".filter-select");
    const filters = {};
    selects.forEach((select) => {
      if (select.value) {
        filters[select.name] = select.value;
      }
    });

    fetch(`/api/${type}-orders?year=${financialYearSelect.value}`)
      .then((response) => response.json())
      .then((data) => {
        const filteredData = data.filter((row) => {
          return Object.keys(filters).every((key) => {
            // Use loose equality for potentially mixed types or string vs number comparisons
            return row[key] == filters[key];
          });
        });
        renderTable(type, filteredData);
      })
      .catch((error) => console.error(`Error applying ${type} filter:`, error));
  };

  window.resetFilter = (type) => {
    const filterContainer = document.getElementById(`${type}-advanced-filter`);
    if (filterContainer) {
      filterContainer
        .querySelectorAll(".filter-select")
        .forEach((select) => (select.value = ""));
    }
    loadData(type); // Reload original data
  };

  window.showBackups = async (type) => {
    const backupList = document.getElementById(`${type}-backup-list`);
    const backupFiles = document.getElementById(`${type}-backup-files`);
    if (!backupList || !backupFiles) return; // Exit if elements don't exist

    backupList.classList.toggle("hidden");
    try {
      const response = await fetch(`/api/${type}-backups`);
      const files = await response.json();
      backupFiles.innerHTML = "";
      files.forEach((file) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="/backups/${type}/${file}" target="_blank" class="text-blue-600 hover:underline">${file}</a>`;
        backupFiles.appendChild(li);
      });
    } catch (error) {
      console.error(`Error fetching ${type} backups:`, error);
    }
  };

  window.showSanctionBackups = async (type) => {
    const backupList = document.getElementById(`${type}-backup-list`);
    const backupFiles = document.getElementById(`${type}-backup-files`);
    if (!backupList || !backupFiles) return; // Exit if elements don't exist

    backupList.classList.toggle("hidden");
    try {
      const response = await fetch(`/api/sanction-${type}-backups`);
      const files = await response.json();
      backupFiles.innerHTML = "";
      files.forEach((file) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="/backups/sanction-${type}/${file}" target="_blank" class="text-blue-600 hover:underline">${file}</a>`;
        backupFiles.appendChild(li);
      });
    } catch (error) {
      console.error(`Error fetching sanction ${type} backups:`, error);
    }
  };

  window.exportToExcel = (type) => {
    const financialYearSelect =
      type === "supply"
        ? supplyFinancialYearSelect
        : type === "demand"
          ? demandFinancialYearSelect
          : billFinancialYearSelect;
    fetch(`/api/${type}-orders?year=${financialYearSelect.value}`)
      .then((response) => response.json())
      .then((data) => {
        const formattedData = data.map((row) => ({
          ...row,
          original_date: formatDate(row.original_date),
          revised_date1: formatDate(row.revised_date1),
          revised_date2: formatDate(row.revised_date2),
          revised_date3: formatDate(row.revised_date3),
          actual_delivery_date: formatDate(row.actual_delivery_date),
          demand_date: formatDate(row.demand_date),
          entry_date: formatDate(row.entry_date),
          so_date: formatDate(row.so_date),
        }));
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          `${type.charAt(0).toUpperCase() + type.slice(1)} Orders`,
        );
        XLSX.writeFile(
          workbook,
          `${type}_orders_${financialYearSelect.value}.xlsx`,
        );
      })
      .catch((error) =>
        console.error(`Error exporting ${type} to Excel:`, error),
      );
  };

  window.exportSanctionToExcel = async (section) => {
    try {
      let headers = [
        "S.No",
        "Date",
        "File No.",
        "Sanction Code",
        "Code",
        "NP(B)/Proj.",
        "Power",
        "Code Head",
        "Rev/Cap",
        "Amount",
        "U.O. No.",
        "U.O. Date",
        "Amendment(if any)",
      ];
      let filename = "";
      let currentYear = "";
      let financialYearSelect = null;

      if (section === "gen-project") {
        financialYearSelect = document.getElementById("gen-project-financial-year");
        currentYear = financialYearSelect ? financialYearSelect.value : "";
        filename = `Gen_Project_Sanction_${currentYear}.xlsx`;
      } else if (section === "misc") {
        financialYearSelect = document.getElementById("misc-financial-year");
        currentYear = financialYearSelect ? financialYearSelect.value : "";
        filename = `Misc_Sanction_${currentYear}.xlsx`;
      } else if (section === "training") {
        financialYearSelect = document.getElementById("training-financial-year");
        currentYear = financialYearSelect ? financialYearSelect.value : "";
        filename = `Training_Sanction_${currentYear}.xlsx`;
      }

      if (!currentYear) {
        showAlert("Please select a financial year first", "error");
        return;
      }

      // Fetch data from API
      const response = await fetch(`/api/sanction-${section}?year=${currentYear}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sanction data: ${response.statusText}`);
      }
      const sanctionData = await response.json();

      if (!sanctionData || sanctionData.length === 0) {
        showAlert("No data available to export for the selected year", "warning");
        return;
      }

      // Map data to array format
      const data = sanctionData.map((order) => [
        order.serial_no,
        order.date,
        order.file_no,
        order.sanction_code,
        order.code,
        order.np_proj,
        order.power,
        order.code_head,
        order.rev_cap,
        order.amount,
        order.uo_no,
        order.uo_date,
        order.amendment,
      ]);

      // Create workbook and worksheet with DRDO header
      const headerInfo = [
        ["DEFENCE RESEARCH AND DEVELOPMENT ORGANISATION"],
        ["MATERIAL MANAGEMENT GROUP"],
        [`SANCTION CODE REGISTER - ${section.toUpperCase()} - ${currentYear}`],
        ["Generated on: " + new Date().toLocaleDateString()],
        [""],
        headers,
      ];

      // Create worksheet with header
      const finalWorksheet = XLSX.utils.aoa_to_sheet([...headerInfo, ...data]);

      // Set column widths
      const colWidths = headers.map(() => ({ wch: 15 }));
      finalWorksheet["!cols"] = colWidths;

      // Merge cells for header
      finalWorksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: headers.length - 1 } },
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        finalWorksheet,
        section.charAt(0).toUpperCase() + section.slice(1),
      );

      // Save the file
      XLSX.writeFile(workbook, filename);

      showAlert(
        `${section.charAt(0).toUpperCase() + section.slice(1)} sanction register exported successfully as ${filename} with DRDO header`,
        "success",
      );
    } catch (error) {
      console.error("Export error:", error);
      showAlert("Error exporting sanction data: " + error.message, "error");
    }
  };

  // Search event listeners
  if (supplySearchInput)
    supplySearchInput.addEventListener("input", () => filterTable("supply"));
  if (demandSearchInput)
    demandSearchInput.addEventListener("input", () => filterTable("demand"));
  if (billSearchInput)
    billSearchInput.addEventListener("input", () => filterTable("bill"));
  if (genProjectSearchInput)
    genProjectSearchInput.addEventListener("input", () =>
      filterSanctionTable("gen-project"),
    );
  if (miscSearchInput)
    miscSearchInput.addEventListener("input", () =>
      filterSanctionTable("misc"),
    );
  if (trainingSearchInput)
    trainingSearchInput.addEventListener("input", () =>
      filterSanctionTable("training"),
    );

  // Sort function
  function sortData(data, sortBy, type) {
    if (!data || data.length === 0) return data;

    return [...data].sort((a, b) => {
      let aVal, bVal;

      // Handle date sorting with _asc and _desc suffixes
      if (sortBy.endsWith("_asc") || sortBy.endsWith("_desc")) {
        const field = sortBy.replace("_asc", "").replace("_desc", "");
        const isAsc = sortBy.endsWith("_asc");

        aVal = new Date(a[field] || 0);
        bVal = new Date(b[field] || 0);

        return isAsc ? aVal - bVal : bVal - aVal;
      }

      // Handle numeric sorting with _asc and _desc suffixes
      if (
        [
          "quantity",
          "build_up",
          "maint",
          "misc",
          "project_less_2cr",
          "project_more_2cr",
          "est_cost",
          "maintenance",
          "ld_amount",
        ].some((field) => sortBy.startsWith(field))
      ) {
        const field = sortBy.replace("_asc", "").replace("_desc", "");
        const isAsc = sortBy.endsWith("_asc");

        aVal = parseFloat(a[field] || 0);
        bVal = parseFloat(b[field] || 0);

        return isAsc ? aVal - bVal : bVal - aVal;
      }

      switch (sortBy) {
        case "serial_no":
          aVal = parseInt(a.serial_no) || 0;
          bVal = parseInt(b.serial_no) || 0;
          return aVal - bVal;

        case "supply_order_no":
        case "imms_demand_no":
        case "mmg_control_no":
        case "imms_control_no":
        case "project_no_pdc":
        case "p_np":
        case "expenditure_head":
        case "rev_cap":
        case "procurement_mode":
        case "remarks":
        case "code_head":
        case "date_amount_passed":
          aVal = (a[sortBy] || "").toLowerCase();
          bVal = (b[sortBy] || "").toLowerCase();
          return aVal.localeCompare(bVal);

        case "firm_name":
          aVal = (a.firm_name || "").toLowerCase();
          bVal = (b.firm_name || "").toLowerCase();
          return aVal.localeCompare(bVal);

        case "nomenclature":
          aVal = (a.nomenclature || "").toLowerCase();
          bVal = (b.nomenclature || "").toLowerCase();
          return aVal.localeCompare(bVal);

        case "delivery_done":
          aVal = a.delivery_done || "No";
          bVal = b.delivery_done || "No";
          // Sort: Yes first, then No
          if (aVal === "Yes" && bVal !== "Yes") return -1;
          if (aVal !== "Yes" && bVal === "Yes") return 1;
          return 0;

        case "supply_order_placed":
          aVal = a.supply_order_placed || "No";
          bVal = b.supply_order_placed || "No";
          if (aVal === "Yes" && bVal !== "Yes") return -1;
          if (aVal !== "Yes" && bVal === "Yes") return 1;
          return 0;

        default:
          return 0;
      }
    });
  }

  // Sort function for sanction data
  function sortSanctionData(data, sortBy) {
    if (!data || data.length === 0) return data;

    return [...data].sort((a, b) => {
      let aVal, bVal;

      // Handle date sorting with _asc and _desc suffixes
      if (sortBy.endsWith("_asc") || sortBy.endsWith("_desc")) {
        const field = sortBy.replace("_asc", "").replace("_desc", "");
        const isAsc = sortBy.endsWith("_asc");

        if (field === "date" || field === "uo_date") {
          aVal = new Date(a[field] || 0);
          bVal = new Date(b[field] || 0);
        } else if (field === "amount") {
          aVal = parseFloat(a[field] || 0);
          bVal = parseFloat(b[field] || 0);
        } else {
          aVal = (a[field] || "").toLowerCase();
          bVal = (b[field] || "").toLowerCase();
          return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        return isAsc ? aVal - bVal : bVal - aVal;
      }

      switch (sortBy) {
        case "serial_no":
          aVal = parseInt(a.serial_no) || 0;
          bVal = parseInt(b.serial_no) || 0;
          return aVal - bVal;

        case "file_no":
        case "sanction_code":
        case "code":
        case "np_proj":
        case "power":
        case "code_head":
        case "rev_cap":
        case "uo_no":
        case "amendment":
          aVal = (a[sortBy] || "").toLowerCase();
          bVal = (b[sortBy] || "").toLowerCase();
          return aVal.localeCompare(bVal);

        default:
          return 0;
      }
    });
  }

  // Apply sort function
  window.applySort = function (type) {
    let sortSelect;

    if (type === "supply") {
      sortSelect = supplySortSelect;
    } else if (type === "demand") {
      sortSelect = demandSortSelect;
    } else if (type === "bill") {
      sortSelect = billSortSelect;
    } else if (type === "gen-project") {
      sortSelect = document.getElementById("gen-project-sort");
    } else if (type === "misc") {
      sortSelect = document.getElementById("misc-sort");
    } else if (type === "training") {
      sortSelect = document.getElementById("training-sort");
    }

    const sortBy = sortSelect ? sortSelect.value : "";

    if (!sortBy) {
      alert("Please select a sort field first");
      return;
    }

    if (["gen-project", "misc", "training"].includes(type)) {
      loadSanctionData(type);
    } else {
      loadData(type);
    }
  };

  // Financial year change listeners
  if (supplyFinancialYearSelect)
    supplyFinancialYearSelect.addEventListener("change", () => {
      currentFinancialYear = supplyFinancialYearSelect.value;
      leaveDataRoom();
      joinDataRoom();
      loadData("supply");
    });
  if (demandFinancialYearSelect)
    demandFinancialYearSelect.addEventListener("change", () => {
      currentFinancialYear = demandFinancialYearSelect.value;
      leaveDataRoom();
      joinDataRoom();
      loadData("demand");
    });
  if (billFinancialYearSelect)
    billFinancialYearSelect.addEventListener("change", () => {
      currentFinancialYear = billFinancialYearSelect.value;
      leaveDataRoom();
      joinDataRoom();
      loadData("bill");
    });
  if (genProjectFinancialYearSelect)
    genProjectFinancialYearSelect.addEventListener("change", () =>
      loadSanctionData("gen-project"),
    );
  if (miscFinancialYearSelect)
    miscFinancialYearSelect.addEventListener("change", () =>
      loadSanctionData("misc"),
    );
  if (trainingFinancialYearSelect)
    trainingFinancialYearSelect.addEventListener("change", () =>
      loadSanctionData("training"),
    );

  // Import Excel event listeners
  if (supplyImportExcel)
    supplyImportExcel.addEventListener("change", (event) =>
      handleImportExcel(event, "supply"),
    );
  if (demandImportExcel)
    demandImportExcel.addEventListener("change", (event) =>
      handleImportExcel(event, "demand"),
    );
  if (billImportExcel)
    billImportExcel.addEventListener("change", (event) =>
      handleImportExcel(event, "bill"),
    );
  if (genProjectImportExcel)
    genProjectImportExcel.addEventListener("change", (event) =>
      handleSanctionImportExcel(event, "gen-project"),
    );
  if (miscImportExcel)
    miscImportExcel.addEventListener("change", (event) =>
      handleSanctionImportExcel(event, "misc"),
    );
  if (trainingImportExcel)
    trainingImportExcel.addEventListener("change", (event) =>
      handleSanctionImportExcel(event, "training"),
    );

  function handleImportExcel(event, type) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (typeof XLSX === 'undefined') {
      alert('Excel library is not loaded. Please refresh the page and try again.');
      console.error('XLSX library is not available');
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      alert('Error reading file. Please try again.');
      console.error('FileReader error:', reader.error);
      event.target.value = "";
    };

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          alert('No worksheets found in the Excel file.');
          event.target.value = "";
          return;
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          alert('No data found in the Excel file.');
          event.target.value = "";
          return;
        }

        const financialYearSelect =
          type === "supply"
            ? supplyFinancialYearSelect
            : type === "demand"
              ? demandFinancialYearSelect
              : billFinancialYearSelect;

        if (!financialYearSelect || !financialYearSelect.value) {
          alert('Please select a financial year first.');
          event.target.value = "";
          return;
        }

        console.log(`Importing ${jsonData.length} rows to ${type} orders for FY ${financialYearSelect.value}`);

        fetch(`/api/${type}-orders/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: jsonData,
            financial_year: financialYearSelect.value,
          }),
        })
          .then((response) => {
            if (response.ok) {
              alert(`Successfully imported ${jsonData.length} rows to ${type} orders.`);
              loadData(type);
              event.target.value = "";
            } else {
              return response.text().then(text => {
                console.error('Server response:', text);
                alert(`Failed to import Excel file: ${text || 'Server error'}`);
                event.target.value = "";
              });
            }
          })
          .catch((error) => {
            console.error(`Error importing ${type} Excel:`, error);
            alert(`Error importing Excel file: ${error.message}`);
            event.target.value = "";
          });
      } catch (error) {
        console.error(`Error processing Excel file:`, error);
        alert(`Error processing Excel file: ${error.message}`);
        event.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function handleSanctionImportExcel(event, type) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (typeof XLSX === 'undefined') {
      alert('Excel library is not loaded. Please refresh the page and try again.');
      console.error('XLSX library is not available');
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      alert('Error reading file. Please try again.');
      console.error('FileReader error:', reader.error);
      event.target.value = "";
    };

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          alert('No worksheets found in the Excel file.');
          event.target.value = "";
          return;
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          alert('No data found in the Excel file.');
          event.target.value = "";
          return;
        }

        const financialYearSelect =
          type === "gen-project"
            ? genProjectFinancialYearSelect
            : type === "misc"
              ? miscFinancialYearSelect
              : trainingFinancialYearSelect;

        if (!financialYearSelect || !financialYearSelect.value) {
          alert('Please select a financial year first.');
          event.target.value = "";
          return;
        }

        console.log(`Importing ${jsonData.length} rows to sanction ${type} for FY ${financialYearSelect.value}`);

        fetch(`/api/sanction-${type}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: jsonData,
            financial_year: financialYearSelect.value,
          }),
        })
          .then((response) => {
            if (response.ok) {
              alert(`Successfully imported ${jsonData.length} rows to sanction ${type}.`);
              loadSanctionData(type);
              event.target.value = "";
            } else {
              return response.text().then(text => {
                console.error('Server response:', text);
                alert(`Failed to import Excel file: ${text || 'Server error'}`);
                event.target.value = "";
              });
            }
          })
          .catch((error) => {
            console.error(`Error importing sanction ${type} Excel:`, error);
            alert(`Error importing Excel file: ${error.message}`);
            event.target.value = "";
          });
      } catch (error) {
        console.error(`Error processing Excel file:`, error);
        alert(`Error processing Excel file: ${error.message}`);
        event.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function filterTable(type) {
    const searchInput =
      type === "supply"
        ? supplySearchInput
        : type === "demand"
          ? demandSearchInput
          : billSearchInput;
    const tableBody =
      type === "supply"
        ? supplyTableBody
        : type === "demand"
          ? demandTableBody
          : billTableBody;

    if (!searchInput || !tableBody) return; // Exit if elements don't exist

    const searchTerm = searchInput.value.toLowerCase();
    const rows = tableBody.querySelectorAll("tr");

    rows.forEach((row) => {
      const text = Array.from(row.querySelectorAll("td"))
        .map((cell) => cell.textContent.toLowerCase())
        .join(" ");
      row.style.display = text.includes(searchTerm) ? "" : "none";
    });
  }

  function filterSanctionTable(type) {
    const searchInput =
      type === "gen-project"
        ? genProjectSearchInput
        : type === "misc"
          ? miscSearchInput
          : trainingSearchInput;
    const tableBody =
      type === "gen-project"
        ? genProjectTableBody
        : type === "misc"
          ? miscTableBody
          : trainingTableBody;

    if (!searchInput || !tableBody) return; // Exit if elements don't exist

    const searchTerm = searchInput.value.toLowerCase();
    const rows = tableBody.querySelectorAll("tr");

    rows.forEach((row) => {
      const text = Array.from(row.querySelectorAll("td"))
        .map((cell) => cell.textContent.toLowerCase())
        .join(" ");
      row.style.display = text.includes(searchTerm) ? "" : "none";
    });
  }
});

// Function to update UI based on user role and permissions
function updateUIForUserRole() {
  const isViewer = currentUser && currentUser.role === "viewer";
  const isGamer = currentUser && currentUser.role === "gamer";
  const isSuperAdmin = currentUser && currentUser.role === "super_admin";
  const userPermissions =
    currentUser && currentUser.permissions ? currentUser.permissions : [];

  // Show calculator toggle for all users
  const toggleCalculatorBtn = document.getElementById("toggle-calculator");
  if (toggleCalculatorBtn) {
    toggleCalculatorBtn.style.display = "block";
  }

  // Show super admin interface
  if (isSuperAdmin) {
    showSuperAdminInterface();
    return;
  }

  // Hide/show elements based on permissions
  updateElementsBasedOnPermissions(userPermissions);

  // Show dark mode toggle on login
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  if (darkModeToggle && currentUser) {
    darkModeToggle.style.display = "inline-block";
  }

  // Update user info display
  const userInfo = document.getElementById("user-info");
  if (userInfo && currentUser) {
    userInfo.textContent = `${currentUser.username} (${currentUser.role.toUpperCase()})`;
  }

  // Show gaming interface for gamer role
  if (isGamer) {
    showGamingInterface();
    joinGamingRoom();
  } else {
    hideGamingInterface();
  }
}

function updateElementsBasedOnPermissions(permissions) {
  // For viewers, show all buttons but add lock icons for restricted actions
  const isViewer = currentUser && currentUser.role === "viewer";

  // Map of permission to element selectors
  const permissionElementMap = {
    add_records: ['[onclick*="addRow"]', '[onclick*="addSanctionRow"]'],
    edit_records: ['[onclick*="editRow"]', '[onclick*="editSanctionRow"]'],
    delete_records: [
      '[onclick*="deleteRow"]',
      '[onclick*="deleteSanctionRow"]',
    ],
    import_excel: [
      '[onclick*="import-excel"]',
      "#import-excel-supply",
      "#import-excel-demand",
      "#import-excel-bill",
      "#import-excel-gen-project",
      "#import-excel-misc",
      "#import-excel-training",
    ],
    export_excel: [
      '[onclick*="exportToExcel"]',
      '[onclick*="exportSanctionToExcel"]',
    ],
    view_backups: [
      '[onclick*="showBackups"]',
      '[onclick*="showSanctionBackups"]',
    ],
    move_records: [".arrange-buttons"],
    filter_records: [
      '[onclick*="toggleAdvancedFilter"]',
      '[onclick*="applyFilter"]',
    ],
    sort_records: ['[onclick*="applySort"]'],
    view_dashboard: ["#dashboard-btn"],
    generate_reports: ["#generate-report"],
    print_reports: ["#print-report"],
    download_pdf: ["#download-pdf"],
    compare_years: ["#compare-years"],
    advanced_visualization: ["#update-visualization"],
    change_financial_year: [
      "#financial-year",
      "#demand-financial-year",
      "#bill-financial-year",
      "#gen-project-financial-year",
      "#misc-financial-year",
      "#training-financial-year",
    ],
    dark_mode_toggle: [
      "#dark-mode-toggle",
      "#dark-mode-toggle-admin",
      "#dark-mode-toggle-gaming",
    ],
    keyboard_shortcuts: ['[onclick*="showKeyboardShortcutsHelp"]'],
    data_export_all: [
      '[onclick*="exportToExcel"]',
      '[onclick*="exportSanctionToExcel"]',
    ],
    data_import_all: ['[type="file"][accept*="excel"]'],
    backup_management: [
      '[onclick*="showBackups"]',
      '[onclick*="showSanctionBackups"]',
    ],
    logout_access: ["#logout", "#logout-admin", "#logout-gaming"],
    real_time_updates: ["[data-realtime]"],
    notification_settings: [".notification-settings"],
    system_settings: [".system-settings"],
    user_management: [".user-management"],
    dashboard_customization: [".dashboard-customization"],
    widget_management: [".widget-management"],
    theme_customization: [".theme-settings"],
    custom_reports: [".custom-reports"],
    audit_trail: [".audit-trail"],
    api_access: [".api-settings"],
    webhook_management: [".webhook-settings"],
    integration_settings: [".integration-settings"],
    workflow_automation: [".workflow-settings"],
    file_attachments: [".file-upload"],
    comment_system: [".comment-section"],
    version_control: [".version-control"],
  };

  if (isViewer) {
    // For viewers, show all buttons but modify them based on permissions
    Object.entries(permissionElementMap).forEach(([permission, selectors]) => {
      const hasPermission = permissions.includes(permission);
      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          // Always show the element
          element.style.display = "";

          if (!hasPermission && element.tagName === "BUTTON") {
            // Add lock icon and disable for buttons without permission
            if (!element.innerHTML.includes("🔒")) {
              element.innerHTML = "🔒 " + element.innerHTML;
              element.style.opacity = "0.6";
              element.style.cursor = "not-allowed";

              // Store original onclick and replace with permission denied message
              const originalOnclick = element.getAttribute("onclick");
              if (originalOnclick) {
                element.setAttribute("data-original-onclick", originalOnclick);
                element.setAttribute(
                  "onclick",
                  `alert('You do not have permission to perform this action.'); return false;`,
                );
              }

              // Add click event listener for elements without onclick
              if (!originalOnclick) {
                element.addEventListener("click", function (e) {
                  e.preventDefault();
                  e.stopPropagation();
                  alert("You do not have permission to perform this action.");
                  return false;
                });
              }
            }
          }
        });
      });
    });
  } else {
    // For non-viewers, hide elements they don't have permission for
    Object.entries(permissionElementMap).forEach(([permission, selectors]) => {
      const hasPermission = permissions.includes(permission);
      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          if (hasPermission) {
            element.style.display = "";
          } else {
            element.style.display = "none";
          }
        });
      });
    });
  }

  // Always show register tabs but add lock icons for viewers
  const registerMap = {
    view_supply_register: "#supply-register-btn",
    view_demand_register: "#demand-register-btn",
    view_bill_register: "#bill-register-btn",
    view_sanction_register: "#sanction-register-btn",
  };

  Object.entries(registerMap).forEach(([permission, selector]) => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = "";

      if (isViewer && !permissions.includes(permission)) {
        // Add lock icon for viewers without permission
        if (!element.innerHTML.includes("🔒")) {
          element.innerHTML = "🔒 " + element.innerHTML;
          element.style.opacity = "0.6";
          element.style.cursor = "not-allowed";
          element.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            alert("You do not have permission to view this register.");
            return false;
          });
        }
      }
    }
  });
}

function showSuperAdminInterface() {
  // Hide regular dashboard
  document.getElementById("dashboard").classList.add("hidden");

  // Show super admin interface
  let superAdminInterface = document.getElementById("super-admin-interface");
  if (!superAdminInterface) {
    createSuperAdminInterface();
  } else {
    superAdminInterface.classList.remove("hidden");
  }

  loadPermissions();
}

function createSuperAdminInterface() {
  const body = document.body;

  const superAdminHTML = `
    <div id="super-admin-interface" class="max-w-full mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <header class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-purple-800">🛡️ Super Admin - Permission Management</h1>
        <div class="flex gap-2">
          <button id="dark-mode-toggle-admin" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">🌙</button>
          <button id="logout-admin" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">Logout</button>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-6">
        <!-- Permission Management -->
        <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
          <h2 class="text-2xl font-bold mb-4">User Permissions Management</h2>
          <p class="text-gray-600 dark:text-gray-300 mb-6">Control what viewers and admins can see and do in the system.</p>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Viewer Permissions -->
            <div class="bg-white dark:bg-gray-600 p-4 rounded-lg">
              <h3 class="text-lg font-bold mb-3 text-blue-600">👁️ Viewer Permissions</h3>
              <div id="viewer-permissions" class="space-y-2">
                <!-- Populated by JavaScript -->
              </div>
            </div>

            <!-- Admin Permissions -->
            <div class="bg-white dark:bg-gray-600 p-4 rounded-lg">
              <h3 class="text-lg font-bold mb-3 text-green-600">⚙️ Admin Permissions</h3>
              <div id="admin-permissions" class="space-y-2">
                <!-- Populated by JavaScript -->
              </div>
            </div>
          </div>

          <div class="mt-6 text-center">
            <button onclick="saveAllPermissions()" class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold">Save All Changes</button>
          </div>
        </div>

        <!-- Permission Categories Info -->
        <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <h3 class="text-lg font-bold mb-2">📋 Permission Categories</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <h4 class="font-semibold mb-1 text-blue-600">📊 View & Access:</h4>
              <ul class="list-disc list-inside space-y-0.5">
                <li>view_supply_register - Supply Register</li>
                <li>view_demand_register - Demand Register</li>
                <li>view_bill_register - Bill Register</li>
                <li>view_sanction_register - Sanction Register</li>
                <li>view_dashboard - Analytics Dashboard</li>
                <li>view_analytics - Data Analytics</li>
                <li>view_homepage_analytics - Homepage Stats</li>
                <li>api_access - API Endpoints</li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold mb-1 text-green-600">🔧 Data Operations:</h4>
              <ul class="list-disc list-inside space-y-0.5">
                <li>add_records - Create Records</li>
                <li>edit_records - Modify Records</li>
                <li>delete_records - Remove Records</li>
                <li>move_records - Rearrange Order</li>
                <li>import_excel - Import Excel</li>
                <li>export_excel - Export Excel</li>
                <li>data_export_all - Export All Data</li>
                <li>data_import_all - Import All Data</li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold mb-1 text-purple-600">🔍 Search & Filter:</h4>
              <ul class="list-disc list-inside space-y-0.5">
                <li>search_records - Search Functionality</li>
                <li>filter_records - Advanced Filtering</li>
                <li>sort_records - Sort Data</li>
                <li>change_financial_year - Change Years</li>
              </ul>
              <h4 class="font-semibold mb-1 mt-2 text-orange-600">📈 Reports & Analytics:</h4>
              <ul class="list-disc list-inside space-y-0.5">
                <li>generate_reports - Generate Reports</li>
                <li>print_reports - Print Reports</li>
                <li>download_pdf - PDF Download</li>
                <li>compare_years - Year Comparison</li>
                <li>advanced_visualization - Advanced Charts</li>
                <li>custom_reports - Custom Reports</li>
              </ul>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-4">
            <div>
              <h4 class="font-semibold mb-1 text-red-600">🛡️ System & Security:</h4>
              <ul class="list-disc list-inside space-y-0.5">
                <li>session_management - Session Control</li>
                <li>real_time_updates - Live Updates</li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold mb-1 text-cyan-600">🎨 Interface & UX:</h4>
              <ul class="list-disc list-inside space-y-0.5">
                <li>dark_mode_toggle - Dark Mode</li>
                <li>keyboard_shortcuts - Shortcuts</li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  `;

  body.insertAdjacentHTML("beforeend", superAdminHTML);

  // Add event listeners
  document.getElementById("logout-admin").addEventListener("click", logout);
  document
    .getElementById("dark-mode-toggle-admin")
    .addEventListener("click", toggleDarkMode);
}

async function loadPermissions() {
  try {
    const response = await fetch("/api/permissions");
    const permissions = await response.json();

    const viewerPermissions = permissions.filter((p) => p.role === "viewer");
    const adminPermissions = permissions.filter((p) => p.role === "admin");

    renderPermissions("viewer-permissions", viewerPermissions);
    renderPermissions("admin-permissions", adminPermissions);
  } catch (error) {
    console.error("Error loading permissions:", error);
  }
}

function renderPermissions(containerId, permissions) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  // Group permissions by category
  const categories = {
    "View & Access": [
      "view_supply_register",
      "view_demand_register",
      "view_bill_register",
      "view_sanction_register",
      "view_dashboard",
      "view_analytics",
      "view_homepage_analytics",
      "api_access",
      "view_backups",
    ],
    "Data Operations": [
      "add_records",
      "edit_records",
      "delete_records",
      "move_records",
      "import_excel",
      "export_excel",
      "data_export_all",
      "data_import_all",
    ],
    "Search & Filter": [
      "search_records",
      "filter_records",
      "sort_records",
      "change_financial_year",
    ],
    "Reports & Analytics": [
      "generate_reports",
      "print_reports",
      "download_pdf",
      "compare_years",
      "advanced_visualization",
    ],
    "System & Security": ["session_management", "real_time_updates"],
    "Interface & UX": ["dark_mode_toggle", "keyboard_shortcuts"],
  };

  const categoryColors = {
    "View & Access": "bg-blue-50 border-blue-200",
    "Data Operations": "bg-green-50 border-green-200",
    "Search & Filter": "bg-purple-50 border-purple-200",
    "Reports & Analytics": "bg-orange-50 border-orange-200",
    "System & Security": "bg-red-50 border-red-200",
    "Interface & UX": "bg-cyan-50 border-cyan-200",
    "Integration & Automation": "bg-teal-50 border-teal-200",
    "Content & Files": "bg-indigo-50 border-indigo-200",
  };

  Object.keys(categories).forEach((categoryName) => {
    const categoryPermissions = permissions.filter((p) =>
      categories[categoryName].includes(p.permission_name),
    );

    if (categoryPermissions.length > 0) {
      const categoryDiv = document.createElement("div");
      categoryDiv.className = `mb-4 p-3 rounded-lg border ${categoryColors[categoryName] || "bg-gray-50 border-gray-200"}`;

      const categoryHeader = document.createElement("h4");
      categoryHeader.className = "font-semibold text-sm mb-2 text-gray-700";
      categoryHeader.textContent = categoryName;
      categoryDiv.appendChild(categoryHeader);

      categoryPermissions.forEach((permission) => {
        const permissionDiv = document.createElement("div");
        permissionDiv.className =
          "flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded mb-1";

        const label = permission.permission_name
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        permissionDiv.innerHTML = `
          <span class="text-xs font-medium">${label}</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" class="sr-only peer" ${permission.enabled ? "checked" : ""}
                   data-role="${permission.role}" data-permission="${permission.permission_name}">
            <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-3 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        `;

        categoryDiv.appendChild(permissionDiv);
      });

      container.appendChild(categoryDiv);
    }
  });

  // Add any uncategorized permissions
  const categorizedPermissions = Object.values(categories).flat();
  const uncategorizedPermissions = permissions.filter(
    (p) => !categorizedPermissions.includes(p.permission_name),
  );

  if (uncategorizedPermissions.length > 0) {
    const uncategorizedDiv = document.createElement("div");
    uncategorizedDiv.className =
      "mb-4 p-3 rounded-lg border bg-gray-50 border-gray-200";

    const uncategorizedHeader = document.createElement("h4");
    uncategorizedHeader.className = "font-semibold text-sm mb-2 text-gray-700";
    uncategorizedHeader.textContent = "Other Permissions";
    uncategorizedDiv.appendChild(uncategorizedHeader);

    uncategorizedPermissions.forEach((permission) => {
      const permissionDiv = document.createElement("div");
      permissionDiv.className =
        "flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded mb-1";

      const label = permission.permission_name
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      permissionDiv.innerHTML = `
        <span class="text-xs font-medium">${label}</span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" class="sr-only peer" ${permission.enabled ? "checked" : ""}
                 data-role="${permission.role}" data-permission="${permission.permission_name}">
          <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-3 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      `;

      uncategorizedDiv.appendChild(permissionDiv);
    });

    container.appendChild(uncategorizedDiv);
  }
}

async function saveAllPermissions() {
  const checkboxes = document.querySelectorAll(
    'input[type="checkbox"][data-role]',
  );
  const updates = [];

  checkboxes.forEach((checkbox) => {
    updates.push({
      role: checkbox.dataset.role,
      permissionName: checkbox.dataset.permission,
      enabled: checkbox.checked,
    });
  });

  try {
    for (const update of updates) {
      await fetch("/api/permissions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
    }

    alert("Permissions updated successfully!");
  } catch (error) {
    console.error("Error saving permissions:", error);
    alert("Error saving permissions. Please try again.");
  }
}

// Gaming functions
let currentGame = null;
let chessGames = [];
let ludoGames = [];
let currentLudoGame = null;
let ludoCanvas = null;
let ludoCtx = null;

function showGamingInterface() {
  // Hide regular dashboard
  document.getElementById("dashboard").classList.add("hidden");

  // Show gaming interface
  let gamingInterface = document.getElementById("gaming-interface");
  if (!gamingInterface) {
    createGamingInterface();
  } else {
    gamingInterface.classList.remove("hidden");
  }

  loadGames();
}

function hideGamingInterface() {
  const gamingInterface = document.getElementById("gaming-interface");
  if (gamingInterface) {
    gamingInterface.classList.add("hidden");
  }
}

function createGamingInterface() {
  const body = document.body;

  const gamingHTML = `
    <div id="gaming-interface" class="max-w-full mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <header class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-purple-800">🎮 Gaming Hub</h1>
        <div class="flex gap-2">
          <button id="fullscreen-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">⛶ Fullscreen</button>
          <button id="dark-mode-toggle-gaming" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">🌙</button>
          <button id="logout-gaming" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">Logout</button>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Game List -->
        <div class="lg:col-span-1">
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
            <h3 class="text-lg font-bold mb-3">🆔 Join Game by ID</h3>
            <div class="space-y-3">
              <div class="flex gap-2">
                <input type="text" id="game-id-input" placeholder="Enter Game ID..." class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <button id="join-by-id-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Join</button>
              </div>
              <div class="text-xs text-gray-500">
                Enter a Chess, Ludo, or Tic-Tac-Toe game ID to join directly
              </div>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">Multiplayer Games</h2>
              <button id="create-ludo-btn" class="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition">🎲 New Ludo</button>
            </div>
            <div id="ludo-games-list" class="space-y-2 mb-4">
              <p class="text-gray-500">Loading Ludo games...</p>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">Chess Games</h2>
              <button id="create-game-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">New Game</button>
            </div>
            <div id="games-list" class="space-y-2">
              <p class="text-gray-500">Loading games...</p>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mt-4">
            <h3 class="text-xl font-bold mb-2">Arcade Games</h3>
            <div class="grid grid-cols-1 gap-2">
              <button class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition" onclick="startTypingMaster()">⌨️ Typing Master</button>
              <button class="w-full bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition" onclick="startSpaceInvaders()">👾 Space Defense</button>
              <button class="w-full bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition" onclick="startMemoryGame()">🧠 Memory Match</button>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mt-4">
            <h3 class="text-xl font-bold mb-2">Card Games</h3>
            <div class="grid grid-cols-1 gap-2">
              <button class="w-full bg-gradient-to-r from-red-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-blue-600 transition font-bold" onclick="startUNO()">🃏 UNO</button>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mt-4">
            <h3 class="text-xl font-bold mb-2">Classic Games</h3>
            <div class="grid grid-cols-1 gap-2">
              <button class="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition" onclick="startHangman()">🎯 Hangman</button>
              <button class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition" onclick="startTicTacToe()">⭕ Tic Tac Toe</button>
              <button class="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition" onclick="startSnake()">🐍 Snake Game</button>
              <button class="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition" onclick="startRockPaperScissors()">✂️ Rock Paper Scissors</button>
              <button class="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition" onclick="startNumberGuess()">🔢 Number Guessing</button>
            </div>
          </div>
        </div>

        <!-- Game Board -->
        <div class="lg:col-span-2">
          <!-- Ludo Game -->
          <div id="ludo-game" class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hidden">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">🎲 Multiplayer Ludo</h2>
              <div class="flex gap-2">
                <div id="ludo-status" class="text-lg font-semibold"></div>
                <button id="leave-ludo-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">Leave Game</button>
              </div>
            </div>

            <div id="ludo-setup" class="mb-4">
              <div class="bg-white dark:bg-gray-600 p-4 rounded-lg mb-4">
                <h3 class="text-xl font-bold mb-2">🎲 Game Settings</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium mb-1">Game Mode:</label>
                    <select id="game-mode" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-500">
                      <option value="single">🎮 Single Player vs Computer</option>
                      <option value="multi">👥 Multiplayer</option>
                    </select>
                  </div>
                  <div id="multiplayer-options">
                    <label class="block text-sm font-medium mb-1">Number of Players:</label>
                    <select id="player-count" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-500">
                      <option value="2">2 Players</option>
                      <option value="3">3 Players</option>
                      <option value="4" selected>4 Players</option>
                    </select>
                  </div>
                  <div id="single-player-options" class="hidden">
                    <label class="block text-sm font-medium mb-1">Difficulty:</label>
                    <select id="difficulty" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-500">
                      <option value="easy">🟢 Easy</option>
                      <option value="medium" selected>🟡 Medium</option>
                      <option value="hard">🔴 Hard</option>
                    </select>
                  </div>
                </div>
                <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 How to Play:</h4>
                  <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Roll dice to move your pieces around the board</li>
                    <li>• Get all 4 pieces to the center to win</li>
                    <li>• Roll 6 to get pieces out of home</li>
                    <li>• Land on opponents to send them back home</li>
                  </ul>
                </div>
                <button id="start-ludo-game" class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition mt-3 font-semibold shadow-lg">🚀 Start Game</button>
              </div>
            </div>

            <div id="ludo-board-container" class="relative mx-auto" style="width: 600px; height: 600px;">
              <canvas id="ludo-board" width="600" height="600" class="border-4 border-gray-800 rounded-lg bg-white"></canvas>
              <div id="ludo-controls" class="absolute bottom-4 left-4 flex gap-2">
                <button id="roll-dice" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50" disabled>🎲 Roll Dice</button>
                <div id="dice-result" class="bg-white px-4 py-2 rounded-lg border-2 border-gray-300 min-w-12 text-center font-bold"></div>
              </div>
            </div>

            <div id="ludo-info" class="text-center mt-4">
              <p id="ludo-turn-indicator" class="text-lg font-semibold mb-2"></p>
              <div id="player-list" class="flex justify-center gap-4 flex-wrap"></div>
            </div>
          </div>

          <div id="chess-game" class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hidden">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">Chess Game</h2>
              <div id="game-status" class="text-lg font-semibold"></div>
            </div>
            <div id="chess-board" class="grid grid-cols-8 gap-1 w-96 h-96 mx-auto mb-4"></div>
            <div id="game-info" class="text-center">
              <p id="turn-indicator" class="text-lg font-semibold mb-2"></p>
              <button id="leave-game-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">Leave Game</button>
            </div>
          </div>

          <div id="other-games" class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h2 class="text-xl font-bold mb-4 text-center">Select a Game to Play</h2>
            <div class="text-center text-gray-500">
              <p>Choose a game from the sidebar to start playing!</p>
              <div class="mt-4">
                <span class="text-6xl">🎮</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  body.insertAdjacentHTML("beforeend", gamingHTML);

  // Add event listeners
  document.getElementById("logout-gaming").addEventListener("click", logout);
  document
    .getElementById("dark-mode-toggle-gaming")
    .addEventListener("click", toggleDarkMode);
  document
    .getElementById("create-game-btn")
    .addEventListener("click", createGame);
  document
    .getElementById("leave-game-btn")
    .addEventListener("click", leaveGame);
  document
    .getElementById("create-ludo-btn")
    .addEventListener("click", createLudoGame);
  document
    .getElementById("leave-ludo-btn")
    .addEventListener("click", leaveLudoGame);
  document
    .getElementById("start-ludo-game")
    .addEventListener("click", startLudoGame);
  document.getElementById("roll-dice").addEventListener("click", rollDice);
  document
    .getElementById("fullscreen-btn")
    .addEventListener("click", toggleFullscreen);
  document
    .getElementById("join-by-id-btn")
    .addEventListener("click", joinGameById);
}

function joinGamingRoom() {
  if (socket) {
    socket.emit("join-gaming");

    socket.on("game-updated", (data) => {
      loadGames();
      if (currentGame && currentGame.id === data.gameId) {
        currentGame = data.game;
        updateGameInterface();
      }
    });

    socket.on("move-made", (data) => {
      if (currentGame && currentGame.id === data.gameId) {
        currentGame = data.game;
        updateChessBoard();
        updateGameStatus();
      }
    });
  }
}

async function loadGames() {
  try {
    const [chessResponse, ludoResponse] = await Promise.all([
      fetch("/api/chess/games"),
      fetch("/api/ludo/games"),
    ]);

    if (chessResponse.ok) {
      chessGames = await chessResponse.json();
      updateGamesList();
    }

    if (ludoResponse.ok) {
      ludoGames = await ludoResponse.json();
      updateLudoGamesList();
    }
  } catch (error) {
    console.error("Error loading games:", error);
  }
}

function updateGamesList() {
  const gamesList = document.getElementById("games-list");

  if (chessGames.length === 0) {
    gamesList.innerHTML = '<p class="text-gray-500">No active games</p>';
    return;
  }

  gamesList.innerHTML = chessGames
    .map(
      (game) => `
    <div class="bg-white dark:bg-gray-600 p-3 rounded-lg">
      <div class="flex justify-between items-center">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <p class="font-semibold">Chess Game #${game.id.slice(-4)}</p>
            <button onclick="copyGameId('${game.id}')" class="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">📋</button>
          </div>
          <p class="text-xs text-gray-500 font-mono mb-1">ID: ${game.id}</p>
          <p class="text-sm text-gray-600 dark:text-gray-300">Players: ${game.players.join(", ")}</p>
          <p class="text-sm text-gray-600 dark:text-gray-300">Status: ${game.status}</p>
        </div>
        <button onclick="joinGame('${game.id}')" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition text-sm ml-2">
          ${game.players.includes(currentUser.username) ? "Resume" : "Join"}
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

async function createGame() {
  try {
    const response = await fetch("/api/chess/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const result = await response.json();
      currentGame = result.game;
      showChessGame();
      loadGames();

      // Show game ID notification
      alert(
        `Chess game created! Game ID: ${result.game.id}\nShare this ID with friends to play together.`,
      );
    }
  } catch (error) {
    console.error("Error creating game:", error);
  }
}

async function joinGame(gameId) {
  try {
    const response = await fetch(`/api/chess/join/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const result = await response.json();
      currentGame = result.game;
      showChessGame();
    } else {
      const error = await response.json();
      alert(error.message);
    }
  } catch (error) {
    console.error("Error joining game:", error);
  }
}

function showChessGame() {
  document.getElementById("other-games").classList.add("hidden");
  document.getElementById("chess-game").classList.remove("hidden");
  createChessBoard();
  updateGameInterface();
}

function createChessBoard() {
  const board = document.getElementById("chess-board");
  board.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.className = `chess-square w-12 h-12 flex items-center justify-center text-2xl cursor-pointer ${
        (row + col) % 2 === 0 ? "bg-amber-100" : "bg-amber-800"
      }`;
      square.dataset.row = row;
      square.dataset.col = col;
      square.addEventListener("click", handleSquareClick);

      if (currentGame && currentGame.board[row][col]) {
        square.textContent = getPieceSymbol(currentGame.board[row][col]);
      }

      board.appendChild(square);
    }
  }
}

function getPieceSymbol(piece) {
  const symbols = {
    K: "♔",
    Q: "♕",
    R: "♖",
    B: "♗",
    N: "♘",
    P: "♙",
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟",
  };
  return symbols[piece] || "";
}

let selectedSquare = null;

function handleSquareClick(event) {
  const square = event.target;
  const row = parseInt(square.dataset.row);
  const col = parseInt(square.dataset.col);

  if (selectedSquare) {
    // Make move
    const fromCol = String.fromCharCode(97 + selectedSquare.col);
    const fromRow = (8 - selectedSquare.row).toString();
    const toCol = String.fromCharCode(97 + col);
    const toRow = (8 - row).toString();

    makeMove(fromCol + fromRow, toCol + toRow);

    // Clear selection
    document
      .querySelectorAll(".chess-square")
      .forEach((sq) => sq.classList.remove("bg-yellow-300"));
    selectedSquare = null;
  } else {
    // Select square
    if (currentGame.board[row][col]) {
      selectedSquare = { row, col };
      square.classList.add("bg-yellow-300");
    }
  }
}

async function makeMove(from, to) {
  try {
    const response = await fetch("/api/chess/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: currentGame.id,
        from,
        to,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      currentGame = result.game;
      updateChessBoard();
      updateGameStatus();
    } else {
      const error = await response.json();
      alert(error.message);
    }
  } catch (error) {
    console.error("Error making move:", error);
  }
}

function updateChessBoard() {
  const squares = document.querySelectorAll(".chess-square");
  squares.forEach((square) => {
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    square.textContent = currentGame.board[row][col]
      ? getPieceSymbol(currentGame.board[row][col])
      : "";
  });
}

function updateGameInterface() {
  updateGameStatus();
  updateChessBoard();
}

function updateGameStatus() {
  const statusEl = document.getElementById("game-status");
  const turnEl = document.getElementById("turn-indicator");

  statusEl.textContent = `Status: ${currentGame.status}`;

  if (currentGame.status === "playing") {
    const currentPlayer =
      currentGame.players[currentGame.turn === "white" ? 0 : 1];
    turnEl.textContent = `${currentGame.turn === "white" ? "White" : "Black"}'s turn (${currentPlayer})`;
  } else if (currentGame.status === "finished") {
    turnEl.textContent = `Game Over! Winner: ${currentGame.winner}`;
  } else if (currentGame.status === "draw") {
    turnEl.textContent = "Game ended in a draw!";
  } else {
    turnEl.textContent = "Waiting for opponent...";
  }
}

function leaveGame() {
  currentGame = null;
  document.getElementById("chess-game").classList.add("hidden");
  document.getElementById("other-games").classList.remove("hidden");
  loadGames();
}

// Ludo Game Functions
function updateLudoGamesList() {
  const gamesList = document.getElementById("ludo-games-list");

  if (ludoGames.length === 0) {
    gamesList.innerHTML = '<p class="text-gray-500">No Ludo games</p>';
    return;
  }

  gamesList.innerHTML = ludoGames
    .map(
      (game) => `
    <div class="bg-white dark:bg-gray-600 p-3 rounded-lg">
      <div class="flex justify-between items-center">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <p class="font-semibold">Ludo #${game.id.slice(-4)}</p>
            <button onclick="copyGameId('${game.id}')" class="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">📋</button>
          </div>
          <p class="text-xs text-gray-500 font-mono mb-1">ID: ${game.id}</p>
          <p class="text-sm text-gray-600 dark:text-gray-300">Players: ${game.players.length}/${game.maxPlayers}</p>
          <p class="text-sm text-gray-600 dark:text-gray-300">Status: ${game.status}</p>
        </div>
        <button onclick="joinLudoGame('${game.id}')" class="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition text-sm ml-2">
          ${game.players.some((p) => p.name === currentUser.username) ? "Resume" : "Join"}
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

async function createLudoGame() {
  try {
    const response = await fetch("/api/ludo/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const result = await response.json();
      currentLudoGame = result.game;
      showLudoGame();
      loadGames();

      // Show game ID notification
      alert(
        `Ludo game created! Game ID: ${result.game.id}\nShare this ID with friends to play together.`,
      );
    }
  } catch (error) {
    console.error("Error creating Ludo game:", error);
  }
}

async function joinLudoGame(gameId) {
  try {
    const response = await fetch(`/api/ludo/join/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const result = await response.json();
      currentLudoGame = result.game;
      showLudoGame();
    } else {
      const error = await response.json();
      alert(error.message);
    }
  } catch (error) {
    console.error("Error joining Ludo game:", error);
  }
}

function showLudoGame() {
  document.getElementById("other-games").classList.add("hidden");
  document.getElementById("chess-game").classList.add("hidden");
  document.getElementById("ludo-game").classList.remove("hidden");

  ludoCanvas = document.getElementById("ludo-board");
  ludoCtx = ludoCanvas.getContext("2d");

  if (currentLudoGame.status === "waiting") {
    document.getElementById("ludo-setup").style.display = "block";
    document.getElementById("ludo-board-container").style.display = "none";
  } else {
    document.getElementById("ludo-setup").style.display = "none";
    document.getElementById("ludo-board-container").style.display = "block";
    initializeLudoBoard();
  }

  updateLudoGameInterface();
}

function startLudoGame() {
  const gameMode = document.getElementById("game-mode").value;
  let playerCount, addComputer;

  if (gameMode === "single") {
    playerCount = 2; // Player vs 1 computer
    addComputer = true;
  } else {
    playerCount = parseInt(document.getElementById("player-count").value);
    addComputer = true; // Always add computers to fill remaining slots
  }

  if (!currentLudoGame) return;

  fetch(`/api/ludo/start/${currentLudoGame.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerCount, addComputer, gameMode }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        currentLudoGame = result.game;
        document.getElementById("ludo-setup").style.display = "none";
        document.getElementById("ludo-board-container").style.display = "block";
        initializeLudoBoard();
        updateLudoGameInterface();
      }
    })
    .catch((error) => console.error("Error starting Ludo game:", error));

  // Add game mode selector event listener
  document.getElementById("game-mode").addEventListener("change", function () {
    const singleOptions = document.getElementById("single-player-options");
    const multiOptions = document.getElementById("multiplayer-options");

    if (this.value === "single") {
      singleOptions.classList.remove("hidden");
      multiOptions.classList.add("hidden");
    } else {
      singleOptions.classList.add("hidden");
      multiOptions.classList.remove("hidden");
    }
  });
}

function initializeLudoBoard() {
  if (!ludoCtx) return;

  // Clear canvas
  ludoCtx.clearRect(0, 0, 600, 600);

  // Draw board background
  ludoCtx.fillStyle = "#f0f0f0";
  ludoCtx.fillRect(0, 0, 600, 600);

  // Draw board sections
  drawLudoBoard();
  drawPieces();
}

function drawLudoBoard() {
  const colors = [
    "#ff4444",
    "#4444ff",
    "#44ff44",
    "#ffff44",
    "#ff44ff",
    "#44ffff",
    "#ff8844",
    "#8844ff",
  ];
  const boardSize = 600;
  const cellSize = boardSize / 15;

  // Draw home areas (corners)
  for (let i = 0; i < Math.min(currentLudoGame.players.length, 8); i++) {
    const color = colors[i];
    const x = (i % 2) * (boardSize - 6 * cellSize);
    const y = Math.floor(i / 2) * (boardSize - 6 * cellSize);

    if (i < 4) {
      // Standard 4-player positions
      const homeX = (i % 2) * 9 * cellSize;
      const homeY = Math.floor(i / 2) * 9 * cellSize;

      ludoCtx.fillStyle = color;
      ludoCtx.fillRect(homeX, homeY, 6 * cellSize, 6 * cellSize);
      ludoCtx.strokeStyle = "#000";
      ludoCtx.lineWidth = 2;
      ludoCtx.strokeRect(homeX, homeY, 6 * cellSize, 6 * cellSize);

      // Draw home circles
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const circleX = homeX + (col + 1) * 1.5 * cellSize;
          const circleY = homeY + (row + 1) * 1.5 * cellSize;

          ludoCtx.beginPath();
          ludoCtx.arc(circleX, circleY, cellSize * 0.4, 0, 2 * Math.PI);
          ludoCtx.fillStyle = "white";
          ludoCtx.fill();
          ludoCtx.strokeStyle = "#000";
          ludoCtx.stroke();
        }
      }
    }
  }

  // Draw main path
  ludoCtx.fillStyle = "#ffffff";
  ludoCtx.strokeStyle = "#000";
  ludoCtx.lineWidth = 2;

  // Horizontal strips
  ludoCtx.fillRect(0, 6 * cellSize, 6 * cellSize, 3 * cellSize);
  ludoCtx.strokeRect(0, 6 * cellSize, 6 * cellSize, 3 * cellSize);

  ludoCtx.fillRect(9 * cellSize, 6 * cellSize, 6 * cellSize, 3 * cellSize);
  ludoCtx.strokeRect(9 * cellSize, 6 * cellSize, 6 * cellSize, 3 * cellSize);

  // Vertical strips
  ludoCtx.fillRect(6 * cellSize, 0, 3 * cellSize, 6 * cellSize);
  ludoCtx.strokeRect(6 * cellSize, 0, 3 * cellSize, 6 * cellSize);

  ludoCtx.fillRect(6 * cellSize, 9 * cellSize, 3 * cellSize, 6 * cellSize);
  ludoCtx.strokeRect(6 * cellSize, 9 * cellSize, 3 * cellSize, 6 * cellSize);

  // Center area
  ludoCtx.fillStyle = "#ffd700";
  ludoCtx.fillRect(6 * cellSize, 6 * cellSize, 3 * cellSize, 3 * cellSize);
  ludoCtx.strokeRect(6 * cellSize, 6 * cellSize, 3 * cellSize, 3 * cellSize);

  // Draw path cells
  for (let i = 0; i < 52; i++) {
    const pos = getLudoBoardPosition(i);
    ludoCtx.strokeRect(pos.x * cellSize, pos.y * cellSize, cellSize, cellSize);
  }
}

function getLudoBoardPosition(position) {
  const positions = [
    // Bottom row (left to right)
    { x: 1, y: 8 },
    { x: 2, y: 8 },
    { x: 3, y: 8 },
    { x: 4, y: 8 },
    { x: 5, y: 8 },
    // Right column (bottom to top)
    { x: 6, y: 8 },
    { x: 7, y: 8 },
    { x: 8, y: 7 },
    { x: 8, y: 6 },
    { x: 8, y: 5 },
    { x: 8, y: 4 },
    { x: 8, y: 3 },
    { x: 8, y: 2 },
    { x: 8, y: 1 },
    // Top row (right to left)
    { x: 9, y: 1 },
    { x: 10, y: 1 },
    { x: 11, y: 1 },
    { x: 12, y: 1 },
    { x: 13, y: 1 },
    { x: 13, y: 2 },
    // Right column (top to bottom)
    { x: 13, y: 3 },
    { x: 13, y: 4 },
    { x: 13, y: 5 },
    { x: 13, y: 6 },
    { x: 12, y: 6 },
    { x: 11, y: 6 },
    { x: 10, y: 6 },
    { x: 9, y: 6 },
    // Top row (left to right)
    { x: 9, y: 7 },
    { x: 9, y: 8 },
    { x: 10, y: 8 },
    { x: 11, y: 8 },
    { x: 12, y: 8 },
    { x: 13, y: 8 },
    { x: 13, y: 9 },
    // Right column (top to bottom)
    { x: 13, y: 10 },
    { x: 13, y: 11 },
    { x: 13, y: 12 },
    { x: 13, y: 13 },
    { x: 12, y: 13 },
    { x: 11, y: 13 },
    { x: 10, y: 13 },
    { x: 9, y: 13 },
    // Bottom row (right to left)
    { x: 8, y: 13 },
    { x: 8, y: 12 },
    { x: 8, y: 11 },
    { x: 8, y: 10 },
    { x: 8, y: 9 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
    // Left column (bottom to top)
    { x: 5, y: 8 },
    { x: 4, y: 8 },
    { x: 3, y: 8 },
    { x: 2, y: 8 },
    { x: 1, y: 8 },
  ];

  return positions[position % 52];
}

function drawPieces() {
  if (!currentLudoGame || !currentLudoGame.board) return;

  const colors = [
    "#ff4444",
    "#4444ff",
    "#44ff44",
    "#ffff44",
    "#ff44ff",
    "#44ffff",
    "#ff8844",
    "#8844ff",
  ];
  const cellSize = 40;

  currentLudoGame.players.forEach((player, playerIndex) => {
    const color = colors[playerIndex];

    player.pieces.forEach((piece, pieceIndex) => {
      let x, y;

      if (piece.position === -1) {
        // Piece is at home
        const homeX = (playerIndex % 2) * (15 - 6) * cellSize; // Adjust home position calculation
        const homeY = Math.floor(playerIndex / 2) * (15 - 6) * cellSize; // Adjust home position calculation
        const row = Math.floor(pieceIndex / 2);
        const col = pieceIndex % 2;
        x = homeX + (col + 1) * 1.5 * cellSize;
        y = homeY + (row + 1) * 1.5 * cellSize;
      } else if (piece.position === 56) {
        // Piece has reached the end
        x = 7.5 * cellSize;
        y = 7.5 * cellSize;
      } else {
        // Piece is on the board
        const pos = getLudoBoardPosition(piece.position);
        x = (pos.x + 0.5) * cellSize;
        y = (pos.y + 0.5) * cellSize;
      }

      // Draw piece
      ludoCtx.beginPath();
      ludoCtx.arc(x, y, cellSize * 0.3, 0, 2 * Math.PI);
      ludoCtx.fillStyle = color;
      ludoCtx.fill();
      ludoCtx.strokeStyle = "#000";
      ludoCtx.lineWidth = 2;
      ludoCtx.stroke();

      // Draw piece number
      ludoCtx.fillStyle = "white";
      ludoCtx.font = "12px Arial";
      ludoCtx.textAlign = "center";
      ludoCtx.fillText((pieceIndex + 1).toString(), x, y + 4);
    });
  });
}

function updateLudoGameInterface() {
  if (!currentLudoGame) return;

  const statusEl = document.getElementById("ludo-status");
  const turnEl = document.getElementById("ludo-turn-indicator");
  const rollButton = document.getElementById("roll-dice");
  const playerListEl = document.getElementById("player-list");

  statusEl.textContent = `Status: ${currentLudoGame.status}`;

  if (currentLudoGame.status === "playing") {
    const currentPlayer =
      currentLudoGame.players[currentLudoGame.currentPlayerIndex];
    turnEl.textContent = `${currentPlayer.name}'s turn`;

    const isMyTurn = currentPlayer.name === currentUser.username;
    rollButton.disabled = !isMyTurn || currentLudoGame.diceRolled;

    if (currentLudoGame.lastDiceRoll) {
      document.getElementById("dice-result").textContent =
        currentLudoGame.lastDiceRoll;
    }
  } else {
    turnEl.textContent = "Waiting for players...";
    rollButton.disabled = true;
  }

  // Update player list
  playerListEl.innerHTML = currentLudoGame.players
    .map((player, index) => {
      const colors = ["🔴", "🔵", "🟢", "🟡", "🟣", "🔷", "🟠", "🟪"];
      const isActive = index === currentLudoGame.currentPlayerIndex;
      return `
      <div class="text-center ${isActive ? "bg-yellow-200 dark:bg-yellow-800" : ""} p-2 rounded">
        <div class="text-2xl">${colors[index]}</div>
        <div class="text-sm">${player.name}</div>
        <div class="text-xs">${player.piecesInGoal}/4 home</div>
      </div>
    `;
    })
    .join("");
}

async function rollDice() {
  if (!currentLudoGame) return;

  try {
    const response = await fetch(`/api/ludo/roll/${currentLudoGame.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const result = await response.json();
      currentLudoGame = result.game;
      updateLudoGameInterface();
      drawPieces();
    }
  } catch (error) {
    console.error("Error rolling dice:", error);
  }
}

function leaveLudoGame() {
  currentLudoGame = null;
  document.getElementById("ludo-game").classList.add("hidden");
  document.getElementById("other-games").classList.remove("hidden");
  loadGames();
}

function toggleFullscreen() {
  const gamingInterface = document.getElementById("gaming-interface");

  if (!document.fullscreenElement) {
    gamingInterface.requestFullscreen().catch((err) => {
      console.error("Error attempting to enable fullscreen:", err);
    });
  } else {
    document.exitFullscreen();
  }
}

async function joinGameById() {
  const gameIdInput = document.getElementById("game-id-input");
  const gameId = gameIdInput.value.trim();

  if (!gameId) {
    alert("Please enter a Game ID");
    return;
  }

  try {
    // Determine game type based on ID prefix or try different endpoints
    if (gameId.startsWith("ludo_")) {
      // Try joining Ludo game
      await joinLudoGame(gameId);
    } else if (gameId.startsWith("ttt_")) {
      // Try joining Tic-Tac-Toe game
      await joinTicTacToeGame(gameId);
    } else {
      // Try joining Chess game first, then others
      try {
        await joinGame(gameId);
      } catch (chessError) {
        try {
          await joinLudoGame(gameId);
        } catch (ludoError) {
          try {
            await joinTicTacToeGame(gameId);
          } catch (tttError) {
            throw new Error("Game not found or unable to join");
          }
        }
      }
    }

    // Clear the input on successful join
    gameIdInput.value = "";
  } catch (error) {
    console.error("Error joining game by ID:", error);
    alert("Could not join game. Please check the Game ID and try again.");
  }
}

async function joinTicTacToeGame(gameId) {
  // Create a new Tic-Tac-Toe game with the specified ID
  // Since Tic-Tac-Toe is currently single-player, we'll create a multiplayer version
  const ticTacToeGameId = gameId;

  // Initialize multiplayer Tic-Tac-Toe
  document.getElementById("other-games").innerHTML = `
    <div class="max-w-2xl mx-auto p-6">
      <h2 class="text-3xl font-bold mb-6 text-center text-blue-600">⭕ Multiplayer Tic Tac Toe</h2>

      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <div class="text-center mb-4">
          <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">Game ID: <span class="font-mono font-bold">${ticTacToeGameId}</span></p>
            <p class="text-sm text-gray-500 mt-1">Share this ID with friends to play together!</p>
          </div>
        </div>

        <div id="tic-tac-toe-board" class="grid grid-cols-3 gap-3 w-80 h-80 mx-auto mb-6">
          ${Array.from(
            { length: 9 },
            (_, i) => `
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-2 border-blue-300 dark:border-blue-600 flex items-center justify-center text-5xl font-bold cursor-pointer hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800 dark:hover:to-blue-700 transition-all duration-200 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105"
                 onclick="makeTicTacToeMove(${i})"></div>
          `,
          ).join("")}
        </div>

        <div class="text-center">
          <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
            <p id="tic-tac-toe-status" class="text-xl font-semibold text-blue-800 dark:text-blue-200">Waiting for opponent...</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">You are: <span id="player-symbol" class="font-bold">X</span></p>
          </div>
          <button onclick="resetTicTacToe()" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">🔄 Reset Game</button>
          <button onclick="copyGameId('${ticTacToeGameId}')" class="ml-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">📋 Copy Game ID</button>
        </div>
      </div>

      <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
        <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 How to Play:</h4>
        <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Share the Game ID with a friend to play together</li>
          <li>• Players take turns placing X and O</li>
          <li>• Get 3 in a row (horizontal, vertical, or diagonal) to win</li>
          <li>• X always goes first</li>
          <li>• In multiplayer, share the Game ID with a friend!</li>
        </ul>
      </div>
    </div>
  `;

  // Initialize multiplayer Tic-Tac-Toe state
  window.ticTacToeBoard = Array(9).fill("");
  window.ticTacToeCurrentPlayer = "X";
  window.ticTacToeGameId = ticTacToeGameId;
  window.ticTacToePlayerSymbol = "X"; // This would be determined by server in real implementation
}

// Other simple games
function startTicTacToe() {
  const content = document.getElementById("other-games");
  content.innerHTML = `
    <div class="max-w-2xl mx-auto p-6">
      <h2 class="text-3xl font-bold mb-6 text-center text-blue-600">⭕ Tic Tac Toe</h2>

      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <div class="text-center mb-4">
          <div class="space-y-2">
            <button onclick="startSinglePlayerTicTacToe()" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 mr-2">🎮 Single Player</button>
            <button onclick="createMultiplayerTicTacToe()" class="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">👥 Multiplayer</button>
          </div>
        </div>

        <div id="tic-tac-toe-content">
          <div class="text-center text-gray-500">
            <p>Choose a game mode to start playing!</p>
            <div class="mt-4">
              <span class="text-6xl">⭕</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
        <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 How to Play:</h4>
        <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Players take turns placing X and O</li>
          <li>• Get 3 in a row (horizontal, vertical, or diagonal) to win</li>
          <li>• X always goes first</li>
          <li>• In multiplayer, share the Game ID with a friend!</li>
        </ul>
      </div>
    </div>
  `;
}

function startSinglePlayerTicTacToe() {
  const content = document.getElementById("tic-tac-toe-content");
  content.innerHTML = `
    <div id="tic-tac-toe-board" class="grid grid-cols-3 gap-3 w-80 h-80 mx-auto mb-6">
      ${Array.from(
        { length: 9 },
        (_, i) => `
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-2 border-blue-300 dark:border-blue-600 flex items-center justify-center text-5xl font-bold cursor-pointer hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800 dark:hover:to-blue-700 transition-all duration-200 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105"
             onclick="makeTicTacToeMove(${i})"></div>
      `,
      ).join("")}
    </div>

    <div class="text-center">
      <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
        <p id="tic-tac-toe-status" class="text-xl font-semibold text-blue-800 dark:text-blue-200">Player X's turn</p>
      </div>
      <button onclick="resetTicTacToe()" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">🔄 Reset Game</button>
    </div>
  `;

  window.ticTacToeBoard = Array(9).fill("");
  window.ticTacToeCurrentPlayer = "X";
}

function createMultiplayerTicTacToe() {
  const gameId = "ttt_" + Date.now().toString();

  const content = document.getElementById("tic-tac-toe-content");
  content.innerHTML = `
    <div class="text-center mb-4">
      <div class="bg-green-50 dark:bg-green-900 p-4 rounded-lg mb-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Game ID: <span class="font-mono font-bold">${gameId}</span></p>
        <p class="text-sm text-gray-500 mt-1">Share this ID with friends to play together!</p>
        <button onclick="copyGameId('${gameId}')" class="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">📋 Copy Game ID</button>
      </div>
    </div>

    <div id="tic-tac-toe-board" class="grid grid-cols-3 gap-3 w-80 h-80 mx-auto mb-6">
      ${Array.from(
        { length: 9 },
        (_, i) => `
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-2 border-blue-300 dark:border-blue-600 flex items-center justify-center text-5xl font-bold cursor-pointer hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800 dark:hover:to-blue-700 transition-all duration-200 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105"
             onclick="makeTicTacToeMove(${i})"></div>
      `,
      ).join("")}
    </div>

    <div class="text-center">
      <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
        <p id="tic-tac-toe-status" class="text-xl font-semibold text-blue-800 dark:text-blue-200">Waiting for opponent...</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">You are: <span id="player-symbol" class="font-bold">X</span></p>
      </div>
      <button onclick="resetTicTacToe()" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">🔄 Reset Game</button>
    </div>
  `;

  // Show success notification
  alert(
    `Multiplayer Tic-Tac-Toe created! Game ID: ${gameId}\nShare this ID with friends to play together.`,
  );
}

function makeTicTacToeMove(index) {
  if (window.ticTacToeBoard[index] === "" && !checkTicTacToeWinner()) {
    window.ticTacToeBoard[index] = window.ticTacToeCurrentPlayer;
    document.querySelectorAll("#tic-tac-toe-board div")[index].textContent =
      window.ticTacToeCurrentPlayer;

    const winner = checkTicTacToeWinner();
    if (winner) {
      document.getElementById("tic-tac-toe-status").textContent =
        `Player ${winner} wins!`;
    } else if (window.ticTacToeBoard.every((cell) => cell !== "")) {
      document.getElementById("tic-tac-toe-status").textContent =
        "It's a draw!";
    } else {
      window.ticTacToeCurrentPlayer =
        window.ticTacToeCurrentPlayer === "X" ? "O" : "X";
      document.getElementById("tic-tac-toe-status").textContent =
        `Player ${window.ticTacToeCurrentPlayer}'s turn`;
    }
  }
}

function checkTicTacToeWinner() {
  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (
      window.ticTacToeBoard[a] &&
      window.ticTacToeBoard[a] === window.ticTacToeBoard[b] &&
      window.ticTacToeBoard[a] === window.ticTacToeBoard[c]
    ) {
      return window.ticTacToeBoard[a];
    }
  }
  return null;
}

function resetTicTacToe() {
  startTicTacToe();
}

function copyGameId(gameId) {
  navigator.clipboard
    .writeText(gameId)
    .then(() => {
      // Show temporary success message
      const button = event.target;
      const originalText = button.innerHTML;
      button.innerHTML = "✅ Copied!";
      button.disabled = true;

      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 2000);
    })
    .catch(() => {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = gameId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Game ID copied to clipboard!");
    });
}

// UNO Game Implementation
function startUNO() {
  document.getElementById("other-games").innerHTML = `
    <div class="max-w-4xl mx-auto p-6">
      <h2 class="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">🃏 UNO Game</h2>

      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div class="text-center mb-4">
          <div class="space-y-2">
            <button onclick="startSinglePlayerUNO()" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 mr-2">🎮 Single Player</button>
            <button onclick="createMultiplayerUNO()" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">👥 Multiplayer</button>
          </div>
        </div>

        <div id="uno-content">
          <div class="text-center text-gray-500">
            <p>Choose a game mode to start playing!</p>
            <div class="mt-4">
              <span class="text-6xl">🃏</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-r from-red-50 to-blue-50 dark:from-red-900 dark:to-blue-900 p-4 rounded-lg mt-4">
        <h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">🎯 How to Play UNO:</h4>
        <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li>• Match the color or number of the top card</li>
          <li>• Special cards: Skip, Reverse, Draw Two, Wild, Wild Draw Four</li>
          <li>• Say "UNO" when you have one card left!</li>
          <li>• First player to get rid of all cards wins</li>
          <li>• Draw cards if you can't play</li>
        </ul>
      </div>
    </div>
  `;
}

function startSinglePlayerUNO() {
  const content = document.getElementById("uno-content");
  content.innerHTML = `
    <div class="uno-game-container">
      <!-- Game Status -->
      <div class="text-center mb-4">
        <div class="bg-gradient-to-r from-red-50 to-blue-50 dark:from-red-900 dark:to-blue-900 p-4 rounded-lg mb-4">
          <p id="uno-status" class="text-xl font-semibold text-gray-800 dark:text-gray-200">Your turn!</p>
          <p id="uno-turn-info" class="text-sm text-gray-600 dark:text-gray-400">Match ${window.unoGame ? window.unoGame.currentColor : "color"} or ${window.unoGame ? window.unoGame.currentNumber : "number"}</p>
        </div>
      </div>

      <!-- Game Board -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Computer Hand -->
        <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <h3 class="text-lg font-bold mb-2 text-center">🤖 Computer</h3>
          <div id="computer-hand" class="flex justify-center flex-wrap gap-1">
            <!-- Computer cards (face down) -->
          </div>
          <p class="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
            Cards: <span id="computer-card-count">7</span>
          </p>
        </div>

        <!-- Game Center -->
        <div class="text-center">
          <div class="mb-4">
            <h3 class="text-lg font-bold mb-2">Draw Pile & Discard</h3>
            <div class="flex justify-center items-center gap-4">
              <div class="uno-card back-card cursor-pointer hover:scale-105 transition-transform" onclick="drawCard()">
                <div class="card-content">🃏</div>
              </div>
              <div id="discard-pile" class="uno-card" style="background: linear-gradient(45deg, #ff0000, #0000ff);">
                <div class="card-content">Start</div>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <button id="uno-button" onclick="sayUNO()" class="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-600 transition font-bold" style="display: none;">🔥 UNO!</button>
            <button onclick="resetUNO()" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">🔄 Reset Game</button>
          </div>
        </div>

        <!-- Color Selector -->
        <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <h3 class="text-lg font-bold mb-2 text-center">Choose Color</h3>
          <div id="color-selector" class="grid grid-cols-2 gap-2" style="display: none;">
            <button onclick="chooseWildColor('red')" class="bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition">Red</button>
            <button onclick="chooseWildColor('blue')" class="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition">Blue</button>
            <button onclick="chooseWildColor('green')" class="bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition">Green</button>
            <button onclick="chooseWildColor('yellow')" class="bg-yellow-500 text-black p-3 rounded-lg hover:bg-yellow-600 transition">Yellow</button>
          </div>
        </div>
      </div>

      <!-- Player Hand -->
      <div class="bg-gradient-to-r from-red-100 to-blue-100 dark:from-red-900 dark:to-blue-900 p-4 rounded-lg">
        <h3 class="text-lg font-bold mb-2 text-center">👤 Your Hand</h3>
        <div id="player-hand" class="flex justify-center flex-wrap gap-2">
          <!-- Player cards -->
        </div>
        <p class="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
          Cards: <span id="player-card-count">7</span>
        </p>
      </div>
    </div>

    <style>
      .uno-card {
        width: 60px;
        height: 90px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid #333;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        font-weight: bold;
        font-size: 12px;
        text-align: center;
      }

      .uno-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      }

      .back-card {
        background: linear-gradient(45deg, #8B4513, #D2691E);
        color: white;
      }

      .card-content {
        word-wrap: break-word;
        line-height: 1.2;
      }

      .red-card { background: linear-gradient(45deg, #ff4444, #cc0000); color: white; }
      .blue-card { background: linear-gradient(45deg, #4444ff, #0000cc); color: white; }
      .green-card { background: linear-gradient(45deg, #44ff44, #00cc00); color: white; }
      .yellow-card { background: linear-gradient(45deg, #ffff44, #cccc00); color: black; }
      .wild-card { background: linear-gradient(45deg, #ff0000, #00ff00, #0000ff, #ffff00); color: white; }
    </style>
  `;

  // Initialize UNO game
  window.unoGame = new UNOGame();
  window.unoGame.startGame();
}

function createMultiplayerUNO() {
  const gameId = "uno_" + Date.now().toString();

  const content = document.getElementById("uno-content");
  content.innerHTML = `
    <div class="text-center mb-4">
      <div class="bg-green-50 dark:bg-green-900 p-4 rounded-lg mb-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">Game ID: <span class="font-mono font-bold">${gameId}</span></p>
        <p class="text-sm text-gray-500 mt-1">Share this ID with friends to play together!</p>
        <button onclick="copyGameId('${gameId}')" class="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">📋 Copy Game ID</button>
      </div>
    </div>

    <div class="text-center text-gray-500">
      <p>Multiplayer UNO feature coming soon!</p>
      <p class="text-sm mt-2">For now, enjoy the single player mode against the computer.</p>
      <button onclick="startSinglePlayerUNO()" class="mt-4 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition">Play Single Player</button>
    </div>
  `;
}

// UNO Game Class
class UNOGame {
  constructor() {
    this.colors = ["red", "blue", "green", "yellow"];
    this.numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    this.specialCards = ["skip", "reverse", "draw2"];
    this.wildCards = ["wild", "wild4"];

    this.deck = [];
    this.playerHand = [];
    this.computerHand = [];
    this.discardPile = [];
    this.currentColor = "";
    this.currentNumber = "";
    this.playerTurn = true;
    this.gameDirection = 1;
    this.playerSaidUNO = false;
    this.computerSaidUNO = false;
  }

  createDeck() {
    this.deck = [];

    // Add number cards (0: 1 per color, 1-9: 2 per color)
    this.colors.forEach((color) => {
      this.deck.push({ color, value: "0", type: "number" });
      for (let i = 1; i <= 9; i++) {
        this.deck.push({ color, value: i.toString(), type: "number" });
        this.deck.push({ color, value: i.toString(), type: "number" });
      }
    });

    // Add special cards (2 per color)
    this.colors.forEach((color) => {
      this.specialCards.forEach((special) => {
        this.deck.push({ color, value: special, type: "special" });
        this.deck.push({ color, value: special, type: "special" });
      });
    });

    // Add wild cards (4 each)
    for (let i = 0; i < 4; i++) {
      this.deck.push({ color: "wild", value: "wild", type: "wild" });
      this.deck.push({ color: "wild", value: "wild4", type: "wild" });
    }

    this.shuffleDeck();
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  startGame() {
    this.createDeck();

    // Deal 7 cards to each player
    for (let i = 0; i < 7; i++) {
      this.playerHand.push(this.deck.pop());
      this.computerHand.push(this.deck.pop());
    }

    // Place first card
    let firstCard;
    do {
      firstCard = this.deck.pop();
    } while (firstCard.type === "wild");

    this.discardPile.push(firstCard);
    this.currentColor = firstCard.color;
    this.currentNumber = firstCard.value;

    this.updateDisplay();
  }

  updateDisplay() {
    this.updatePlayerHand();
    this.updateComputerHand();
    this.updateDiscardPile();
    this.updateCardCounts();
    this.updateGameStatus();
    this.checkUNOConditions();
  }

  updatePlayerHand() {
    const handElement = document.getElementById("player-hand");
    handElement.innerHTML = "";

    this.playerHand.forEach((card, index) => {
      const cardElement = document.createElement("div");
      cardElement.className = `uno-card ${card.color}-card`;
      cardElement.innerHTML = `<div class="card-content">${this.getCardDisplay(card)}</div>`;
      cardElement.onclick = () => this.playCard(index);

      if (!this.canPlayCard(card)) {
        cardElement.style.opacity = "0.5";
        cardElement.style.cursor = "not-allowed";
      }

      handElement.appendChild(cardElement);
    });
  }

  updateComputerHand() {
    const handElement = document.getElementById("computer-hand");
    handElement.innerHTML = "";

    this.computerHand.forEach(() => {
      const cardElement = document.createElement("div");
      cardElement.className = "uno-card back-card";
      cardElement.innerHTML = '<div class="card-content">🃏</div>';
      handElement.appendChild(cardElement);
    });
  }

  updateDiscardPile() {
    const topCard = this.discardPile[this.discardPile.length - 1];
    const discardElement = document.getElementById("discard-pile");
    discardElement.className = `uno-card ${topCard.color}-card`;
    discardElement.innerHTML = `<div class="card-content">${this.getCardDisplay(topCard)}</div>`;
  }

  updateCardCounts() {
    document.getElementById("player-card-count").textContent =
      this.playerHand.length;
    document.getElementById("computer-card-count").textContent =
      this.computerHand.length;
  }

  updateGameStatus() {
    const statusElement = document.getElementById("uno-status");
    const infoElement = document.getElementById("uno-turn-info");

    if (this.checkWinner()) {
      const winner = this.playerHand.length === 0 ? "You" : "Computer";
      statusElement.textContent = `${winner} wins! 🎉`;
      infoElement.textContent = "Game Over";
      return;
    }

    if (this.playerTurn) {
      statusElement.textContent = "Your turn!";
      infoElement.textContent = `Match ${this.currentColor} or ${this.currentNumber}`;
    } else {
      statusElement.textContent = "Computer's turn...";
      infoElement.textContent = "Computer is thinking...";
      setTimeout(() => this.computerPlay(), 1500);
    }
  }

  checkUNOConditions() {
    const unoButton = document.getElementById("uno-button");

    if (this.playerHand.length === 1 && !this.playerSaidUNO) {
      unoButton.style.display = "block";
    } else {
      unoButton.style.display = "none";
    }
  }

  getCardDisplay(card) {
    if (card.value === "wild") return "WILD";
    if (card.value === "wild4") return "W+4";
    if (card.value === "skip") return "SKIP";
    if (card.value === "reverse") return "REV";
    if (card.value === "draw2") return "+2";
    return card.value;
  }

  canPlayCard(card) {
    if (!this.playerTurn) return false;
    if (card.type === "wild") return true;
    return (
      card.color === this.currentColor || card.value === this.currentNumber
    );
  }

  playCard(cardIndex) {
    if (!this.playerTurn) return;

    const card = this.playerHand[cardIndex];
    if (!this.canPlayCard(card)) return;

    this.playerHand.splice(cardIndex, 1);
    this.discardPile.push(card);

    this.processCardEffect(card, true);

    if (this.playerHand.length === 0) {
      this.updateDisplay();
      return;
    }

    if (card.type === "wild") {
      document.getElementById("color-selector").style.display = "grid";
      return;
    }

    this.currentColor = card.color;
    this.currentNumber = card.value;
    this.playerTurn = false;
    this.playerSaidUNO = false;

    this.updateDisplay();
  }

  computerPlay() {
    if (!this.computerHand.length) return;

    // Find playable cards
    const playableCards = this.computerHand.filter(
      (card) =>
        card.type === "wild" ||
        card.color === this.currentColor ||
        card.value === this.currentNumber,
    );

    if (playableCards.length === 0) {
      // Draw a card
      if (this.deck.length > 0) {
        this.computerHand.push(this.deck.pop());
      }
      this.playerTurn = true;
      this.updateDisplay();
      return;
    }

    // Computer AI: Prefer special cards, then matching color, then matching number
    let cardToPlay =
      playableCards.find((card) => card.type === "special") ||
      playableCards.find((card) => card.color === this.currentColor) ||
      playableCards.find((card) => card.value === this.currentNumber) ||
      playableCards[0];

    const cardIndex = this.computerHand.indexOf(cardToPlay);
    this.computerHand.splice(cardIndex, 1);
    this.discardPile.push(cardToPlay);

    // Computer says UNO
    if (this.computerHand.length === 1) {
      this.computerSaidUNO = true;
      document.getElementById("uno-status").textContent =
        "Computer says UNO! 🔥";
      setTimeout(() => this.updateDisplay(), 1000);
      return;
    }

    this.processCardEffect(cardToPlay, false);

    if (cardToPlay.type === "wild") {
      // Computer chooses random color
      this.currentColor =
        this.colors[Math.floor(Math.random() * this.colors.length)];
    } else {
      this.currentColor = cardToPlay.color;
    }
    this.currentNumber = cardToPlay.value;

    this.playerTurn = true;
    this.computerSaidUNO = false;
    this.updateDisplay();
  }

  processCardEffect(card, isPlayer) {
    switch (card.value) {
      case "skip":
        // Skip opponent's turn - in 2 player game, current player goes again
        break;
      case "reverse":
        // In 2 player game, acts like skip
        break;
      case "draw2":
        if (isPlayer) {
          for (let i = 0; i < 2 && this.deck.length > 0; i++) {
            this.computerHand.push(this.deck.pop());
          }
        } else {
          for (let i = 0; i < 2 && this.deck.length > 0; i++) {
            this.playerHand.push(this.deck.pop());
          }
        }
        break;
      case "wild4":
        if (isPlayer) {
          for (let i = 0; i < 4 && this.deck.length > 0; i++) {
            this.computerHand.push(this.deck.pop());
          }
        } else {
          for (let i = 0; i < 4 && this.deck.length > 0; i++) {
            this.playerHand.push(this.deck.pop());
          }
        }
        break;
    }
  }

  checkWinner() {
    return this.playerHand.length === 0 || this.computerHand.length === 0;
  }
}

// UNO Game Functions
window.drawCard = function () {
  if (!window.unoGame || !window.unoGame.playerTurn) return;

  if (window.unoGame.deck.length > 0) {
    window.unoGame.playerHand.push(window.unoGame.deck.pop());
    window.unoGame.playerTurn = false;
    window.unoGame.updateDisplay();
  }
};

window.sayUNO = function () {
  window.unoGame.playerSaidUNO = true;
  document.getElementById("uno-button").style.display = "none";
  document.getElementById("uno-status").textContent = "You said UNO! 🔥";
  setTimeout(() => window.unoGame.updateDisplay(), 1000);
};

window.chooseWildColor = function (color) {
  window.unoGame.currentColor = color;
  document.getElementById("color-selector").style.display = "none";
  window.unoGame.playerTurn = false;
  window.unoGame.updateDisplay();
};

window.resetUNO = function () {
  startUNO();
};

function startSnake() {
  document.getElementById("other-games").innerHTML = `
    <div class="max-w-2xl mx-auto p-6">
      <h2 class="text-3xl font-bold mb-6 text-center text-green-600">🐍 Snake Game</h2>

      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div class="text-center mb-4">
          <p class="text-xl mb-2 text-gray-700 dark:text-gray-300">Defend the galaxy!</p>
          <div class="bg-green-50 dark:bg-green-900 p-4 rounded-lg mb-4">
            <p id="snake-score" class="text-3xl font-bold text-green-800 dark:text-green-200">Score: 0</p>
          </div>
        </div>

        <canvas id="snake-canvas" width="400" height="400" class="border-4 border-green-500 rounded-lg mx-auto block mb-6 shadow-lg bg-black"></canvas>

        <div class="text-center space-y-4">
          <button onclick="startSnakeGame()" class="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">🎮 Start Game</button>

          <div class="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
            <h4 class="font-semibold text-green-800 dark:text-green-200">🕹️ Controls:</h4>
            <div class="grid grid-cols-2 gap-2 text-sm text-green-700 dark:text-green-300">
              <div>⬆️ Up Arrow - Move Up</div>
              <div>⬇️ Down Arrow - Move Down</div>
              <div>⬅️ Left Arrow - Move Left</div>
              <div>➡️ Right Arrow - Move Right</div>
            </div>
          </div>

          <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <h4 class="font-semibold text-blue-800 dark:text-blue-200">🎯 How to Play:</h4>
            <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Eat red food to grow and score points</li>
              <li>• Don't hit the walls or your own tail</li>
              <li>• The snake gets faster as you score more</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function startSnakeGame() {
  const canvas = document.getElementById("snake-canvas");
  const ctx = canvas.getContext("2d");
  const gridSize = 20;
  const tileCount = canvas.width / gridSize;

  let snake = [{ x: 10, y: 10 }];
  let food = { x: 15, y: 15 };
  let dx = 0;
  let dy = 0;
  let score = 0;

  function drawGame() {
    clearCanvas();
    moveSnake();
    drawSnake();
    drawFood();
    checkCollision();
    updateScore();
  }

  function clearCanvas() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      generateFood();
    } else {
      snake.pop();
    }
  }

  function drawSnake() {
    ctx.fillStyle = "green";
    snake.forEach((segment) => {
      ctx.fillRect(
        segment.x * gridSize,
        segment.y * gridSize,
        gridSize - 2,
        gridSize - 2,
      );
    });
  }

  function drawFood() {
    ctx.fillStyle = "red";
    ctx.fillRect(
      food.x * gridSize,
      food.y * gridSize,
      gridSize - 2,
      gridSize - 2,
    );
  }

  function generateFood() {
    food = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  }

  function checkCollision() {
    const head = snake[0];

    // Wall collision
    if (
      head.x < 0 ||
      head.x >= tileCount ||
      head.y < 0 ||
      head.y >= tileCount
    ) {
      resetGame();
    }

    // Self collision
    for (let i = 1; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        resetGame();
      }
    }
  }

  function updateScore() {
    document.getElementById("snake-score").textContent = `Score: ${score}`;
  }

  function resetGame() {
    snake = [{ x: 10, y: 10 }];
    dx = 0;
    dy = 0;
    score = 0;
    generateFood();
  }

  document.addEventListener("keydown", changeDirection);

  function changeDirection(e) {
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;

    const keyPressed = e.keyCode;
    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;

    if (keyPressed === LEFT_KEY && !goingRight) {
      dx = -1;
      dy = 0;
    }
    if (keyPressed === UP_KEY && !goingDown) {
      dx = 0;
      dy = -1;
    }
    if (keyPressed === RIGHT_KEY && !goingLeft) {
      dx = 1;
      dy = 0;
    }
    if (keyPressed === DOWN_KEY && !goingUp) {
      dx = 0;
      dy = 1;
    }
  }

  setInterval(drawGame, 100);
}

function startSpaceInvaders() {
  document.getElementById("other-games").innerHTML = `
    <div class="max-w-3xl mx-auto p-6">
      <h2 class="text-3xl font-bold mb-6 text-center text-pink-600">👾 Space Defense</h2>

      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div class="text-center mb-4">
          <p class="text-xl mb-2 text-gray-700 dark:text-gray-300">Defend the galaxy!</p>
          <div class="bg-pink-50 dark:bg-pink-900 p-4 rounded-lg mb-4">
            <p id="space-score" class="text-3xl font-bold text-pink-600 dark:text-pink-400">Score: 0</p>
          </div>
        </div>

        <canvas id="space-canvas" width="600" height="450" class="border-4 border-pink-500 rounded-lg mx-auto block mb-6 shadow-lg bg-black"></canvas>

        <div class="text-center space-y-4">
          <button onclick="startGame('space')" class="bg-gradient-to-r from-pink-600 to-pink-700 text-white px-6 py-3 rounded-lg hover:from-pink-700 hover:to-pink-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">🚀 Start Game</button>

          <div class="bg-pink-50 dark:bg-pink-900 p-4 rounded-lg">
            <h4 class="font-semibold text-pink-800 dark:text-pink-200">🕹️ Controls:</h4>
            <div class="grid grid-cols-3 gap-2 text-sm text-pink-700 dark:text-pink-300">
              <div>A - Move Left</div>
              <div>D - Move Right</div>
              <div>Spacebar - Fire</div>
            </div>
          </div>

          <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <h4 class="font-semibold text-blue-800 dark:text-blue-200">🎯 How to Play:</h4>
            <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Move your spaceship left and right</li>
              <li>• Shoot down incoming alien invaders</li>
              <li>• Avoid enemy fire and collisions</li>
              <li>• Survive as long as possible to get a high score</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

let player = { x: 225, y: 350, width: 50, height: 30 };
let bullets = [];
let enemies = [];
let score = 0;
let gameActive = false;
let spaceInterval = null;

function startGame(gameName) {
  if (gameName === "space") {
    const canvas = document.getElementById("space-canvas");
    const ctx = canvas.getContext("2d");

    // Reset game state
    player = { x: 225, y: 350, width: 50, height: 30 };
    bullets = [];
    enemies = [];
    score = 0;
    gameActive = true;

    // Create enemy grid
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        enemies.push({
          x: col * 45 + 50,
          y: row * 40 + 50,
          width: 30,
          height: 20,
          alive: true,
        });
      }
    }

    drawPlayer();
    document.getElementById("space-score").textContent = `Score: ${score}`;
    if (spaceInterval) clearInterval(spaceInterval);
    spaceInterval = requestAnimationFrame(updateGame);
  }
}

function drawPlayer() {
  const canvas = document.getElementById("space-canvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#00ff00";
  ctx.fillRect(player.x, player.y, player.width, player.height);
  // Ship details
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(player.x + 20, player.y - 5, 10, 5);
}

function drawBullets() {
  const canvas = document.getElementById("space-canvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffff00";
  bullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, 3, 10);
  });
}

function drawEnemies() {
  const canvas = document.getElementById("space-canvas");
  const ctx = canvas.getContext("2d");
  enemies.forEach((enemy) => {
    if (enemy.alive) {
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      // Enemy details
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(enemy.x + 5, enemy.y + 5, 5, 5);
      ctx.fillRect(enemy.x + 20, enemy.y + 5, 5, 5);
    }
  });
}

function updateGame() {
  if (!gameActive) return;

  const canvas = document.getElementById("space-canvas");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update bullets
  bullets = bullets.filter((bullet) => {
    bullet.y -= 5;
    return bullet.y > 0;
  });

  // Check bullet-enemy collisions
  let bulletsToRemove = [];
  let enemiesToRemove = [];
  bullets.forEach((bullet, bIndex) => {
    enemies.forEach((enemy, eIndex) => {
      if (
        enemy.alive &&
        bullet.x < enemy.x + enemy.width &&
        bullet.x + 3 > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + 10 > enemy.y
      ) {
        enemy.alive = false;
        enemiesToRemove.push(eIndex);
        bulletsToRemove.push(bIndex);
        score += 10;
        document.getElementById("space-score").textContent = `Score: ${score}`;
      }
    });
  });

  // Remove collided bullets and enemies
  bullets = bullets.filter((_, index) => !bulletsToRemove.includes(index));
  enemies = enemies.filter((_, index) => !enemiesToRemove.includes(index));

  // Check win condition
  if (enemies.length === 0) {
    alert(`Level Complete! Score: ${score}`);
    gameActive = false;
    return;
  }

  // Move enemies
  if (Math.random() < 0.02) {
    enemies.forEach((enemy) => {
      enemy.y += 10;
      // Check collision with player
      if (enemy.y + enemy.height >= player.y) {
        alert(`Game Over! Score: ${score}`);
        gameActive = false;
      }
    });
  }

  drawPlayer();
  drawBullets();
  drawEnemies();

  requestAnimationFrame(updateGame);
}

// Controls for Space Invaders
document.addEventListener("keydown", (e) => {
  if (!gameActive) return;

  switch (e.key.toLowerCase()) {
    case "a":
      if (player.x > 0) player.x -= 10;
      break;
    case "d":
      if (player.x < 600 - player.width) player.x += 10; // Assuming canvas width is 600
      break;
    case " ":
      bullets.push({
        x: player.x + player.width / 2 - 1.5, // Center the bullet
        y: player.y,
      });
      e.preventDefault();
      break;
  }
});

function startMemoryGame() {
  document.getElementById("other-games").innerHTML = `
    <h2 class="text-xl font-bold mb-4 text-center">🧠 Memory Match</h2>
    <div class="text-center mb-4">
      <p class="text-lg mb-2">Moves: <span id="memory-moves">0</span> | Matches: <span id="memory-matches">0</span>/8</p>
      <button onclick="startMemoryRound()" class="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition">New Game</button>
    </div>
    <div id="memory-board" class="grid grid-cols-4 gap-2 w-80 h-80 mx-auto"></div>
  `;
  startMemoryRound();
}

function startMemoryRound() {
  const symbols = [
    "🎯",
    "🏆",
    "⭐",
    "🎪",
    "🎨",
    "🎭",
    "🚀",
    "🌟",
    "🎯",
    "🏆",
    "⭐",
    "🎪",
    "🎨",
    "🎭",
    "🚀",
    "🌟",
  ];
  let flippedCards = [];
  let matches = 0;
  let moves = 0;

  const board = document.getElementById("memory-board");
  board.innerHTML = "";

  // Shuffle symbols
  for (let i = symbols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
  }

  symbols.forEach((symbol, index) => {
    const card = document.createElement("div");
    card.className =
      "bg-blue-500 border-2 border-blue-700 rounded-lg flex items-center justify-center text-3xl cursor-pointer hover:bg-blue-400 transition";
    card.style.height = "80px";
    card.dataset.symbol = symbol;
    card.dataset.index = index;
    card.textContent = "?";

    card.onclick = () => flipCard(card);
    board.appendChild(card);
  });

  function flipCard(card) {
    if (flippedCards.length >= 2 || card.classList.contains("flipped")) return;

    card.textContent = card.dataset.symbol;
    card.classList.add("flipped", "bg-green-400");
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      moves++;
      document.getElementById("memory-moves").textContent = moves;

      setTimeout(() => {
        if (flippedCards[0].dataset.symbol === flippedCards[1].dataset.symbol) {
          flippedCards.forEach((c) => {
            c.classList.add("bg-green-600");
            c.onclick = null;
          });
          matches++;
          document.getElementById("memory-matches").textContent = matches;

          if (matches === 8) {
            setTimeout(
              () => alert(`Congratulations! You won in ${moves} moves!`),
              100,
            );
          }
        } else {
          flippedCards.forEach((c) => {
            c.textContent = "?";
            c.classList.remove("flipped", "bg-green-400");
          });
        }
        flippedCards = [];
      }, 1000);
    }
  }

  document.getElementById("memory-moves").textContent = "0";
  document.getElementById("memory-matches").textContent = "0";
}

function startNumberGuess() {
  document.getElementById("other-games").innerHTML = `
    <h2 class="text-xl font-bold mb-4 text-center">🔢 Number Guessing Game</h2>
    <div class="text-center">
      <p class="text-lg mb-4">I'm thinking of a number between 1 and 100!</p>
      <div class="mb-4">
        <input type="number" id="guess-input" class="border-2 border-gray-300 rounded-lg px-4 py-2 mr-2" placeholder="Enter your guess" min="1" max="100">
        <button onclick="makeGuess()" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">Guess</button>
      </div>
      <p id="guess-feedback" class="text-lg font-semibold mb-2"></p>
      <p id="guess-attempts" class="text-md mb-4">Attempts: 0</p>
      <button onclick="startNumberGuess()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">New Game</button>
    </div>
  `;

  window.targetNumber = Math.floor(Math.random() * 100) + 1;
  window.attempts = 0;
}

function makeGuess() {
  const input = document.getElementById("guess-input");
  const guess = parseInt(input.value);

  if (!guess || guess < 1 || guess > 100) {
    document.getElementById("guess-feedback").textContent =
      "Please enter a number between 1 and 100!";
    return;
  }

  window.attempts++;
  document.getElementById("guess-attempts").textContent =
    `Attempts: ${window.attempts}`;

  if (guess === window.targetNumber) {
    document.getElementById("guess-feedback").innerHTML =
      `🎉 Correct! You guessed it in ${window.attempts} attempts!`;
    input.disabled = true;
  } else if (guess < window.targetNumber) {
    document.getElementById("guess-feedback").textContent =
      "📈 Too low! Try a higher number.";
  } else {
    document.getElementById("guess-feedback").textContent =
      "📉 Too high! Try a lower number.";
  }

  input.value = "";
}

window.startTypingMaster = function () {
  const typingLessons = [
    {
      title: "Basic Home Row Keys",
      text: "asdf jkl; asdf jkl; fff jjj ddd kkk sss lll aaa ;;; fjfjfj dkdkdk slslsl fjdk fjdk slsl fjdk slsl",
    },
    {
      title: "Top Row Practice",
      text: "qwerty uiop qwerty uiop qqq www eee rrr ttt yyy uuu iii ooo ppp qwer tyui qwer tyui qwerty",
    },
    {
      title: "Bottom Row Practice",
      text: "zxcv bnm, zxcv bnm, zzz xxx ccc vvv bbb nnn mmm ,,, zxcv bnm zxcv bnm zxcvbnm zxcvbnm",
    },
    {
      title: "Numbers Practice",
      text: "1234567890 1234567890 111 222 333 444 555 666 777 888 999 000 12345 67890 123456789",
    },
    {
      title: "Common Words",
      text: "the quick brown fox jumps over the lazy dog the quick brown fox jumps over the lazy dog",
    },
    {
      title: "Simple Sentences",
      text: "I love to type fast. She can type very well. We are learning to type. They practice every day.",
    },
    {
      title: "Pangram Practice",
      text: "The five boxing wizards jump quickly. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!",
    },
    {
      title: "Intermediate Paragraph",
      text: "Typing is an essential skill in today's digital world. With practice and dedication, anyone can improve their typing speed and accuracy. Regular practice sessions help build muscle memory and increase confidence.",
    },
    {
      title: "Advanced Text",
      text: "Proficiency in typing requires consistent practice and proper finger placement. The key to becoming an excellent typist is maintaining proper posture, using all fingers, and developing rhythm and flow in your keystrokes.",
    },
    {
      title: "Programming Practice",
      text: "function calculateSum(a, b) { return a + b; } const result = calculateSum(10, 20); console.log('Result:', result);",
    },
  ];

  document.getElementById("other-games").innerHTML = `
    <h2 class="text-xl font-bold mb-4 text-center">⌨️ Typing Master</h2>
    <div class="max-w-4xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div class="bg-blue-100 p-4 rounded-lg text-center">
          <h3 class="font-semibold text-blue-800">WPM</h3>
          <p id="typing-wpm" class="text-2xl font-bold text-blue-600">0</p>
        </div>
        <div class="bg-green-100 p-4 rounded-lg text-center">
          <h3 class="font-semibold text-green-800">Accuracy</h3>
          <p id="typing-accuracy" class="text-2xl font-bold text-green-600">100%</p>
        </div>
        <div class="bg-purple-100 p-4 rounded-lg text-center">
          <h3 class="font-semibold text-purple-800">Time</h3>
          <p id="typing-time" class="text-2xl font-bold text-purple-600">0s</p>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">Select Lesson:</label>
        <select id="lesson-select" class="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          ${typingLessons
            .map(
              (lesson, index) =>
                `<option value="${index}">${index + 1}. ${lesson.title}</option>`,
            )
            .join("")}
        </select>
      </div>

      <div class="mb-4">
        <div id="text-to-type" class="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-lg leading-relaxed min-h-32 font-mono shadow-inner">
          ${typingLessons[0].text}
        </div>
      </div>

      <div class="mb-4">
        <textarea
          id="typing-input"
          placeholder="Start typing here..."
          class="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          rows="6"
          disabled
        ></textarea>
      </div>

      <div class="text-center mb-4">
        <button id="start-typing" onclick="startTypingTest()" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition mr-2">Start Typing Test</button>
        <button id="reset-typing" onclick="resetTypingTest()" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition">Reset</button>
      </div>

      <div id="typing-results" class="hidden bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-2">Test Results</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p class="text-sm text-gray-600">Words Per Minute</p>
            <p id="final-wpm" class="text-xl font-bold">0</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Accuracy</p>
            <p id="final-accuracy" class="text-xl font-bold">100%</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Characters Per Minute</p>
            <p id="final-cpm" class="text-xl font-bold">0</p>
          </div>
        </div>
        <div class="mt-4">
          <p class="text-sm text-gray-600">Performance Rating</p>
          <p id="performance-rating" class="text-lg font-semibold"></p>
        </div>
      </div>

      <div class="mt-6 text-sm text-gray-600">
        <h4 class="font-semibold mb-2">Typing Tips:</h4>
        <ul class="list-disc pl-5 space-y-1">
          <li>Keep your fingers on the home row (ASDF for left hand, JKL; for right hand)</li>
          <li>Use proper posture: sit up straight and keep feet flat on the floor</li>
          <li>Don't look at the keyboard while typing</li>
          <li>Practice regularly for 15-30 minutes daily</li>
          <li>Focus on accuracy first, speed will come naturally</li>
        </ul>
      </div>
    </div>
  `;

  window.typingLessons = typingLessons;
  window.currentLesson = 0;
  window.typingStartTime = null;
  window.typingTestActive = false;

  // Lesson selector event
  document.getElementById("lesson-select").addEventListener("change", (e) => {
    window.currentLesson = parseInt(e.target.value);
    const textToType = document.getElementById("text-to-type");
    textToType.innerHTML = typingLessons[window.currentLesson].text;
    textToType.style.fontFamily = 'Monaco, Consolas, "Courier New", monospace';
    resetTypingTest();
  });
};

window.startTypingTest = function () {
  const input = document.getElementById("typing-input");
  const startBtn = document.getElementById("start-typing");
  const resetBtn = document.getElementById("reset-typing");

  input.disabled = false;
  input.focus();
  startBtn.disabled = true;
  startBtn.textContent = "Test in Progress...";

  window.typingStartTime = Date.now();
  window.typingTestActive = true;

  input.addEventListener("input", updateTypingProgress);

  // Start the timer
  window.typingInterval = setInterval(updateTypingStats, 100);
};

function updateTypingProgress() {
  const input = document.getElementById("typing-input");
  const textToType = document.getElementById("text-to-type");
  const originalText = window.typingLessons[window.currentLesson].text;

  const typedText = input.value;
  const textLength = originalText.length;

  // Create highlighted text
  let highlightedText = "";
  for (let i = 0; i < originalText.length; i++) {
    if (i < typedText.length) {
      if (typedText[i] === originalText[i]) {
        highlightedText += `<span style="background-color: #10b981; color: white; padding: 2px; border-radius: 3px;">${originalText[i] === " " ? "&nbsp;" : originalText[i]}</span>`;
      } else {
        highlightedText += `<span style="background-color: #ef4444; color: white; padding: 2px; border-radius: 3px;">${originalText[i] === " " ? "&nbsp;" : originalText[i]}</span>`;
      }
    } else if (i === typedText.length) {
      highlightedText += `<span style="background-color: #3b82f6; color: white; padding: 2px; border-radius: 3px; border-left: 3px solid #1e40af;">${originalText[i] === " " ? "&nbsp;" : originalText[i]}</span>`;
    } else {
      highlightedText += originalText[i];
    }
  }

  textToType.innerHTML = highlightedText;

  // Check if test is complete
  if (typedText.length >= originalText.length) {
    finishTypingTest();
  }
}

function updateTypingStats() {
  if (!window.typingTestActive || !window.typingStartTime) return;

  const input = document.getElementById("typing-input");
  const typedText = input.value;
  const originalText = window.typingLessons[window.currentLesson].text;

  const timeElapsed = (Date.now() - window.typingStartTime) / 1000;
  const wordsTyped = typedText.trim().split(/\s+/).length;
  const wpm = Math.round((wordsTyped / timeElapsed) * 60) || 0;

  // Calculate accuracy
  let correctChars = 0;
  for (let i = 0; i < typedText.length; i++) {
    if (i < originalText.length && typedText[i] === originalText[i]) {
      correctChars++;
    }
  }
  const accuracy =
    typedText.length > 0
      ? Math.round((correctChars / typedText.length) * 100)
      : 100;

  document.getElementById("typing-wpm").textContent = wpm;
  document.getElementById("typing-accuracy").textContent = accuracy + "%";
  document.getElementById("typing-time").textContent =
    Math.round(timeElapsed) + "s";
}

function finishTypingTest() {
  window.typingTestActive = false;
  clearInterval(window.typingInterval);

  const input = document.getElementById("typing-input");
  const startBtn = document.getElementById("start-typing");

  input.disabled = true;
  startBtn.disabled = false;
  startBtn.textContent = "Start Typing Test";

  // Calculate final stats
  const typedText = input.value;
  const originalText = window.typingLessons[window.currentLesson].text;
  const timeElapsed = (Date.now() - window.typingStartTime) / 1000;

  const wordsTyped = typedText.trim().split(/\s+/).length;
  const wpm = Math.round((wordsTyped / timeElapsed) * 60);
  const cpm = Math.round((typedText.length / timeElapsed) * 60);

  let correctChars = 0;
  for (let i = 0; i < Math.min(typedText.length, originalText.length); i++) {
    if (typedText[i] === originalText[i]) {
      correctChars++;
    }
  }
  const accuracy =
    typedText.length > 0
      ? Math.round((correctChars / typedText.length) * 100)
      : 100;

  // Show results
  document.getElementById("final-wpm").textContent = wpm;
  document.getElementById("final-accuracy").textContent = accuracy + "%";
  document.getElementById("final-cpm").textContent = cpm;

  // Performance rating
  let rating = "";
  if (wpm < 20) rating = "🐢 Beginner - Keep practicing!";
  else if (wpm < 40) rating = "🚶 Intermediate - Good progress!";
  else if (wpm < 60) rating = "🏃 Advanced - Excellent typing!";
  else if (wpm < 80) rating = "🚀 Expert - Outstanding skills!";
  else rating = "⚡ Master Typist - Incredible speed!";

  document.getElementById("performance-rating").textContent = rating;
  document.getElementById("typing-results").classList.remove("hidden");
}

window.resetTypingTest = function () {
  window.typingTestActive = false;
  clearInterval(window.typingInterval);

  const input = document.getElementById("typing-input");
  const startBtn = document.getElementById("start-typing");
  const textToType = document.getElementById("text-to-type");

  input.value = "";
  input.disabled = true;
  startBtn.disabled = false;
  startBtn.textContent = "Start Typing Test";

  textToType.innerHTML = window.typingLessons[window.currentLesson].text;
  textToType.style.fontFamily = 'Monaco, Consolas, "Courier New", monospace';
  textToType.style.backgroundColor = "#ffffff";
  textToType.style.color = "#1f2937";

  document.getElementById("typing-wpm").textContent = "0";
  document.getElementById("typing-accuracy").textContent = "100%";
  document.getElementById("typing-time").textContent = "0s";
  document.getElementById("typing-results").classList.add("hidden");

  window.typingStartTime = null;
};

// Hangman Game
function startHangman() {
  const words = [
    "JAVASCRIPT",
    "COMPUTER",
    "PROGRAMMING",
    "HANGMAN",
    "CHALLENGE",
    "KEYBOARD",
    "MONITOR",
    "DEVELOPMENT",
    "SOFTWARE",
    "ALGORITHM",
    "FUNCTION",
    "VARIABLE",
    "ARRAY",
    "OBJECT",
    "BOOLEAN",
    "STRING",
    "FRONTEND",
    "BACKEND",
    "DATABASE",
    "SERVER",
    "CLIENT",
    "BROWSER",
    "FRAMEWORK",
    "LIBRARY",
    "PACKAGE",
    "MODULE",
    "COMPONENT",
    "ELEMENT",
  ];

  const categories = {
    Programming: [
      "JAVASCRIPT",
      "PROGRAMMING",
      "ALGORITHM",
      "FUNCTION",
      "VARIABLE",
      "ARRAY",
      "OBJECT",
      "BOOLEAN",
      "STRING",
    ],
    Technology: [
      "COMPUTER",
      "KEYBOARD",
      "MONITOR",
      "SOFTWARE",
      "DATABASE",
      "SERVER",
      "CLIENT",
      "BROWSER",
    ],
    Development: [
      "DEVELOPMENT",
      "FRONTEND",
      "BACKEND",
      "FRAMEWORK",
      "LIBRARY",
      "PACKAGE",
      "MODULE",
      "COMPONENT",
      "ELEMENT",
    ],
  };

  document.getElementById("other-games").innerHTML = `
    <div class="max-w-4xl mx-auto p-6">
      <h2 class="text-3xl font-bold mb-6 text-center text-red-600">🎯 Hangman Game</h2>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Game Area -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div class="text-center mb-6">
            <div id="hangman-drawing" class="text-6xl mb-4 font-mono bg-gray-100 dark:bg-gray-700 p-4 rounded-lg min-h-32 flex items-center justify-center">
              <div id="gallows">
                <div class="text-4xl">┌─────┐</div>
                <div class="text-4xl">│     │</div>
                <div class="text-4xl">│      </div>
                <div class="text-4xl">│      </div>
                <div class="text-4xl">│      </div>
                <div class="text-4xl">└─────</div>
              </div>
            </div>

            <div class="mb-4">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Category: <span id="word-category" class="font-semibold text-blue-600">Programming</span></p>
              <div id="word-display" class="text-3xl font-bold tracking-widest text-gray-800 dark:text-gray-200 mb-4 font-mono">_ _ _ _ _ _ _ _ _</div>
            </div>

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="bg-green-50 dark:bg-green-900 p-3 rounded-lg">
                <p class="text-green-800 dark:text-green-200">Correct Guesses</p>
                <p id="correct-letters" class="font-bold text-lg">None</p>
              </div>
              <div class="bg-red-50 dark:bg-red-900 p-3 rounded-lg">
                <p class="text-red-800 dark:text-red-200">Wrong Guesses: <span id="wrong-count">0</span>/6</p>
                <p id="wrong-letters" class="font-bold text-lg">None</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Enter a letter:</label>
            <div class="flex gap-2">
              <input type="text" id="letter-input" maxlength="1"
                     class="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-center text-xl font-bold uppercase"
                     placeholder="A-Z" onkeyup="this.value = this.value.toUpperCase()">
              <button onclick="guessLetter()"
                      class="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-semibold">
                Guess
              </button>
            </div>
          </div>

          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3">Alphabet</h3>
            <div id="alphabet" class="grid grid-cols-6 gap-2">
              ${Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
                .map(
                  (letter) => `
                <button onclick="selectLetter('${letter}')"
                        class="letter-btn bg-blue-100 hover:bg-blue-200 border border-blue-300 p-2 rounded font-semibold text-blue-800 transition"
                        data-letter="${letter}">${letter}</button>
              `,
                )
                .join("")}
            </div>
          </div>

          <div class="text-center space-y-3">
            <button onclick="startNewHangmanGame()"
                    class="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold">
              🎮 New Game
            </button>
            <button onclick="getHint()" id="hint-btn"
                    class="w-full bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition font-semibold">
              💡 Get Hint (1 remaining)
            </button>
          </div>
        </div>
      </div>

      <!-- Game Result -->
      <div id="game-result" class="hidden mt-6 p-4 rounded-lg text-center">
        <h3 id="result-title" class="text-2xl font-bold mb-2"></h3>
        <p id="result-message" class="text-lg mb-4"></p>
        <button onclick="startNewHangmanGame()"
                class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
          Play Again
        </button>
      </div>

      <!-- Instructions -->
      <div class="mt-6 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
        <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">📚 How to Play:</h4>
        <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Guess letters to reveal the hidden word</li>
          <li>• You have 6 wrong guesses before the game ends</li>
          <li>• Words are from different categories: Programming, Technology, Development</li>
          <li>• Use the hint button once per game for help</li>
          <li>• Click letters on the alphabet or type them in</li>
        </ul>
      </div>
    </div>
  `;

  // Initialize game
  window.hangmanGame = {
    words: words,
    categories: categories,
    currentWord: "",
    currentCategory: "",
    guessedLetters: [],
    wrongGuesses: 0,
    maxWrongGuesses: 6,
    gameOver: false,
    hintsUsed: 0,
  };

  startNewHangmanGame();

  // Add enter key listener
  document
    .getElementById("letter-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        guessLetter();
      }
    });
}

function startNewHangmanGame() {
  const game = window.hangmanGame;

  // Select random word and category
  const categoryNames = Object.keys(game.categories);
  game.currentCategory =
    categoryNames[Math.floor(Math.random() * categoryNames.length)];
  const categoryWords = game.categories[game.currentCategory];
  game.currentWord =
    categoryWords[Math.floor(Math.random() * categoryWords.length)];

  // Reset game state
  game.guessedLetters = [];
  game.wrongGuesses = 0;
  game.gameOver = false;
  game.hintsUsed = 0;

  // Update UI
  updateHangmanDisplay();
  updateHangmanDrawing();
  resetAlphabet();
  document.getElementById("letter-input").value = "";
  document.getElementById("letter-input").disabled = false;
  document.getElementById("game-result").classList.add("hidden");
  document.getElementById("word-category").textContent = game.currentCategory;
  document.getElementById("hint-btn").textContent = "💡 Get Hint (1 remaining)";
  document.getElementById("hint-btn").disabled = false;

  console.log("New word:", game.currentWord); // For debugging
}

function selectLetter(letter) {
  document.getElementById("letter-input").value = letter;
  guessLetter();
}

function guessLetter() {
  const game = window.hangmanGame;
  const input = document.getElementById("letter-input");
  const letter = input.value.toUpperCase().trim();

  if (!letter || letter.length !== 1 || !/[A-Z]/.test(letter)) {
    alert("Please enter a valid letter (A-Z)");
    return;
  }

  if (game.guessedLetters.includes(letter)) {
    alert("You already guessed that letter!");
    return;
  }

  if (game.gameOver) {
    return;
  }

  game.guessedLetters.push(letter);

  // Mark letter as used
  const letterBtn = document.querySelector(`[data-letter="${letter}"]`);
  if (letterBtn) {
    letterBtn.disabled = true;
    letterBtn.classList.remove(
      "bg-blue-100",
      "hover:bg-blue-200",
      "border-blue-300",
      "text-blue-800",
    );
  }

  if (game.currentWord.includes(letter)) {
    // Correct guess
    letterBtn.classList.add(
      "bg-green-100",
      "border-green-300",
      "text-green-800",
    );
    updateHangmanDisplay();

    // Check if word is complete
    if (
      game.currentWord.split("").every((l) => game.guessedLetters.includes(l))
    ) {
      game.gameOver = true;
      showGameResult(true);
    }
  } else {
    // Wrong guess
    letterBtn.classList.add("bg-red-100", "border-red-300", "text-red-800");
    game.wrongGuesses++;
    updateHangmanDrawing();

    if (game.wrongGuesses >= game.maxWrongGuesses) {
      game.gameOver = true;
      showGameResult(false);
    }
  }

  updateGuessDisplay();
  input.value = "";
}

function updateHangmanDisplay() {
  const game = window.hangmanGame;
  const display = game.currentWord
    .split("")
    .map((letter) => (game.guessedLetters.includes(letter) ? letter : "_"))
    .join(" ");
  document.getElementById("word-display").textContent = display;
}

function updateHangmanDrawing() {
  const drawings = [
    `┌─────┐\n│     │\n│      \n│      \n│      \n└─────`,
    `┌─────┐\n│     │\n│     😵\n│      \n│      \n└─────`,
    `┌─────┐\n│     │\n│     😵\n│     │\n│      \n└─────`,
    `┌─────┐\n│     │\n│     😵\n│    /│\n│      \n└─────`,
    `┌─────┐\n│     │\n│     😵\n│    /│\\\n│      \n└─────`,
    `┌─────┐\n│     │\n│     😵\n│    /│\\\n│    / \n└─────`,
    `┌─────┐\n│     │\n│     😵\n│    /│\\\n│    / \\\n└─────`,
  ];

  const drawing = drawings[window.hangmanGame.wrongGuesses] || drawings[0];
  document.getElementById("gallows").innerHTML = drawing
    .split("\n")
    .map((line) => `<div class="text-4xl">${line}</div>`)
    .join("");
}

function updateGuessDisplay() {
  const game = window.hangmanGame;
  const correctLetters = game.guessedLetters.filter((letter) =>
    game.currentWord.includes(letter),
  );
  const wrongLetters = game.guessedLetters.filter(
    (letter) => !game.currentWord.includes(letter),
  );

  document.getElementById("correct-letters").textContent = correctLetters.length
    ? correctLetters.join(", ")
    : "None";
  document.getElementById("wrong-letters").textContent = wrongLetters.length
    ? wrongLetters.join(", ")
    : "None";
  document.getElementById("wrong-count").textContent = game.wrongGuesses;
}

function resetAlphabet() {
  document.querySelectorAll(".letter-btn").forEach((btn) => {
    btn.disabled = false;
    btn.className =
      "letter-btn bg-blue-100 hover:bg-blue-200 border border-blue-300 p-2 rounded font-semibold text-blue-800 transition";
  });
}

function getHint() {
  const game = window.hangmanGame;

  if (game.hintsUsed >= 1) {
    alert("No more hints available!");
    return;
  }

  // Find unguessed letters
  const unguessedLetters = game.currentWord
    .split("")
    .filter((letter) => !game.guessedLetters.includes(letter));

  if (unguessedLetters.length === 0) {
    alert("You've already guessed all the letters!");
    return;
  }

  // Give a random unguessed letter
  const hintLetter =
    unguessedLetters[Math.floor(Math.random() * unguessedLetters.length)];

  // Auto-select the hint letter
  document.getElementById("letter-input").value = hintLetter;
  guessLetter();

  game.hintsUsed++;
  document.getElementById("hint-btn").textContent = "💡 No hints remaining";
  document.getElementById("hint-btn").disabled = true;
}

function showGameResult(won) {
  const resultDiv = document.getElementById("game-result");
  const titleEl = document.getElementById("result-title");
  const messageEl = document.getElementById("result-message");

  if (won) {
    resultDiv.className =
      "mt-6 p-4 rounded-lg text-center bg-green-100 border border-green-300";
    titleEl.textContent = "🎉 Congratulations!";
    titleEl.className = "text-2xl font-bold mb-2 text-green-800";
    messageEl.textContent = `You guessed "${window.hangmanGame.currentWord}" correctly!`;
    messageEl.className = "text-lg mb-4 text-green-700";
  } else {
    resultDiv.className =
      "mt-6 p-4 rounded-lg text-center bg-red-100 border border-red-300";
    titleEl.textContent = "💀 Game Over!";
    titleEl.className = "text-2xl font-bold mb-2 text-red-800";
    messageEl.textContent = `The word was "${window.hangmanGame.currentWord}". Better luck next time!`;
    messageEl.className = "text-lg mb-4 text-red-700";
  }

  resultDiv.classList.remove("hidden");
  document.getElementById("letter-input").disabled = true;
}
// Dark mode functions
function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.contains("dark");

  if (isDark) {
    html.classList.remove("dark");
    localStorage.setItem("darkMode", "false");
    updateDarkModeIcon(false);
  } else {
    html.classList.add("dark");
    localStorage.setItem("darkMode", "true");
    updateDarkModeIcon(true);
  }
}

function updateDarkModeIcon(isDark) {
  const toggleBtn = document.getElementById("dark-mode-toggle");
  if (toggleBtn) {
    toggleBtn.textContent = isDark ? "☀️" : "🌙";
    toggleBtn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
  }
}

function initializeDarkMode() {
  const savedDarkMode = localStorage.getItem("darkMode");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark =
    savedDarkMode === "true" || (savedDarkMode === null && prefersDark);

  if (shouldUseDark) {
    document.documentElement.classList.add("dark");
    updateDarkModeIcon(true);
  } else {
    updateDarkModeIcon(false);
  }
}

// Logout function
async function logout() {
  // Clear all timers
  clearTimeout(sessionTimeout);
  clearTimeout(warningTimeout);
  clearInterval(sessionCheckInterval);

  // Disconnect WebSocket
  disconnectWebSocket();

  // Call logout API
  try {
    await fetch("/api/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Logout error:", error);
  }

  // Hide dark mode toggle on logout
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  if (darkModeToggle) {
    darkModeToggle.style.display = "none";
  }

  currentUser = null;

  // Redirect to homepage instead of showing login form
  window.location.href = "/homepage.html";
}

// Dashboard Functions
function showDashboard() {
  document.getElementById("dashboard-modal").classList.remove("hidden");
  populateYearSelectors();
  loadDashboardData();
}

function hideDashboard() {
  document.getElementById("dashboard-modal").classList.add("hidden");
}

function switchDashboardTab(tab) {
  // Update tab buttons
  document.querySelectorAll('[id$="-tab"]').forEach((btn) => {
    btn.classList.remove("border-blue-500", "text-blue-600");
    btn.classList.add("border-transparent", "text-gray-500");
  });

  document
    .getElementById(`${tab}-tab`)
    .classList.remove("border-transparent", "text-gray-500");
  document
    .getElementById(`${tab}-tab`)
    .classList.add("border-blue-500", "text-blue-600");

  // Hide all content
  document.querySelectorAll(".dashboard-content").forEach((content) => {
    content.classList.add("hidden");
  });

  // Show selected content
  document.getElementById(`${tab}-content`).classList.remove("hidden");

  // Load specific data for tab
  if (tab === "overview") {
    loadDashboardData();
  } else if (tab === "comparison") {
    populateComparisonYears();
  }
}

function populateYearSelectors() {
  const reportYearSelect = document.getElementById("report-year");
  reportYearSelect.innerHTML = "";

  financialYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    if (year === currentFinancialYear) option.selected = true;
    reportYearSelect.appendChild(option);
  });
}

function populateComparisonYears() {
  const year1Select = document.getElementById("compare-year1");
  const year2Select = document.getElementById("compare-year2");

  [year1Select, year2Select].forEach((select) => {
    select.innerHTML = "";
    financialYears.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      select.appendChild(option);
    });
  });

  year1Select.value = "2023-2024";
  year2Select.value = "2024-2025";
}

async function loadDashboardData() {
  try {
    const [supplyData, demandData, billData] = await Promise.all([
      fetch(`/api/supply-orders?year=${currentFinancialYear}`).then((r) =>
        r.json(),
      ),
      fetch(`/api/demand-orders?year=${currentFinancialYear}`).then((r) =>
        r.json(),
      ),
      fetch(`/api/bill-orders?year=${currentFinancialYear}`).then((r) =>
        r.json(),
      ),
    ]);

    updateOverviewStats(supplyData, demandData, billData);
    createDeliveryChart(supplyData);
    createTrendChart(supplyData, demandData, billData);
    loadDemandPipelineData(demandData);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

function updateOverviewStats(supplyData, demandData, billData) {
  const totalSupply = supplyData.length;
  const deliveredOrders = supplyData.filter(
    (order) => order.delivery_done === "Yes",
  ).length;
  const pendingOrders = totalSupply - deliveredOrders;

  // Calculate total value from bill data
  const totalValue = billData.reduce((sum, bill) => {
    const value =
      parseFloat(bill.build_up || 0) +
      parseFloat(bill.maintenance || 0) +
      parseFloat(bill.project_less_2cr || 0) +
      parseFloat(bill.project_more_2cr || 0);
    return sum + value;
  }, 0);

  document.getElementById("total-supply").textContent = totalSupply;
  document.getElementById("delivered-orders").textContent = deliveredOrders;
  document.getElementById("pending-orders").textContent = pendingOrders;
  document.getElementById("total-value").textContent =
    `₹${totalValue.toFixed(2)}L`;
}

function createDeliveryChart(supplyData) {
  const ctx = document.getElementById("deliveryChart").getContext("2d");

  if (deliveryChart) {
    deliveryChart.destroy();
  }

  const delivered = supplyData.filter(
    (order) => order.delivery_done === "Yes",
  ).length;
  const pending = supplyData.length - delivered;

  deliveryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Delivered", "Pending"],
      datasets: [
        {
          data: [delivered, pending],
          backgroundColor: ["#10B981", "#F59E0B"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        legend: {
          position: "bottom",
        },
        datalabels: {
          display: true,
          color: "white",
          font: {
            weight: "bold",
            size: 14,
          },
          formatter: (value, ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${value}\n(${percentage}%)`;
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "xy",
          },
          pan: {
            enabled: true,
            mode: "xy",
          },
        },
      },
    },
  });
}

function createTrendChart(supplyData, demandData, billData) {
  const ctx = document.getElementById("trendChart").getContext("2d");

  if (trendChart) {
    trendChart.destroy();
  }

  // Group data by month
  const monthlyData = {};

  [supplyData, demandData, billData].forEach((data, index) => {
    const type = ["Supply", "Demand", "Bill"][index];
    data.forEach((item) => {
      const date =
        item.original_date || item.demand_date || item.bill_control_date;
      if (date) {
        const month = new Date(date).toISOString().slice(0, 7);
        if (!monthlyData[month])
          monthlyData[month] = { Supply: 0, Demand: 0, Bill: 0 };
        monthlyData[month][type]++;
      }
    });
  });

  const months = Object.keys(monthlyData).sort();
  const supplyTrend = months.map((month) => monthlyData[month].Supply);
  const demandTrend = months.map((month) => monthlyData[month].Demand);
  const billTrend = months.map((month) => monthlyData[month].Bill);

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Supply Orders",
          data: supplyTrend,
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.1,
        },
        {
          label: "Demand Orders",
          data: demandTrend,
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.1,
        },
        {
          label: "Bill Orders",
          data: billTrend,
          borderColor: "#F59E0B",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        legend: {
          position: "bottom",
        },
        datalabels: {
          display: true,
          align: "top",
          color: function (context) {
            return context.dataset.borderColor;
          },
          font: {
            weight: "bold",
            size: 10,
          },
          formatter: (value) => (value > 0 ? value : ""),
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y} orders`;
            },
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "xy",
          },
          pan: {
            enabled: true,
            mode: "xy",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

function loadDemandPipelineData(demandData) {
  // Filter demands where supply order is not placed
  const pipelineData = demandData.filter(
    (demand) =>
      demand.supply_order_placed === "No" ||
      demand.supply_order_placed === null ||
      demand.supply_order_placed === "",
  );

  console.log("Pipeline demands found:", pipelineData.length);

  // Create chart data grouped by expenditure head
  const expenditureGroups = {};
  let totalCost = 0;

  pipelineData.forEach((demand) => {
    const expHead = demand.expenditure_head || "Others";
    if (!expenditureGroups[expHead]) {
      expenditureGroups[expHead] = {
        count: 0,
        cost: 0,
        demands: [],
      };
    }
    expenditureGroups[expHead].count++;
    expenditureGroups[expHead].cost += parseFloat(demand.est_cost || 0);
    expenditureGroups[expHead].demands.push(demand);
    totalCost += parseFloat(demand.est_cost || 0);
  });

  // Create doughnut chart
  createDemandPipelineChart(expenditureGroups, pipelineData.length, totalCost);

  // Populate table
  populateDemandPipelineTable(pipelineData);
}

function createDemandPipelineChart(expenditureGroups, totalCount, totalCost) {
  const ctx = document.getElementById("demandPipelineChart").getContext("2d");

  if (demandPipelineChart) {
    demandPipelineChart.destroy();
  }

  const labels = Object.keys(expenditureGroups);
  const counts = labels.map((label) => expenditureGroups[label].count);
  const costs = labels.map((label) => expenditureGroups[label].cost);

  const colors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#FF6384",
    "#C9CBCF",
  ];

  demandPipelineChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: counts,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        legend: {
          position: "bottom",
        },
        datalabels: {
          display: true,
          color: "white",
          font: {
            weight: "bold",
            size: 12,
          },
          formatter: (value, ctx) => {
            if (value === 0) return "";
            const percentage = ((value / totalCount) * 100).toFixed(1);
            return `${value}\n(${percentage}%)`;
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label;
              const count = context.parsed;
              const cost = costs[context.dataIndex];
              const percentage = ((count / totalCount) * 100).toFixed(1);
              return [
                `${label}: ${count} demands (${percentage}%)`,
                `Est. Cost: ₹${cost.toFixed(2)}L`,
              ];
            },
            afterBody: function () {
              return [
                "",
                `Total Demands: ${totalCount}`,
                `Total Est. Cost: ₹${totalCost.toFixed(2)}L`,
              ];
            },
          },
        },
      },
    },
  });
}

function populateDemandPipelineTable(pipelineData) {
  const tableBody = document.getElementById("demandPipelineTableBody");

  if (!tableBody) {
    console.error("Demand pipeline table body not found");
    return;
  }

  tableBody.innerHTML = "";

  if (pipelineData.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="7" class="border p-4 text-center text-gray-500">
        No demands in pipeline - all demands have supply orders placed
      </td>
    `;
    tableBody.appendChild(row);
    return;
  }

  pipelineData.forEach((demand, index) => {
    const row = document.createElement("tr");
    row.className = index % 2 === 0 ? "bg-gray-50" : "bg-white";

    const revCapClass =
      demand.rev_cap === "R" ? "text-blue-600" : "text-green-600";
    const revCapText = demand.rev_cap === "R" ? "Revenue" : "Capital";

    row.innerHTML = `
      <td class="border p-2">${demand.imms_demand_no || "N/A"}</td>
      <td class="border p-2" title="${demand.nomenclature || ""}">${
        (demand.nomenclature || "N/A").length > 30
          ? (demand.nomenclature || "N/A").substring(0, 30) + "..."
          : demand.nomenclature || "N/A"
      }</td>
      <td class="border p-2 text-right font-semibold">₹${parseFloat(demand.est_cost || 0).toFixed(2)}L</td>
      <td class="border p-2">${demand.expenditure_head || "N/A"}</td>
      <td class="border p-2">${demand.code_head || "N/A"}</td>
      <td class="border p-2"><span class="${revCapClass} font-semibold">${revCapText}</span></td>
      <td class="border p-2">${demand.demand_date ? new Date(demand.demand_date).toLocaleDateString() : "N/A"}</td>
    `;
    tableBody.appendChild(row);
  });
}

async function generateReport() {
  const reportType = document.getElementById("report-type").value;
  const reportYear = document.getElementById("report-year").value;
  const reportContent = document.getElementById("report-content");

  try {
    let data = [];
    if (reportType === "all") {
      const [supply, demand, bill] = await Promise.all([
        fetch(`/api/supply-orders?year=${reportYear}`).then((r) =>
          r.json(),
        ),
        fetch(`/api/demand-orders?year=${reportYear}`).then((r) =>
          r.json(),
        ),
        fetch(`/api/bill-orders?year=${reportYear}`).then((r) =>
          r.json(),
        ),
      ]);

      reportContent.innerHTML = `
        <div class="print-content">
          <h2 class="text-2xl font-bold mb-4">Comprehensive Report - ${reportYear}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="text-center p-4 bg-blue-50 rounded">
              <h3 class="font-semibold">Supply Orders</h3>
              <p class="text-2xl font-bold text-blue-600">${supply.length}</p>
            </div>
            <div class="text-center p-4 bg-green-50 rounded">
              <h3 class="font-semibold">Demand Orders</h3>
              <p class="text-2xl font-bold text-green-600">${demand.length}</p>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded">
              <h3 class="font-semibold">Bill Orders</h3>
              <p class="text-2xl font-bold text-yellow-600">${bill.length}</p>
            </div>
          </div>
          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2">Supply Orders Summary</h3>
            <p>Delivered: ${supply.filter((s) => s.delivery_done === "Yes").length}</p>
            <p>Pending: ${supply.filter((s) => s.delivery_done === "No").length}</p>
          </div>
        </div>
      `;
    } else {
      const response = await fetch(
        `/api/${reportType}-orders?year=${reportYear}`,
      );
      data = await response.json();

      reportContent.innerHTML = `
        <div class="print-content">
          <h2 class="text-2xl font-bold mb-4">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Orders Report - ${reportYear}</h2>
          <p class="mb-4">Total Orders: <strong>${data.length}</strong></p>
          <p class="mb-4">Generated on: <strong>${new Date().toLocaleDateString()}</strong></p>
          <div class="text-sm text-gray-600">
            <p>This report contains ${data.length} ${reportType} orders for the financial year ${reportYear}.</p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error generating report:", error);
    reportContent.innerHTML =
      '<p class="text-red-500">Error generating report</p>';
  }
}

function printReport() {
  const printContent = document.querySelector(".print-content");
  if (!printContent) {
    alert("Please generate a report first");
    return;
  }

  const printWindow = window.open("", "", "height=600,width=800");
  printWindow.document.write(`
    <html>
      <head>
        <title>Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h2 { color: #1f2937; }
          h3 { color: #374151; }
          .grid { display: flex; gap: 20px; margin: 20px 0; }
          .text-center { text-align: center; }
          .p-4 { padding: 16px; }
          .bg-blue-50 { background-color: #eff6ff; }
          .bg-green-50 { background-color: #f0fdf4; }
          .bg-yellow-50 { background-color: #fefce8; }
          .rounded { border-radius: 8px; }
          .font-bold { font-weight: bold; }
          .text-2xl { font-size: 1.5rem; }
          .text-blue-600 { color: #2563eb; }
          .text-green-600 { color: #16a34a; }
          .text-yellow-600 { color: #ca8a04; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

function downloadPDF() {
  alert(
    "PDF download functionality would require a PDF generation library. For now, please use the print function.",
  );
}

async function compareYears() {
  const year1 = document.getElementById("compare-year1").value;
  const year2 = document.getElementById("compare-year2").value;

  try {
    const [year1Data, year2Data] = await Promise.all([
      Promise.all([
        fetch(`/api/supply-orders?year=${year1}`).then((r) => r.json()),
        fetch(`/api/demand-orders?year=${year1}`).then((r) => r.json()),
        fetch(`/api/bill-orders?year=${year1}`).then((r) => r.json()),
      ]),
      Promise.all([
        fetch(`/api/supply-orders?year=${year2}`).then((r) => r.json()),
        fetch(`/api/demand-orders?year=${year2}`).then((r) => r.json()),
        fetch(`/api/bill-orders?year=${year2}`).then((r) => r.json()),
      ]),
    ]);

    createComparisonChart(year1, year1Data, year2, year2Data);
    createValueComparisonChart(year1, year1Data[2], year2, year2Data[2]);
  } catch (error) {
    console.error("Error comparing years:", error);
  }
}

function createComparisonChart(year1, year1Data, year2, year2Data) {
  const ctx = document.getElementById("comparisonChart").getContext("2d");

  if (comparisonChart) {
    comparisonChart.destroy();
  }

  comparisonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Supply Orders", "Demand Orders", "Bill Orders"],
      datasets: [
        {
          label: year1,
          data: [year1Data[0].length, year1Data[1].length, year1Data[2].length],
          backgroundColor: "#3B82F6",
        },
        {
          label: year2,
          data: [year2Data[0].length, year2Data[1].length, year2Data[2].length],
          backgroundColor: "#10B981",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        legend: {
          position: "bottom",
        },
        datalabels: {
          display: true,
          anchor: "end",
          align: "top",
          color: "black",
          font: {
            weight: "bold",
            size: 12,
          },
          formatter: (value) => value,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y} orders`;
            },
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "xy",
          },
          pan: {
            enabled: true,
            mode: "xy",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

function createValueComparisonChart(year1, billData1, year2, billData2) {
  const ctx = document.getElementById("valueComparisonChart").getContext("2d");

  if (valueComparisonChart) {
    valueComparisonChart.destroy();
  }

  const calculateValue = (data) => {
    return data.reduce((sum, bill) => {
      return (
        sum +
        (parseFloat(bill.build_up || 0) +
          parseFloat(bill.maintenance || 0) +
          parseFloat(bill.project_less_2cr || 0) +
          parseFloat(bill.project_more_2cr || 0))
      );
    }, 0);
  };

  valueComparisonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Total Value (₹L)"],
      datasets: [
        {
          label: year1,
          data: [calculateValue(billData1)],
          backgroundColor: "#3B82F6",
        },
        {
          label: year2,
          data: [calculateValue(billData2)],
          backgroundColor: "#10B981",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        legend: {
          position: "bottom",
        },
        datalabels: {
          display: true,
          anchor: "end",
          align: "top",
          color: "black",
          font: {
            weight: "bold",
            size: 12,
          },
          formatter: (value) => `₹${parseFloat(value).toFixed(2)}L`,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ₹${context.parsed.y.toFixed(2)}L`;
            },
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "xy",
          },
          pan: {
            enabled: true,
            mode: "xy",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "₹" + value.toFixed(2) + "L";
            },
          },
        },
      },
    },
  });
}

async function updateAdvancedVisualization() {
  const vizType = document.getElementById("viz-type").value;
  const vizTitle = document.getElementById("viz-title");

  try {
    const [supplyData, demandData, billData] = await Promise.all([
      fetch(`/api/supply-orders?year=${currentFinancialYear}`).then((r) =>
        r.json(),
      ),
      fetch(`/api/demand-orders?year=${currentFinancialYear}`).then((r) =>
        r.json(),
      ),
      fetch(`/api/bill-orders?year=${currentFinancialYear}`).then((r) =>
        r.json(),
      ),
    ]);

    let chartData = {};
    let chartConfig = {};

    switch (vizType) {
      case "procurement":
        chartData = analyzeProcurementModes(supplyData);
        vizTitle.textContent = "Procurement Mode Analysis";
        chartConfig = createPieChart(chartData, "Procurement Modes");
        break;

      case "firm":
        chartData = analyzeTopFirms(supplyData);
        vizTitle.textContent = "Top Firms by Order Count";
        chartConfig = createBarChart(chartData, "Top Firms", "Orders", 10);
        break;

      case "firm-value":
        chartData = analyzeTopFirmsByValue(supplyData);
        vizTitle.textContent = "Top Firms by Supply Order Value";
        chartConfig = createBarChart(
          chartData,
          "Firms by Value",
          "Value (₹)",
          10,
        );
        break;

      case "timeline":
        chartData = analyzeDeliveryTimeline(supplyData);
        vizTitle.textContent = "Delivery Timeline Analysis";
        chartConfig = createPieChart(chartData, "Delivery Timeline");
        break;

      case "expenditure":
        chartData = analyzeExpenditureHeads(supplyData);
        vizTitle.textContent = "Expenditure Head Distribution";
        chartConfig = createPieChart(chartData, "Expenditure Heads");
        break;

      case "delivery-performance":
        chartData = analyzeDeliveryPerformance(supplyData);
        vizTitle.textContent = "Delivery Performance Metrics";
        chartConfig = createPerformanceChart(chartData);
        break;

      case "supplier-performance":
        chartData = analyzeSupplierPerformance(supplyData);
        vizTitle.textContent = "Supplier Performance Analysis";
        chartConfig = createScatterChart(chartData);
        break;

      case "cost-efficiency":
        chartData = analyzeCostEfficiency(billData);
        vizTitle.textContent = "Cost Efficiency Analysis";
        chartConfig = createLineChart(chartData, "Cost Trends");
        break;

      case "quality-metrics":
        chartData = analyzeQualityMetrics(supplyData);
        vizTitle.textContent = "Quality Performance Metrics";
        chartConfig = createRadarChart(chartData);
        break;

      case "budget-utilization":
        chartData = analyzeBudgetUtilization(billData);
        vizTitle.textContent = "Budget Utilization Analysis";
        chartConfig = createStackedBarChart(chartData);
        break;

      case "order-value":
        chartData = analyzeOrderValueDistribution(billData);
        vizTitle.textContent = "Order Value Distribution";
        chartConfig = createHistogramChart(chartData);
        break;

      case "cost-variance":
        chartData = analyzeCostVariance(supplyData, billData);
        vizTitle.textContent = "Cost Variance Analysis";
        chartConfig = createVarianceChart(chartData);
        break;

      case "payment-analysis":
        chartData = analyzePaymentTerms(billData);
        vizTitle.textContent = "Payment Terms Analysis";
        chartConfig = createPieChart(chartData, "Payment Status");
        break;

      case "monthly-trends":
        chartData = analyzeMonthlyTrends(supplyData, demandData, billData);
        vizTitle.textContent = "Monthly Order Trends";
        chartConfig = createMultiLineChart(chartData);
        break;

      case "seasonal-trends":
        chartData = analyzeSeasonalTrends(supplyData);
        vizTitle.textContent = "Seasonal Order Trends";
        chartConfig = createSeasonalChart(chartData);
        break;

      case "quarterly-comparison":
        chartData = analyzeQuarterlyComparison(supplyData, demandData);
        vizTitle.textContent = "Quarterly Comparison";
        chartConfig = createQuarterlyChart(chartData);
        break;

      case "forecast-analysis":
        chartData = analyzeForecast(supplyData, demandData);
        vizTitle.textContent = "Demand Forecast Analysis";
        chartConfig = createForecastChart(chartData);
        break;

      case "risk-analysis":
        chartData = analyzeRiskAssessment(supplyData);
        vizTitle.textContent = "Risk Assessment Dashboard";
        chartConfig = createRiskChart(chartData);
        break;

      case "compliance-tracking":
        chartData = analyzeCompliance(supplyData);
        vizTitle.textContent = "Compliance Tracking";
        chartConfig = createComplianceChart(chartData);
        break;

      case "delay-analysis":
        chartData = analyzeDeliveryDelays(supplyData);
        vizTitle.textContent = "Delivery Delay Analysis";
        chartConfig = createDelayChart(chartData);
        break;

      case "lead-time-analysis":
        chartData = analyzeLeadTimes(supplyData);
        vizTitle.textContent = "Lead Time Analysis";
        chartConfig = createLeadTimeChart(chartData);
        break;

      case "vendor-diversity":
        chartData = analyzeVendorDiversity(supplyData);
        vizTitle.textContent = "Vendor Diversity Analysis";
        chartConfig = createDiversityChart(chartData);
        break;

      case "geographical-analysis":
        chartData = analyzeGeographical(supplyData);
        vizTitle.textContent = "Geographical Distribution";
        chartConfig = createGeoChart(chartData);
        break;

      case "project-analysis":
        chartData = analyzeProjectTypes(supplyData);
        vizTitle.textContent = "Project Type Distribution";
        chartConfig = createProjectChart(chartData);
        break;

      case "department-wise":
        chartData = analyzeDepartmentWise(supplyData, demandData);
        vizTitle.textContent = "Department-wise Analysis";
        chartConfig = createDepartmentChart(chartData);
        break;

      case "inventory-turnover":
        chartData = analyzeInventoryTurnover(supplyData, billData);
        vizTitle.textContent = "Inventory Turnover Metrics";
        chartConfig = createTurnoverChart(chartData);
        break;

      case "procurement-time":
        chartData = analyzeProcurementTime(demandData, supplyData);
        vizTitle.textContent = "Procurement Time Analysis";
        chartConfig = createProcurementTimeChart(chartData);
        break;

      case "order-size-distribution":
        chartData = analyzeOrderSizeDistribution(supplyData);
        vizTitle.textContent = "Order Size Distribution";
        chartConfig = createSizeDistributionChart(chartData);
        break;

      case "revenue-capital":
        chartData = analyzeRevenueCapital(supplyData);
        vizTitle.textContent = "Revenue vs Capital Analysis";
        chartConfig = createRevCapChart(chartData);
        break;

      case "delivery-status-trend":
        chartData = analyzeDeliveryStatusTrend(supplyData);
        vizTitle.textContent = "Delivery Status Trend Analysis";
        chartConfig = createDeliveryStatusChart(chartData);
        break;

      case "order-completion-rate":
        chartData = analyzeOrderCompletionRate(supplyData, demandData);
        vizTitle.textContent = "Order Completion Rate Analysis";
        chartConfig = createCompletionRateChart(chartData);
        break;

      case "procurement-cost-analysis":
        chartData = analyzeProcurementCostByMode(supplyData, billData);
        vizTitle.textContent = "Procurement Cost by Mode";
        chartConfig = createProcurementCostChart(chartData);
        break;

      case "supplier-reliability-score":
        chartData = analyzeSupplierReliabilityScore(supplyData);
        vizTitle.textContent = "Supplier Reliability Score Matrix";
        chartConfig = createReliabilityChart(chartData);
        break;

      case "monthly-expenditure-trend":
        chartData = analyzeMonthlyExpenditureTrend(billData);
        vizTitle.textContent = "Monthly Expenditure Trend";
        chartConfig = createExpenditureTrendChart(chartData);
        break;

      case "project-allocation-breakdown":
        chartData = analyzeProjectAllocationBreakdown(supplyData, billData);
        vizTitle.textContent = "Project Allocation Breakdown";
        chartConfig = createAllocationChart(chartData);
        break;

      case "demand-fulfillment-ratio":
        chartData = analyzeDemandFulfillmentRatio(demandData, supplyData);
        vizTitle.textContent = "Demand Fulfillment Ratio";
        chartConfig = createFulfillmentChart(chartData);
        break;

      case "cost-per-procurement-mode":
        chartData = analyzeCostPerProcurementMode(billData);
        vizTitle.textContent = "Average Cost per Procurement Mode";
        chartConfig = createCostPerModeChart(chartData);
        break;

      case "order-priority-analysis":
        chartData = analyzeOrderPriority(supplyData);
        vizTitle.textContent = "Order Priority Analysis";
        chartConfig = createPriorityChart(chartData);
        break;

      case "timeline-deviation-analysis":
        chartData = analyzeTimelineDeviation(supplyData);
        vizTitle.textContent = "Timeline Deviation Analysis";
        chartConfig = createTimelineDeviationChart(chartData);
        break;

      case "vendor-concentration-risk":
        chartData = analyzeVendorConcentrationRisk(supplyData);
        vizTitle.textContent = "Vendor Concentration Risk Analysis";
        chartConfig = createConcentrationRiskChart(chartData);
        break;

      case "cost-trend-by-category":
        chartData = analyzeCostTrendByCategory(billData);
        vizTitle.textContent = "Cost Trend by Category";
        chartConfig = createCategoryTrendChart(chartData);
        break;

      case "efficiency-metrics-dashboard":
        chartData = analyzeEfficiencyMetrics(supplyData, demandData, billData);
        vizTitle.textContent = "Efficiency Metrics Dashboard";
        chartConfig = createEfficiencyChart(chartData);
        break;

      case "payment-cycle-analysis":
        chartData = analyzePaymentCycle(billData);
        vizTitle.textContent = "Payment Cycle Analysis";
        chartConfig = createPaymentCycleChart(chartData);
        break;

      case "procurement-velocity":
        chartData = analyzeProcurementVelocity(demandData, supplyData);
        vizTitle.textContent = "Procurement Velocity Metrics";
        chartConfig = createVelocityChart(chartData);
        break;

      case "budget-variance-tracking":
        chartData = analyzeBudgetVarianceTracking(billData);
        vizTitle.textContent = "Budget Variance Tracking";
        chartConfig = createVarianceTrackingChart(chartData);
        break;

      case "multi-dimensional-performance":
        chartData = analyzeMultiDimensionalPerformance(
          supplyData,
          demandData,
          billData,
        );
        vizTitle.textContent = "Multi-Dimensional Performance Analysis";
        chartConfig = createMultiDimensionalChart(chartData);
        break;

      case "predictive-demand-forecast":
        chartData = analyzePredictiveDemandForecast(demandData, supplyData);
        vizTitle.textContent = "Predictive Demand Forecast";
        chartConfig = createPredictiveForecastChart(chartData);
        break;

      case "supply-chain-bottleneck":
        chartData = analyzeSupplyChainBottlenecks(supplyData, demandData);
        vizTitle.textContent = "Supply Chain Bottleneck Analysis";
        chartConfig = createBottleneckChart(chartData);
        break;

      case "roi-analysis":
        chartData = analyzeROIAnalysis(billData);
        vizTitle.textContent = "Return on Investment Analysis";
        chartConfig = createROIChart(chartData);
        break;

      case "demand-value-expenditure-head":
        chartData = analyzeDemandValueExpenditureHead(demandData);
        vizTitle.textContent = "Demand Value Expenditure Head Distribution";
        chartConfig = createPieChart(
          chartData,
          "Demand Value by Expenditure Head",
        );
        break;

      case "supply-value-expenditure-head":
        chartData = analyzeSupplyValueExpenditureHead(supplyData);
        vizTitle.textContent =
          "Supply Order Value Expenditure Head Distribution";
        chartConfig = createPieChart(
          chartData,
          "Supply Value by Expenditure Head",
        );
        break;

      default:
        chartData = analyzeProcurementModes(supplyData);
        vizTitle.textContent = "Procurement Mode Analysis";
        chartConfig = createPieChart(chartData, "Procurement Modes");
    }

    createAdvancedChart(chartConfig);
  } catch (error) {
    console.error("Error updating advanced visualization:", error);
    vizTitle.textContent = "Error loading chart data";
  }
}

// Analysis functions
function analyzeProcurementModes(data) {
  const modes = {};
  data.forEach((item) => {
    const mode = item.procurement_mode || "Unknown";
    modes[mode] = (modes[mode] || 0) + 1;
  });
  return modes;
}

function analyzeTopFirms(data) {
  const firms = {};
  data.forEach((item) => {
    const firm = item.firm_name || "Unknown";
    firms[firm] = (firms[firm] || 0) + 1;
  });
  return Object.fromEntries(
    Object.entries(firms).sort(([, a], [, b]) => b - a),
  );
}

function analyzeTopFirmsByValue(data) {
  const firms = {};
  data.forEach((item) => {
    const firm = item.firm_name || "Unknown";
    const value =
      parseFloat(item.build_up || 0) +
      parseFloat(item.maint || 0) +
      parseFloat(item.misc || 0);
    firms[firm] = (firms[firm] || 0) + value;
  });
  return Object.fromEntries(
    Object.entries(firms).sort(([, a], [, b]) => b - a),
  );
}

function analyzeDeliveryTimeline(data) {
  const timeline = { onTime: 0, delayed: 0, pending: 0 };
  const today = new Date();

  data.forEach((item) => {
    if (item.delivery_done === "Yes") {
      const deliveryDate = new Date(item.actual_delivery_date);
      const originalDate = new Date(item.original_date);
      timeline[deliveryDate <= originalDate ? "onTime" : "delayed"]++;
    } else {
      timeline.pending++;
    }
  });
  return timeline;
}

function analyzeExpenditureHeads(data) {
  const heads = {};
  data.forEach((item) => {
    const head = item.expenditure_head || "Unknown";
    heads[head] = (heads[head] || 0) + 1;
  });
  return heads;
}

function analyzeDeliveryPerformance(data) {
  const performance = { excellent: 0, good: 0, average: 0, poor: 0 };

  data.forEach((item) => {
    if (item.delivery_done === "Yes") {
      const deliveryDate = new Date(item.actual_delivery_date);
      const originalDate = new Date(item.original_date);
      const delay = Math.ceil(
        (deliveryDate - originalDate) / (1000 * 60 * 60 * 24),
      );

      if (delay <= 0) performance.excellent++;
      else if (delay <= 7) performance.good++;
      else if (delay <= 30) performance.average++;
      else performance.poor++;
    }
  });
  return performance;
}

function analyzeSupplierPerformance(data) {
  const suppliers = {};
  data.forEach((item) => {
    const firm = item.firm_name || "Unknown";
    if (!suppliers[firm])
      suppliers[firm] = { orders: 0, onTime: 0, delayed: 0 };
    suppliers[firm].orders++;
    if (item.delivery_done === "Yes") {
      const deliveryDate = new Date(item.actual_delivery_date);
      const originalDate = new Date(item.original_date);
      if (deliveryDate <= originalDate) suppliers[firm].onTime++;
      else suppliers[firm].delayed++;
    }
  });
  return suppliers;
}

function analyzeCostEfficiency(data) {
  const monthly = {};
  data.forEach((item) => {
    const month = item.bill_control_date
      ? new Date(item.bill_control_date).toISOString().slice(0, 7)
      : "Unknown";
    const cost =
      parseFloat(item.build_up || 0) + parseFloat(item.maintenance || 0);
    monthly[month] = (monthly[month] || 0) + cost;
  });
  return monthly;
}

function analyzeQualityMetrics(data) {
  return {
    "On-time Delivery":
      (data.filter((item) => item.delivery_done === "Yes").length /
        data.length) *
      100,
    "Order Accuracy": 95, // Mock data
    "Supplier Reliability": 88, // Mock data
    "Quality Rating": 90, // Mock data
  };
}

function analyzeBudgetUtilization(data) {
  const budget = { buildUp: 0, maintenance: 0, projects: 0 };
  data.forEach((item) => {
    budget.buildUp += parseFloat(item.build_up || 0);
    budget.maintenance += parseFloat(item.maintenance || 0);
    budget.projects +=
      parseFloat(item.project_less_2cr || 0) +
      parseFloat(item.project_more_2cr || 0);
  });
  return budget;
}

function analyzeOrderValueDistribution(data) {
  const ranges = { "0-1L": 0, "1L-5L": 0, "5L-10L": 0, "10L+": 0 };
  data.forEach((item) => {
    const value =
      parseFloat(item.build_up || 0) + parseFloat(item.maintenance || 0);
    if (value < 100000) ranges["0-1L"]++;
    else if (value < 500000) ranges["1L-5L"]++;
    else if (value < 1000000) ranges["5L-10L"]++;
    else ranges["10L+"]++;
  });
  return ranges;
}

function analyzeCostVariance(supplyData, billData) {
  // Mock implementation for cost variance
  return { Budget: 100, Actual: 105, Variance: 5 };
}

function analyzePaymentTerms(data) {
  const status = { paid: 0, pending: 0, overdue: 0 };
  data.forEach((item) => {
    if (item.date_amount_passed && item.date_amount_passed !== "Pending") {
      status.paid++;
    } else {
      status.pending++;
    }
  });
  return status;
}

function analyzeMonthlyTrends(supplyData, demandData, billData) {
  const months = {};
  [supplyData, demandData, billData].forEach((data, index) => {
    const type = ["Supply", "Demand", "Bill"][index];
    data.forEach((item) => {
      const date =
        item.original_date || item.demand_date || item.bill_control_date;
      if (date) {
        const month = new Date(date).toISOString().slice(0, 7);
        if (!months[month]) months[month] = { Supply: 0, Demand: 0, Bill: 0 };
        months[month][type]++;
      }
    });
  });
  return months;
}

function analyzeSeasonalTrends(data) {
  const seasons = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  data.forEach((item) => {
    if (item.original_date) {
      const month = new Date(item.original_date).getMonth() + 1;
      if (month <= 3) seasons.Q1++;
      else if (month <= 6) seasons.Q2++;
      else if (month <= 9) seasons.Q3++;
      else seasons.Q4++;
    }
  });
  return seasons;
}

function analyzeQuarterlyComparison(supplyData, demandData) {
  const quarters = {};
  [supplyData, demandData].forEach((data, index) => {
    const type = ["Supply", "Demand"][index];
    data.forEach((item) => {
      const date = item.original_date || item.demand_date;
      if (date) {
        const quarter = "Q" + Math.ceil((new Date(date).getMonth() + 1) / 3);
        if (!quarters[quarter]) quarters[quarter] = { Supply: 0, Demand: 0 };
        quarters[quarter][type]++;
      }
    });
  });
  return quarters;
}

function analyzeForecast(supplyData, demandData) {
  // Mock forecast data
  const forecast = {};
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  months.forEach((month) => {
    forecast[month] = Math.floor(Math.random() * 50) + 20;
  });
  return forecast;
}

function analyzeRiskAssessment(data) {
  return {
    "High Risk": data.filter(
      (item) =>
        item.delivery_done === "No" &&
        new Date(item.original_date) < new Date(),
    ).length,
    "Medium Risk": data.filter((item) => item.delivery_done === "Pending")
      .length,
    "Low Risk": data.filter((item) => item.delivery_done === "Yes").length,
  };
}

function analyzeCompliance(data) {
  return {
    Compliant: data.filter((item) => item.delivery_done === "Yes").length,
    "Non-Compliant": data.filter((item) => item.delivery_done === "No").length,
    "Under Review": data.filter((item) => item.delivery_done === "Pending")
      .length,
  };
}

function analyzeDeliveryDelays(data) {
  const delays = { "0-7 days": 0, "8-30 days": 0, "31+ days": 0 };
  data.forEach((item) => {
    if (
      item.delivery_done === "Yes" &&
      item.actual_delivery_date &&
      item.original_date
    ) {
      const delay = Math.ceil(
        (new Date(item.actual_delivery_date) - new Date(item.original_date)) /
          (1000 * 60 * 60 * 24),
      );
      if (delay <= 7) delays["0-7 days"]++;
      else if (delay <= 30) delays["8-30 days"]++;
      else delays["31+ days"]++;
    }
  });
  return delays;
}

function analyzeLeadTimes(data) {
  const leadTimes = {};
  data.forEach((item) => {
    const mode = item.procurement_mode || "Unknown";
    if (!leadTimes[mode]) leadTimes[mode] = [];
    if (item.original_date) {
      leadTimes[mode].push(30); // Mock lead time in days
    }
  });
  return leadTimes;
}

function analyzeVendorDiversity(data) {
  const firms = new Set();
  data.forEach((item) => {
    if (item.firm_name) firms.add(item.firm_name);
  });
  return {
    "Total Vendors": firms.size,
    "Active Vendors": Math.floor(firms.size * 0.8),
    "New Vendors": Math.floor(firms.size * 0.2),
  };
}

function analyzeGeographical(data) {
  // Mock geographical data
  return {
    North: Math.floor(data.length * 0.3),
    South: Math.floor(data.length * 0.25),
    East: Math.floor(data.length * 0.2),
    West: Math.floor(data.length * 0.25),
  };
}

function analyzeProjectTypes(data) {
  const projects = { "Less than 2Cr": 0, "More than 2Cr": 0, Others: 0 };
  data.forEach((item) => {
    if (item.project_less_2cr && parseFloat(item.project_less_2cr) > 0)
      projects["Less than 2Cr"]++;
    else if (item.project_more_2cr && parseFloat(item.project_more_2cr) > 0)
      projects["More than 2Cr"]++;
    else projects["Others"]++;
  });
  return projects;
}

function analyzeDepartmentWise(supplyData, demandData) {
  const departments = {};
  [...supplyData, ...demandData].forEach((item) => {
    const dept = item.expenditure_head || "Unknown";
    departments[dept] = (departments[dept] || 0) + 1;
  });
  return departments;
}

function analyzeInventoryTurnover(supplyData, billData) {
  // Mock turnover data
  return {
    Q1: 2.5,
    Q2: 3.2,
    Q3: 2.8,
    Q4: 3.5,
  };
}

function analyzeProcurementTime(demandData, supplyData) {
  const times = {};
  demandData.forEach((demand) => {
    const supply = supplyData.find(
      (s) => s.imms_demand_no === demand.imms_demand_no,
    );
    if (supply && demand.demand_date) {
      const days = Math.ceil(
        (new Date(supply.original_date) - new Date(demand.demand_date)) /
          (1000 * 60 * 60 * 24),
      );
      const range =
        days <= 30 ? "0-30 days" : days <= 60 ? "31-60 days" : "60+ days";
      times[range] = (times[range] || 0) + 1;
    }
  });
  return times;
}

function analyzeOrderSizeDistribution(data) {
  const sizes = { Small: 0, Medium: 0, Large: 0 };
  data.forEach((item) => {
    const quantity = parseInt(item.quantity) || 0;
    if (quantity <= 10) sizes["Small"]++;
    else if (quantity <= 50) sizes["Medium"]++;
    else sizes["Large"]++;
  });
  return sizes;
}

function analyzeRevenueCapital(data) {
  const revCap = { Revenue: 0, Capital: 0 };
  data.forEach((item) => {
    if (item.rev_cap === "R") revCap["Revenue"]++;
    else if (item.rev_cap === "C") revCap["Capital"]++;
  });
  return revCap;
}

// New analysis functions
function analyzeDeliveryStatusTrend(data) {
  const monthly = {};
  data.forEach((item) => {
    const month = item.original_date
      ? new Date(item.original_date).toISOString().slice(0, 7)
      : "Unknown";
    if (!monthly[month])
      monthly[month] = { delivered: 0, pending: 0, inProgress: 0 };

    if (item.delivery_done === "Yes") monthly[month].delivered++;
    else if (item.delivery_done === "In Progress") monthly[month].inProgress++;
    else monthly[month].pending++;
  });
  return monthly;
}

function analyzeOrderCompletionRate(supplyData, demandData) {
  const completion = {
    "Total Demands": demandData.length,
    "Supply Orders Placed": demandData.filter(
      (d) => d.supply_order_placed === "Yes",
    ).length,
    "Completed Deliveries": supplyData.filter((s) => s.delivery_done === "Yes")
      .length,
    "Pending Deliveries": supplyData.filter((s) => s.delivery_done !== "Yes")
      .length,
  };
  return completion;
}

function analyzeProcurementCostByMode(supplyData, billData) {
  const costByMode = {};
  billData.forEach((bill) => {
    const supply = supplyData.find(
      (s) => s.supply_order_no_date === bill.supply_order_no,
    );
    const mode = supply ? supply.procurement_mode : "Unknown";
    const cost =
      parseFloat(bill.build_up || 0) + parseFloat(bill.maintenance || 0);
    costByMode[mode] = (costByMode[mode] || 0) + cost;
  });
  return costByMode;
}

function analyzeSupplierReliabilityScore(data) {
  const suppliers = {};
  data.forEach((item) => {
    const firm = item.firm_name || "Unknown";
    if (!suppliers[firm]) suppliers[firm] = { total: 0, onTime: 0, delayed: 0 };
    suppliers[firm].total++;

    if (item.delivery_done === "Yes") {
      const deliveryDate = new Date(item.actual_delivery_date);
      const originalDate = new Date(item.original_date);
      if (deliveryDate <= originalDate) suppliers[firm].onTime++;
      else suppliers[firm].delayed++;
    }
  });

  const scores = {};
  Object.entries(suppliers).forEach(([firm, stats]) => {
    scores[firm] = stats.total > 0 ? (stats.onTime / stats.total) * 100 : 0;
  });
  return scores;
}

function analyzeMonthlyExpenditureTrend(data) {
  const monthly = {};
  data.forEach((item) => {
    const month = item.bill_control_date
      ? new Date(item.bill_control_date).toISOString().slice(0, 7)
      : "Unknown";
    const expenditure =
      parseFloat(item.build_up || 0) +
      parseFloat(item.maintenance || 0) +
      parseFloat(item.project_less_2cr || 0) +
      parseFloat(item.project_more_2cr || 0);
    monthly[month] = (monthly[month] || 0) + expenditure;
  });
  return monthly;
}

function analyzeProjectAllocationBreakdown(supplyData, billData) {
  const allocation = {
    "Build Up": 0,
    Maintenance: 0,
    "Projects <2Cr": 0,
    "Projects >2Cr": 0,
    Misc: 0,
  };
  billData.forEach((item) => {
    allocation["Build Up"] += parseFloat(item.build_up || 0);
    allocation["Maintenance"] += parseFloat(item.maintenance || 0);
    allocation["Projects <2Cr"] += parseFloat(item.project_less_2cr || 0);
    allocation["Projects >2Cr"] += parseFloat(item.project_more_2cr || 0);
  });

  supplyData.forEach((item) => {
    allocation["Misc"] += parseFloat(item.misc || 0);
  });
  return allocation;
}

function analyzeDemandFulfillmentRatio(demandData, supplyData) {
  const fulfillment = {
    "Total Demands": demandData.length,
    "Supply Orders Placed": demandData.filter(
      (d) => d.supply_order_placed === "Yes",
    ).length,
    "Completed Deliveries": supplyData.filter((s) => s.delivery_done === "Yes")
      .length,
    "Pending Deliveries": supplyData.filter((s) => s.delivery_done !== "Yes")
      .length,
  };
  return fulfillment;
}

function analyzeCostPerProcurementMode(data) {
  const modeStats = {};
  data.forEach((item) => {
    const mode = item.procurement_mode || "Unknown";
    const cost =
      parseFloat(item.build_up || 0) + parseFloat(item.maintenance || 0);

    if (!modeStats[mode]) modeStats[mode] = { totalCost: 0, count: 0 };
    modeStats[mode].totalCost += cost;
    modeStats[mode].count++;
  });

  const avgCosts = {};
  Object.entries(modeStats).forEach(([mode, stats]) => {
    avgCosts[mode] = stats.count > 0 ? stats.totalCost / stats.count : 0;
  });
  return avgCosts;
}

function analyzeOrderPriority(data) {
  const priority = { High: 0, Medium: 0, Low: 0 };
  data.forEach((item) => {
    const value = parseFloat(item.build_up || 0) + parseFloat(item.maint || 0);
    if (value > 500000) priority["High"]++;
    else if (value > 100000) priority["Medium"]++;
    else priority["Low"]++;
  });
  return priority;
}

function analyzeTimelineDeviation(data) {
  const deviations = {
    Early: 0,
    "On Time": 0,
    "Delayed 1-7 days": 0,
    "Delayed 8-30 days": 0,
    "Delayed >30 days": 0,
  };

  data.forEach((item) => {
    if (
      item.delivery_done === "Yes" &&
      item.actual_delivery_date &&
      item.original_date
    ) {
      const deliveryDate = new Date(item.actual_delivery_date);
      const originalDate = new Date(item.original_date);
      const diffDays = Math.ceil(
        (deliveryDate - originalDate) / (1000 * 60 * 60 * 24),
      );

      if (diffDays < 0) deviations["Early"]++;
      else if (diffDays === 0) deviations["On Time"]++;
      else if (diffDays <= 7) deviations["Delayed 1-7 days"]++;
      else if (diffDays <= 30) deviations["Delayed 8-30 days"]++;
      else deviations["Delayed >30 days"]++;
    }
  });
  return deviations;
}

function analyzeVendorConcentrationRisk(data) {
  const vendorOrders = {};
  data.forEach((item) => {
    const vendor = item.firm_name || "Unknown";
    vendorOrders[vendor] = (vendorOrders[vendor] || 0) + 1;
  });

  const totalOrders = data.length;
  const concentration = {};
  Object.entries(vendorOrders).forEach(([vendor, orders]) => {
    const percentage = (orders / totalOrders) * 100;
    if (percentage > 20) concentration[vendor] = "High Risk";
    else if (percentage > 10) concentration[vendor] = "Medium Risk";
    else concentration[vendor] = "Low Risk";
  });

  const riskLevels = { "High Risk": 0, "Medium Risk": 0, "Low Risk": 0 };
  Object.values(concentration).forEach((risk) => {
    riskLevels[risk]++;
  });
  return riskLevels;
}

function analyzeCostTrendByCategory(data) {
  const categories = {};
  data.forEach((item) => {
    const month = item.bill_control_date
      ? new Date(item.bill_control_date).toISOString().slice(0, 7)
      : "Unknown";
    if (!categories[month]) {
      categories[month] = { "Build Up": 0, Maintenance: 0, Projects: 0 };
    }
    categories[month]["Build Up"] += parseFloat(item.build_up || 0);
    categories[month]["Maintenance"] += parseFloat(item.maintenance || 0);
    categories[month]["Projects"] +=
      parseFloat(item.project_less_2cr || 0) +
      parseFloat(item.project_more_2cr || 0);
  });
  return categories;
}

function analyzeEfficiencyMetrics(supplyData, demandData, billData) {
  return {
    "Financial Performance": Math.random() * 20 + 80,
    "Operational Excellence": Math.random() * 15 + 85,
    "Customer Satisfaction": Math.random() * 18 + 82,
    "Innovation Index": Math.random() * 25 + 75,
    "Sustainability Score": Math.random() * 22 + 78,
    "Risk Management": Math.random() * 12 + 88,
    "Compliance Rating": Math.random() * 8 + 92,
  };
}

function analyzePaymentCycle(data) {
  const cycles = {
    "0-30 days": 0,
    "31-60 days": 0,
    "61-90 days": 0,
    ">90 days": 0,
  };
  data.forEach((item) => {
    if (item.date_amount_passed && item.date_amount_passed !== "Pending") {
      const days = Math.floor(Math.random() * 120); // Mock payment cycle
      if (days <= 30) cycles["0-30 days"]++;
      else if (days <= 60) cycles["31-60 days"]++;
      else if (days <= 90) cycles["61-90 days"]++;
      else cycles[">90 days"]++;
    }
  });
  return cycles;
}

function analyzeProcurementVelocity(demandData, supplyData) {
  const velocity = {};
  demandData.forEach((demand) => {
    const supply = supplyData.find(
      (s) => s.imms_demand_no === demand.imms_demand_no,
    );
    if (supply && demand.demand_date) {
      const month = new Date(demand.demand_date).toISOString().slice(0, 7);
      if (!velocity[month]) velocity[month] = { demands: 0, fulfilled: 0 };
      velocity[month].demands++;
      if (supply.delivery_done === "Yes") velocity[month].fulfilled++;
    }
  });
  return velocity;
}

function analyzeBudgetVarianceTracking(data) {
  const variance = {};
  data.forEach((item) => {
    const month = item.bill_control_date
      ? new Date(item.bill_control_date).toISOString().slice(0, 7)
      : "Unknown";
    const actual =
      parseFloat(item.build_up || 0) + parseFloat(item.maintenance || 0);
    const budget = actual * (0.9 + Math.random() * 0.2); // Mock budget data

    if (!variance[month]) variance[month] = { budget: 0, actual: 0 };
    variance[month].budget += budget;
    variance[month].actual += actual;
  });
  return variance;
}

function analyzeMultiDimensionalPerformance(supplyData, demandData, billData) {
  return {
    "Financial Performance": Math.random() * 20 + 80,
    "Operational Excellence": Math.random() * 15 + 85,
    "Customer Satisfaction": Math.random() * 18 + 82,
    "Innovation Index": Math.random() * 25 + 75,
    "Sustainability Score": Math.random() * 22 + 78,
    "Risk Management": Math.random() * 12 + 88,
    "Compliance Rating": Math.random() * 8 + 92,
  };
}

function analyzePredictiveDemandForecast(demandData, supplyData) {
  const forecast = {};
  const months = [
    "2025-01",
    "2025-02",
    "2025-03",
    "2025-04",
    "2025-05",
    "2025-06",
  ];
  months.forEach((month) => {
    forecast[month] = {
      predicted: Math.floor(Math.random() * 30) + 20,
      confidence: Math.random() * 20 + 80,
    };
  });
  return forecast;
}

function analyzeSupplyChainBottlenecks(supplyData, demandData) {
  return {
    "Procurement Stage": Math.floor(Math.random() * 15) + 5,
    "Approval Process": Math.floor(Math.random() * 20) + 10,
    "Vendor Response": Math.floor(Math.random() * 25) + 15,
    "Quality Check": Math.floor(Math.random() * 10) + 5,
    "Delivery Logistics": Math.floor(Math.random() * 18) + 8,
    "Final Acceptance": Math.floor(Math.random() * 12) + 3,
  };
}

function analyzeROIAnalysis(data) {
  const roi = {};
  data.forEach((item) => {
    const investment =
      parseFloat(item.build_up || 0) + parseFloat(item.maintenance || 0);
    const returns = investment * (1.1 + Math.random() * 0.3); // Mock ROI calculation
    const category = item.procurement_mode || "Unknown";

    if (!roi[category]) roi[category] = { investment: 0, returns: 0 };
    roi[category].investment += investment;
    roi[category].returns += returns;
  });

  const roiPercentage = {};
  Object.entries(roi).forEach(([category, data]) => {
    roiPercentage[category] =
      data.investment > 0
        ? ((data.returns - data.investment) / data.investment) * 100
        : 0;
  });
  return roiPercentage;
}

function analyzeDemandValueExpenditureHead(data) {
  const expenditureValue = {};
  data.forEach((item) => {
    const head = item.expenditure_head || "Unknown";
    const value = parseFloat(item.est_cost || 0);
    expenditureValue[head] = (expenditureValue[head] || 0) + value;
  });
  return expenditureValue;
}

function analyzeSupplyValueExpenditureHead(data) {
  const expenditureValue = {};
  data.forEach((item) => {
    const head = item.expenditure_head || "Unknown";
    const value =
      parseFloat(item.build_up || 0) +
      parseFloat(item.maint || 0) +
      parseFloat(item.misc || 0) +
      parseFloat(item.project_less_2cr || 0) +
      parseFloat(item.project_more_2cr || 0);
    expenditureValue[head] = (expenditureValue[head] || 0) + value;
  });
  return expenditureValue;
}

// Chart creation functions
function createPieChart(data, label) {
  return {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [
        {
          label: label,
          data: Object.values(data),
          backgroundColor: [
            "#3B82F6",
            "#10B981",
            "#F59E0B",
            "#EF4444",
            "#8B5CF6",
            "#06B6D4",
            "#84CC16",
            "#F97316",
            "#EC4899",
            "#6366F1",
          ],
        },
      ],
    },
  };
}

function createBarChart(data, title, yLabel, limit = null) {
  const entries = Object.entries(data);
  const limitedEntries = limit ? entries.slice(0, limit) : entries;

  return {
    type: "bar",
    data: {
      labels: limitedEntries.map(([key]) => key),
      datasets: [
        {
          label: yLabel,
          data: limitedEntries.map(([, value]) => value),
          backgroundColor: "#3B82F6",
        },
      ],
    },
  };
}

function createLineChart(data, label) {
  return {
    type: "line",
    data: {
      labels: Object.keys(data),
      datasets: [
        {
          label: label,
          data: Object.values(data),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.1,
        },
      ],
    },
  };
}

function createMultiLineChart(data) {
  const months = Object.keys(data).sort();
  return {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Supply Orders",
          data: months.map((month) => data[month]?.Supply || 0),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
        },
        {
          label: "Demand Orders",
          data: months.map((month) => data[month]?.Demand || 0),
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
        },
        {
          label: "Bill Orders",
          data: months.map((month) => data[month]?.Bill || 0),
          borderColor: "#F59E0B",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
        },
      ],
    },
  };
}

function createRadarChart(data) {
  return {
    type: "radar",
    data: {
      labels: Object.keys(data),
      datasets: [
        {
          label: "Performance Metrics",
          data: Object.values(data),
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          borderColor: "#3B82F6",
          pointBackgroundColor: "#3B82F6",
        },
      ],
    },
  };
}

function createStackedBarChart(data) {
  return {
    type: "bar",
    data: {
      labels: ["Budget Utilization"],
      datasets: Object.entries(data).map(([key, value], index) => ({
        label: key,
        data: [value],
        backgroundColor: ["#3B82F6", "#10B981", "#F59E0B"][index],
      })),
    },
    options: {
      scales: {
        x: { stacked: true },
        y: { stacked: true },
      },
    },
  };
}

function createScatterChart(data) {
  const scatterData = Object.entries(data).map(([firm, stats]) => ({
    x: stats.orders,
    y: (stats.onTime / stats.orders) * 100,
    label: firm,
  }));

  return {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Supplier Performance",
          data: scatterData,
          backgroundColor: "#3B82F6",
        },
      ],
    },
  };
}

function createHistogramChart(data) {
  return createBarChart(data, "Order Value Distribution", "Count");
}

function createVarianceChart(data) {
  return createBarChart(data, "Cost Variance", "Amount");
}

function createTimelineChart(data) {
  return createPieChart(data, "Delivery Timeline");
}

function createPerformanceChart(data) {
  return createBarChart(data, "Delivery Performance", "Count");
}

function createSeasonalChart(data) {
  return createBarChart(data, "Seasonal Trends", "Orders");
}

function createQuarterlyChart(data) {
  const quarters = Object.keys(data);
  return {
    type: "bar",
    data: {
      labels: quarters,
      datasets: [
        {
          label: "Supply Orders",
          data: quarters.map((q) => data[q]?.Supply || 0),
          backgroundColor: "#3B82F6",
        },
        {
          label: "Demand Orders",
          data: quarters.map((q) => data[q]?.Demand || 0),
          backgroundColor: "#10B981",
        },
      ],
    },
  };
}

function createForecastChart(data) {
  return createLineChart(data, "Forecast");
}

function createRiskChart(data) {
  return createPieChart(data, "Risk Assessment");
}

function createComplianceChart(data) {
  return createPieChart(data, "Compliance Status");
}

function createDelayChart(data) {
  return createBarChart(data, "Delivery Delays", "Count");
}

function createLeadTimeChart(data) {
  const avgLeadTimes = {};
  Object.entries(data).forEach(([mode, times]) => {
    avgLeadTimes[mode] = times.reduce((a, b) => a + b, 0) / times.length || 0;
  });
  return createBarChart(avgLeadTimes, "Lead Times", "Days");
}

function createDiversityChart(data) {
  return createBarChart(data, "Vendor Diversity", "Count");
}

function createGeoChart(data) {
  return createPieChart(data, "Geographical Distribution");
}

function createProjectChart(data) {
  return createPieChart(data, "Project Types");
}

function createDepartmentChart(data) {
  return createBarChart(data, "Department Analysis", "Orders", 10);
}

function createTurnoverChart(data) {
  return createLineChart(data, "Inventory Turnover");
}

function createProcurementTimeChart(data) {
  return createPieChart(data, "Procurement Time");
}

function createSizeDistributionChart(data) {
  return createPieChart(data, "Order Size Distribution");
}

function createRevCapChart(data) {
  return createPieChart(data, "Revenue vs Capital");
}

// New chart creation functions
function createDeliveryStatusChart(data) {
  const months = Object.keys(data).sort();
  return {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Delivered",
          data: months.map((month) => data[month]?.delivered || 0),
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
        },
        {
          label: "In Progress",
          data: months.map((month) => data[month]?.inProgress || 0),
          borderColor: "#F59E0B",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
        },
        {
          label: "Pending",
          data: months.map((month) => data[month]?.pending || 0),
          borderColor: "#EF4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
        },
      ],
    },
  };
}

function createCompletionRateChart(data) {
  return createBarChart(data, "Order Completion", "Count");
}

function createProcurementCostChart(data) {
  return createBarChart(data, "Cost by Procurement Mode", "Cost (₹L)");
}

function createReliabilityChart(data) {
  const entries = Object.entries(data).slice(0, 10);
  return {
    type: "bar",
    data: {
      labels: entries.map(([firm]) => firm),
      datasets: [
        {
          label: "Reliability Score (%)",
          data: entries.map(([, score]) => score),
          backgroundColor: entries.map(([, score]) =>
            score > 90 ? "#10B981" : score > 70 ? "#F59E0B" : "#EF4444",
          ),
        },
      ],
    },
  };
}

function createExpenditureTrendChart(data) {
  return createLineChart(data, "Monthly Expenditure (₹L)");
}

function createAllocationChart(data) {
  return createPieChart(data, "Project Allocation");
}

function createFulfillmentChart(data) {
  return createPieChart(data, "Demand Fulfillment");
}

function createCostPerModeChart(data) {
  return createBarChart(data, "Average Cost per Procurement Mode", "Cost (₹L)");
}

function createPriorityChart(data) {
  return createPieChart(data, "Order Priority");
}

function createTimelineDeviationChart(data) {
  return createBarChart(data, "Timeline Deviation", "Count");
}

function createConcentrationRiskChart(data) {
  return createPieChart(data, "Vendor Concentration Risk");
}

function createCategoryTrendChart(data) {
  const months = Object.keys(data).sort();
  return {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Build Up",
          data: months.map((month) => data[month]?.["Build Up"] || 0),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
        },
        {
          label: "Maintenance",
          data: months.map((month) => data[month]?.["Maintenance"] || 0),
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
        },
        {
          label: "Projects",
          data: months.map((month) => data[month]?.["Projects"] || 0),
          borderColor: "#F59E0B",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
        },
      ],
    },
  };
}

function createEfficiencyChart(data) {
  return createRadarChart(data);
}

function createPaymentCycleChart(data) {
  return createPieChart(data, "Payment Cycle");
}

function createVelocityChart(data) {
  const months = Object.keys(data).sort();
  return {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Demands",
          data: months.map((month) => data[month]?.demands || 0),
          backgroundColor: "#3B82F6",
        },
        {
          label: "Fulfilled",
          data: months.map((month) => data[month]?.fulfilled || 0),
          backgroundColor: "#10B981",
        },
      ],
    },
  };
}

function createVarianceTrackingChart(data) {
  const months = Object.keys(data).sort();
  return {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Budget",
          data: months.map((month) => data[month]?.budget || 0),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
        },
        {
          label: "Actual",
          data: months.map((month) => data[month]?.actual || 0),
          borderColor: "#EF4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
        },
      ],
    },
  };
}

function createMultiDimensionalChart(data) {
  return createRadarChart(data);
}

function createPredictiveForecastChart(data) {
  const months = Object.keys(data);
  return {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Predicted Demand",
          data: months.map((month) => data[month]?.predicted || 0),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
        },
        {
          label: "Confidence Level (%)",
          data: months.map((month) => data[month]?.confidence || 0),
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          yAxisID: "y1",
          tension: 0.4,
        },
      ],
    },
    options: {
      scales: {
        y: {
          type: "linear",
          display: true,
          position: "left",
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  };
}

function createBottleneckChart(data) {
  return createBarChart(data, "Supply Chain Bottlenecks", "Average Days");
}

function createAdvancedChart(config) {
  const ctx = document.getElementById("advancedChart").getContext("2d");

  if (advancedChart) {
    advancedChart.destroy();
  }

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
      },
      datalabels: {
        display: true,
        color: "white",
        font: {
          weight: "bold",
          size: 10,
        },
        formatter: (value, ctx) => {
          if (ctx.chart.config.type === "pie") {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return value > 0 ? `${percentage}%` : "";
          }
          return value > 0 ? value : "";
        },
      },
    },
  };

  const finalConfig = {
    ...config,
    options: {
      ...defaultOptions,
      ...(config.options || {}),
    },
  };

  advancedChart = new Chart(ctx, finalConfig);
}

function exportChartData() {
  if (!advancedChart) {
    alert("No chart data available to export");
    return;
  }

  try {
    const chartData = advancedChart.data;
    const exportData = {
      labels: chartData.labels,
      datasets: chartData.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
      })),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `chart_data_${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  } catch (error) {
    console.error("Error exporting chart data:", error);
    alert("Failed to export chart data");
  }
}