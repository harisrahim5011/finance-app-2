import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { useTransactions } from './TransactionContext';

/**
 * ExpenseList Component
 *
 * A comprehensive expense tracking and management component with dual-mode functionality.
 *
 * Features:
 * - Displays categorized income and expenses for the current billing cycle
 * - Shows budget utilization with progress bars and color-coded indicators
 * - Allows forwarding surplus balances to the next billing period
 * - Supports both calendar month and custom billing cycle modes
 *
 * Modes:
 * 1. View Mode (default):
 *    - Shows all categories with their income, expenses, and balances
 *    - Displays progress bar indicating percentage of budget remaining
 *    - Color-coded: Green (>50%), Yellow (15-50%), Red (<15%)
 *
 * 2. Forward Mode:
 *    - Toggles to select categories with positive balance
 *    - Forward button becomes active when categories are selected
 *    - Confirms action before proceeding
 *
 * Data Flow:
 * 1. Get cycle boundaries (calendar or custom) from context
 * 2. Filter transactions within cycle date range
 * 3. Calculate category summaries (income, expense, balance)
 * 4. Filter out empty categories
 * 5. Render dropdown menu with category list
 * 6. Handle user interactions (toggle, select, forward)
 *
 * @component
 * @returns {JSX.Element} Dropdown menu with expense list and forwarding options
 */
const ExpenseList = () => {
  // ==================== Context & State Management ====================
  // Get transaction data and cycle utilities from the transaction context
  const { 
    transactions,           // All transactions from Firestore
    currentMonth,          // Current month index (0-11)
    currentYear,           // Current year
    forwardSurplus,        // Function to forward balance to next period
    loading,               // Loading state during async operations
    getCycleBoundaries,    // Function to calculate cycle start/end dates
    cycleType,             // "calendar" or "custom" billing cycle
    formatCycleHeader      // Function to format cycle display text
  } = useTransactions();

  // ==================== Local UI State ====================
  // Controls dropdown menu visibility (open/closed)
  const [isOpen, setIsOpen] = useState(false);
  // Controls forwarding mode (selecting categories to forward vs viewing expenses)
  const [isForwarding, setIsForwarding] = useState(false);
  // List of category names selected for forwarding
  const [selectedCategories, setSelectedCategories] = useState([]);
  // Reference to dropdown container for click-outside detection
  const dropdownRef = useRef(null);

  // ==================== Data Computation & Filtering ====================
  /**
   * Get cycle boundaries from context
   * Returns start and end dates based on billing cycle type:
   * - Calendar: 1st to last day of current month
   * - Custom: custom start day (current month) to custom end day (next month)
   */
  const { start: cycleStart, end: cycleEnd } = getCycleBoundaries(currentMonth, currentYear);
  
  /**
   * Filter transactions to only those within the current cycle
   * Memoized to prevent recalculation on every render
   * Only recalculates when transactions or boundaries change
   */
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = t.date.toDate();
      return transactionDate >= cycleStart && transactionDate <= cycleEnd;
    });
  }, [transactions, cycleStart, cycleEnd]);

  /**
   * Normalize filtered transactions to array format
   * May come as array or object depending on Firestore query result
   */
  const transactionsArray = Array.isArray(filteredTransactions)
    ? filteredTransactions
    : Object.values(filteredTransactions || {});

  /**
   * Calculate summary for each category
   * Structure: { categoryName: { income: 0, expense: 0, balance: 0 } }
   * Balance = income - expense
   *
   * Memoized to prevent recalculation on every render
   * Only recalculates when transactions array changes
   */
  const categorySummary = useMemo(() => {
    return transactionsArray.reduce((acc, t) => {
      if (!t || typeof t.amount !== "number" || !t.category || !t.type) {
        return acc;
      }

      const { category, amount, type } = t;

      if (!acc[category]) {
        acc[category] = { income: 0, expense: 0, balance: 0 };
      }

      if (type === "income") {
        acc[category].income += amount;
        acc[category].balance += amount;
      } else if (type === "expense") {
        acc[category].expense += amount;
        acc[category].balance -= amount;
      }

      return acc;
    }, {});
  }, [transactionsArray]);

  /**
   * Build category list from summary
   * - Includes only categories with income or expense activity
   * - Adds id field for React key in lists
   * - Spreads summary data (income, expense, balance) for easy access
   *
   * Memoized to prevent recalculation on every render
   * Only recalculates when categorySummary changes
   */
  const expenseCategoriesList = useMemo(() => {
    return Object.keys(categorySummary)
      .filter(categoryName => 
        categorySummary[categoryName].income > 0 || 
        categorySummary[categoryName].expense > 0
      )
      .map(categoryName => ({
        name: categoryName,
        id: categoryName,
        ...categorySummary[categoryName],
      }));
  }, [categorySummary]);

  // ==================== Event Handlers ====================
  /**
   * Toggle dropdown menu open/closed state
   * When opening, reset forwarding mode and selected categories
   * Ensures clean state each time dropdown is opened
   */
  const toggleDropdown = () => {
    setIsOpen(prev => {
      if (!prev) {
        setIsForwarding(false);
        setSelectedCategories([]);
      }
      return !prev;
    });
  };

  /**
   * Toggle between View Mode and Forward Mode
   * - View Mode: Display all categories with progress bars
   * - Forward Mode: Allow selection of categories to forward surplus
   *
   * Stops event propagation to prevent triggering parent dropdown toggle
   * Clears selected categories when switching modes
   */
  const toggleForwarding = (e) => {
    e.stopPropagation();
    setIsForwarding(prev => !prev);
    setSelectedCategories([]);
  };

  /**
   * Add or remove a category from the forwarding selection list
   * Uses toggle logic: if category is selected, remove it; otherwise add it
   *
   * @param {string} categoryName - Name of category to toggle
   */
  const handleSelectCategory = (categoryName) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  /**
   * Execute the forward surplus operation
   *
   * Flow:
   * 1. Validate that at least one category is selected
   * 2. Calculate total amount to forward
   * 3. Show confirmation dialog with amount and count
   * 4. If confirmed: call forwardSurplus() from context
   * 5. Show success/error message
   * 6. Reset UI state (close dropdown, clear selections)
   *
   * @async
   * @returns {Promise<void>}
   */
  const handleForwardSelected = async () => {
    if (selectedCategories.length === 0) {
      alert("Please select at least one category to forward.");
      return;
    }

    // Calculate total balance of selected categories
    const totalAmount = selectedCategories.reduce(
      (sum, name) => sum + (categorySummary[name]?.balance || 0),
      0
    );

    // Confirm before proceeding (destructive operation)
    const isConfirmed = window.confirm(
      `Are you sure you want to forward QAR ${totalAmount.toFixed(2)} from ${selectedCategories.length} categories?`
    );

    if (!isConfirmed) return;

    // Prepare data in format expected by forwardSurplus function
    const surplusData = selectedCategories.map(name => ({
      categoryName: name,
      balance: categorySummary[name].balance 
    }));

    // Call context function to forward surplus
    const success = await forwardSurplus(surplusData);

    if (success) {
      alert(`Successfully forwarded QAR ${totalAmount.toFixed(2)} to the next budget period.`);
    } else {
      alert("Forwarding failed. The budget period may not be completed yet.");
    }

    // Reset UI state
    setIsOpen(false);
    setIsForwarding(false);
    setSelectedCategories([]);
  };

  // ==================== Click-Outside Detection ====================
  /**
   * Effect: Close dropdown when clicking outside
   * Handles user clicking outside the dropdown to dismiss it
   *
   * Implementation:
   * 1. Listen for mousedown events on document
   * 2. Check if click is outside the dropdown ref
   * 3. If outside: close dropdown and exit forwarding mode
   * 4. Clean up listener on unmount to prevent memory leaks
   *
   * Dependencies: [dropdownRef] - re-attach listener if ref changes (rare)
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsForwarding(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // ==================== Utility Functions ====================
  /**
   * Calculate the percentage of budget remaining for a category
   *
   * Formula:
   * - spentPercentage = (expense / income) × 100
   * - remainingPercentage = 100 - spentPercentage
   * - Clamped to minimum 0 (can't have negative remaining)
   *
   * @param {number} expense - Total expenses in category
   * @param {number} income - Total income/budget for category
   * @returns {number} Percentage of budget remaining (0-100)
   *
   * @example
   * calculatePercentageRemaining(25, 100) // returns 75 (75% remaining)
   * calculatePercentageRemaining(120, 100) // returns 0 (over budget)
   */
  const calculatePercentageRemaining = (expense, income) => {
    if (income === 0 || !income) return 0;
    const spentPercentage = (expense / income) * 100;
    const remainingPercentage = 100 - spentPercentage;
    return Math.max(0, remainingPercentage);
  };

  /**
   * Get progress bar color based on percentage remaining
   * Color-codes budget utilization for quick visual feedback
   *
   * Color scheme:
   * - Green: >50% remaining (comfortable)
   * - Yellow: 15-50% remaining (caution)
   * - Red: <15% remaining (alert)
   *
   * @param {number} percentageRemaining - Percentage of budget remaining
   * @returns {string} Tailwind CSS class name for progress bar color
   */
  const getProgressBarColor = (percentageRemaining) => {
    if (percentageRemaining > 50) return "bg-green-500";
    if (percentageRemaining > 15) return "bg-yellow-500";
    return "bg-red-500";
  };

  /**
   * Filter category list based on current mode
   * - View Mode: Show all categories with activity
   * - Forward Mode: Show only categories with positive balance (can be forwarded)
   */
  const renderedCategoriesList = isForwarding
    ? expenseCategoriesList.filter(category => category.balance > 0)
    : expenseCategoriesList;

  /**
   * Display indicator showing which billing cycle is active
   * - "📅 Calendar" for calendar month mode
   * - "⚙️ Custom" for custom billing cycle mode
   */
  const cycleIndicator = cycleType === "calendar" ? "📅 Calendar" : "⚙️ Custom";

  // ==================== Component Render ====================
  return (
    // Dropdown container with relative positioning for absolute-positioned menu
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        {/* Dropdown Toggle Button */}
        {/* Shows cycle type and current mode (View or Forward)
            Displays chevron icon to indicate open/closed state
            Disabled while async operations are loading */}
        <button
          type="button"
          className="inline-flex justify-center items-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-in-out"
          id="menu-button"
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={toggleDropdown}
          disabled={loading}
        >
          {/* Button text changes based on mode */}
          {isForwarding ? "Select Funds to Forward" : `Expense List - ${cycleIndicator}`}
          {/* Chevron icon rotates based on open state */}
          {isOpen ? (
            <ChevronUp className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Dropdown Menu Container */}
      {/* Only renders when isOpen is true
          Positioned absolutely, offset from button
          Centered horizontally using transform
          Scrollable content area with max height */}
      {isOpen && (
        <div
          className="origin-top-right absolute mt-2 w-[95vw] max-w-xl left-1/2 transform -translate-x-1/2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in z-20"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex="-1"
        >
          {/* Toolbar Section: Mode Toggle and Actions */}
          {/* Shows different buttons based on current mode */}
          <div className="p-2 border-b border-gray-200 flex justify-between items-center">
            {isForwarding ? (
              // Forward Mode: Submit button (enabled only when categories selected)
              <button
                onClick={handleForwardSelected}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors 
                    ${selectedCategories.length > 0 && !loading ? "text-white bg-blue-600 hover:bg-blue-700" : "text-gray-500 bg-gray-100 cursor-not-allowed"}`}
                disabled={selectedCategories.length === 0 || loading}
              >
                {loading ? 'Processing...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Forward Selected ({selectedCategories.length})
                  </>
                )}
              </button>
            ) : (
              // View Mode: Forward Surplus button to switch to forward mode
              <button
                onClick={toggleForwarding}
                className="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium rounded-md transition-colors"
              >
                <Send className="w-4 h-4 mr-2" />
                Forward Surplus
              </button>
            )}

            {/* Cancel button visible only in Forward Mode */}
            {isForwarding && (
              <button
                onClick={toggleForwarding}
                className="text-gray-500 hover:text-red-600 text-sm font-medium px-2"
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Cycle Information Header */}
          {/* Displays the current billing cycle date range */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600 font-medium">
            Period: {formatCycleHeader(currentMonth, currentYear)}
          </div>

          {/* Categories List */}
          {/* Scrollable area with category items
              max-h-60 limits height, overflow-y-auto enables scrolling */}
          <div className="py-1 max-h-60 overflow-y-auto" role="none">
            {/* Empty State Message */}
            {renderedCategoriesList.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">
                {isForwarding
                  ? "No categories have a positive balance to forward."
                  : "No activity recorded for this period."}
              </div>
            ) : (
              // Category Item List
              renderedCategoriesList.map((category) => {
                // Calculate budget utilization percentage
                const percentageRemaining = calculatePercentageRemaining(
                  category.expense,
                  category.income
                );
                const progressBarWidth = percentageRemaining;
                const progressBarColor = getProgressBarColor(percentageRemaining);
                const balance = category.balance;
                const isChecked = selectedCategories.includes(category.name);

                return (
                  <div
                    key={category.id}
                    className={`px-4 py-2 text-sm rounded-md mx-1 my-0.5 ${isForwarding ? 'hover:bg-blue-50' : 'hover:bg-gray-100'}`}
                    role="menuitem"
                    tabIndex="-1"
                  >
                    <label className="flex justify-between items-center cursor-pointer w-full">
                      {/* Checkbox visible only in Forward Mode */}
                      {isForwarding && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectCategory(category.name)}
                          className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={loading}
                        />
                      )}

                      {/* Category Details Section */}
                      <div className="flex-grow">
                        {/* Category Name and Income/Expense Summary */}
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-gray-700">{category.name}</span>
                          <span className="text-xs text-gray-500">
                            Exp: QAR {category.expense.toFixed(2)} / Inc: QAR {category.income.toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Progress Bar (visible in View Mode only) */}
                        {!isForwarding && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-full rounded-full ${progressBarColor}`}
                              style={{ width: `${progressBarWidth}%` }}
                            ></div>
                          </div>
                        )}
                        
                        {/* Bottom Row: Percentage Remaining and Balance */}
                        <div className="flex justify-between items-center mt-1">
                          <div className="text-xs text-gray-600">
                            {percentageRemaining.toFixed(0)}% Remaining
                          </div>
                          {/* Balance color coded: red if negative (over budget), green if positive */}
                          <div className={`text-xs font-semibold ${balance < 0 ? "text-red-500" : "text-green-600"}`}>
                            Balance: QAR {balance.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;