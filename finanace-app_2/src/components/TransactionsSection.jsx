import React from "react";
import { useTransactions } from "../components/TransactionContext"; // Custom hook to access transaction-related state and functions

/**
 * TransactionsSection Component
 *
 * Purpose:
 * Displays a comprehensive list of all financial transactions for a selected day.
 * Allows users to:
 * - View daily transactions with category, date, and amount
 * - Navigate between days using previous/next buttons or date picker
 * - Filter transactions by specific day within the current month
 * - Delete individual transactions with confirmation
 * - See descriptions (notes) for each transaction if available
 *
 * Key Features:
 * - Day-by-day transaction filtering (not cumulative by month)
 * - Date picker restricted to current month boundaries
 * - Color-coded by transaction type (green=income, red=expense)
 * - Scrollable list for many daily transactions
 * - Confirmation modal before deletion
 * - Responsive design (mobile-friendly date input width)
 * - Accessibility labels for screen readers
 *
 * Data Flow:
 * 1. User selects/navigates to a specific day
 * 2. Component filters all transactions to match that day (00:00 to 23:59:59.999)
 * 3. Displays filtered transactions in chronological order (newest first)
 * 4. User can delete transaction → shows confirmation → updates state
 *
 * Props:
 * @param {object} props - Component props
 * @param {function} props.showConfirm - Modal function: showConfirm(message, onConfirmCallback)
 *                                       Displays confirmation dialog before deletion
 * @param {function} props.showMessage - Modal function: showMessage(message, isError?)
 *                                       Displays success/error messages
 *
 * Dependencies:
 * - useTransactions: Provides transactions, date state, deleteTransaction, changeDay
 * - TransactionContext: Global transaction state management
 * - Modal components: Confirmation and message modals from parent
 *
 * Usage Example:
 * ```jsx
 * <TransactionsSection 
 *   showConfirm={handleConfirm}
 *   showMessage={handleMessage}
 * />
 * 
 * // Shows:
 * // [< Previous Day | [Date Picker] | Next Day >]
 * // Daily Transactions
 * // [Income: Food - 50 QAR] [Income: Salary - 5000 QAR]
 * // [Expense: Gas - 30 QAR]
 * ```
 */
const TransactionsSection = ({ showConfirm, showMessage }) => {
  // ==================== Context Data ====================
  // Destructure necessary state and functions from the useTransactions hook.
  // These provide access to all transaction data and navigation functions.
  //
  // Data Retrieved:
  // - transactions: Complete array of all user's transactions (from Firestore)
  // - currentMonth: 0-indexed month (0=Jan, 11=Dec) from context
  // - currentYear: Full year number (e.g., 2024, 2025)
  // - currentDay: Selected day of month (1-31)
  //
  // Functions Retrieved:
  // - deleteTransaction(id): Async function to remove transaction from Firestore
  // - changeDay(delta): Update day state (delta = -1 or +1 or any number)
  //
  // Used together to: Filter transactions by selected day and enable deletion
  const {
    transactions,
    currentMonth,
    currentYear,
    currentDay,
    deleteTransaction,
    changeDay,
  } = useTransactions();

  // ==================== Date Calculation & Formatting ====================
  // Create a Date object representing the currently selected day
  // Used for: date picker value, day filtering, min/max constraints
  const currentSelectedDate = new Date(currentYear, currentMonth, currentDay);

  // ========== Date Components for Input Formatting ==========
  // Extract year, month, and day from the selected date
  // Must be formatted as "YYYY-MM-DD" (ISO format) for HTML date input
  const year = currentSelectedDate.getFullYear();
  // Month is 0-indexed in JavaScript: 0=Jan, 11=Dec
  // Add 1 and pad with leading zero: 1-12 becomes "01"-"12"
  const month = String(currentSelectedDate.getMonth() + 1).padStart(2, "0");
  // Day is 1-31, pad with leading zero: 1-31 becomes "01"-"31"
  const day = String(currentSelectedDate.getDate()).padStart(2, "0");

  // ISO format date string for HTML date input
  // Format: "YYYY-MM-DD" e.g., "2024-03-15"
  // Example: year=2024, month=03, day=15 → "2024-03-15"
  const formattedDateForInput = `${year}-${month}-${day}`;

  // ========== Month Boundary Constraints for Date Picker ==========
  // Restrict date picker to current month only (prevent selecting other months)
  // This ensures transactions are always within the displayed month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  // Get last day of month by using day 0 of next month:
  // new Date(2024, 3, 0) = last day of March 2024 = March 31
  const lastDayOfMonthNumber = new Date(currentYear, currentMonth + 1, 0);
  const lastDayOfMonth = lastDayOfMonthNumber.getDate(); // Extract day number (1-31)

  // Min date: First day of current month (ISO format)
  const minDateForInput = firstDayOfMonth.toISOString().split("T")[0];
  // Max date: Last day of current month (converted to ISO format)
  // Formula: new Date(year, month, day) → convert to ISO → extract date part
  const maxDateForInput = new Date(currentYear, currentMonth, lastDayOfMonth)
    .toISOString()
    .split("T")[0];

  // ==================== Daily Transaction Filtering ====================
  // Filter the complete transactions list to show only those matching the current day
  // This component shows DAILY transactions, not cumulative monthly data
  //
  // Why filter by exact 24-hour period?
  // - Multiple transactions can occur on same day
  // - Precise boundaries (00:00:00 to 23:59:59.999) ensure no overlap/gaps
  // - Handles Firestore Timestamp precision correctly
  //
  // Day Boundaries:
  // - dayStart: First millisecond of the day (00:00:00.000)
  // - dayEnd: Last millisecond of the day (23:59:59.999)
  // Only transactions with date >= dayStart AND <= dayEnd are included
  const dayStart = new Date(currentYear, currentMonth, currentDay, 0, 0, 0, 0);
  // Start of day: 00:00:00.000
  
  const dayEnd = new Date(
    currentYear,
    currentMonth,
    currentDay,
    23,
    59,
    59,
    999
  );
  // End of day: 23:59:59.999
  // Why 999ms? Firestore timestamps can have millisecond precision
  // 999 ensures we capture all milliseconds before next second

  // Filter transactions for the current day
  // Process:
  // 1. Loop through all transactions
  // 2. Convert Firestore Timestamp to JavaScript Date
  // 3. Check if date falls within dayStart → dayEnd range
  // 4. Include only matching transactions
  //
  // Example:
  // Transaction 1: 2024-03-15 09:30:00 → INCLUDED
  // Transaction 2: 2024-03-15 14:45:30 → INCLUDED
  // Transaction 3: 2024-03-14 23:50:00 → EXCLUDED (previous day)
  // Transaction 4: 2024-03-16 01:00:00 → EXCLUDED (next day)
  const filteredTransactions = transactions.filter((t) => {
    const transactionDate = t.date.toDate(); // Convert Firestore Timestamp to JavaScript Date
    // Check if transaction falls within the current day's 24-hour window
    return transactionDate >= dayStart && transactionDate <= dayEnd;
  });

  // ==================== Event Handlers ====================

  /**
   * handleDateChange(e)
   * 
   * Purpose:
   * Triggered when user selects a new date using the HTML date input picker.
   * Calculates the day difference and updates the global day state via context.
   * 
   * Process:
   * 1. Get selected date from input (ISO format: "YYYY-MM-DD")
   * 2. Parse into JavaScript Date object
   * 3. Calculate millisecond difference from current selected date
   * 4. Convert to days (divide by milliseconds per day: 1000ms * 60s * 60m * 24h)
   * 5. Call changeDay(diffDays) to update context state
   * 6. Component re-renders with new filtered transactions
   * 
   * Example:
   * Current: March 15, 2024
   * User selects: March 18, 2024
   * Difference: 3 days
   * Result: changeDay(3) → currentDay becomes 18
   * 
   * Why use setHours(0,0,0,0)?
   * - Normalizes time to midnight (00:00:00)
   * - Eliminates timezone issues that could skew day calculation
   * - Ensures accurate day-to-day difference regardless of local time
   * 
   * @param {object} e - React SyntheticEvent from date input onChange
   */
  const handleDateChange = (e) => {
    const selectedDateString = e.target.value; // Get selected date string (e.g., "2025-03-15")
    const newlySelectedDate = new Date(selectedDateString); // Parse to Date object

    // Calculate day difference by comparing midnight timestamps
    // setHours(0,0,0,0) sets time to 00:00:00 for accurate day calculation
    const diffTime =
      newlySelectedDate.setHours(0, 0, 0, 0) -
      currentSelectedDate.setHours(0, 0, 0, 0);
    
    // Convert millisecond difference to days
    // 1000 ms/sec * 60 sec/min * 60 min/hour * 24 hour/day = 86,400,000 ms/day
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Update currentDay in context via changeDay function
    // This triggers a component re-render with new filtered transactions
    changeDay(diffDays);
  };

  /**
   * handleDelete(id)
   * 
   * Purpose:
   * Handles transaction deletion with user confirmation and feedback.
   * Displays confirmation modal, performs deletion, and shows result message.
   * 
   * Process:
   * 1. User clicks delete button for a transaction
   * 2. Display confirmation modal (prevents accidental deletion)
   * 3. If user confirms:
   *    a. Call deleteTransaction(id) from context
   *    b. Show success message if successful
   *    c. Show error message if failed
   * 4. If user cancels: do nothing
   * 
   * User Feedback:
   * - Before: Confirmation modal asking for consent
   * - Success: "Transaction deleted successfully." message
   * - Failure: "Failed to delete transaction." error message (red)
   * 
   * @param {string} id - Firestore document ID of transaction to delete
   */
  const handleDelete = (id) => {
    // Display confirmation modal to prevent accidental deletion
    // Callback function runs only if user confirms
    showConfirm(
      "Are you sure you want to delete this transaction?",
      async () => {
        // User confirmed deletion - attempt to delete from Firestore
        const success = await deleteTransaction(id);
        
        // Show appropriate feedback message
        if (success) {
          // Success message (green by default)
          showMessage("Transaction deleted successfully.");
        } else {
          // Error message (red - second parameter true indicates error)
          showMessage("Failed to delete transaction.", true);
        }
      }
    );
  };

  // ==================== Component Render ====================
  return (
    <section>
      {/* ============ Day Navigation & Date Picker ============ */}
      {/* Navigation bar for switching between days and selecting specific dates
          - Previous/Next buttons for day-by-day navigation
          - Date picker (HTML input) for direct date selection
          - Restricted to current month boundaries */}
      <div className="flex justify-between items-center mb-4">
        
        {/* Previous Day Button */}
        {/* Navigates to previous day (currentDay - 1)
            - Wraps from day 1 to last day of previous month
            - Rounded button with hover effect for better UX
            - SVG left chevron icon for visual clarity */}
        <button
          onClick={() => changeDay(-1)}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Previous Day"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6 text-gray-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>

        {/* Date Picker Input */}
        {/* HTML date input for direct date selection
            Features:
            - value: Displays currently selected date (YYYY-MM-DD format)
            - onChange: Triggers handleDateChange when date selected
            - min: Restricts to first day of current month
            - max: Restricts to last day of current month
            - Prevents selecting outside current month view
            
            Styling:
            - w-36 sm:w-48: Responsive width (narrow on mobile, wider on desktop)
            - Centered text with border and focus ring
            - font-semibold for better readability */}
        <input
          type="date"
          value={formattedDateForInput}
          onChange={handleDateChange}
          min={minDateForInput}
          max={maxDateForInput}
          className="p-2 border border-gray-300 rounded-lg text-center font-semibold text-gray-700 focus:ring-blue-500 focus:border-blue-500 w-36 sm:w-48"
          aria-label="Select Date"
        />

        {/* Next Day Button */}
        {/* Navigates to next day (currentDay + 1)
            - Wraps from last day of month to day 1 of next month
            - Same styling as previous button for consistency
            - SVG right chevron icon */}
        <button
          onClick={() => changeDay(1)}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Next Day"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6 text-gray-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>

      {/* ============ Section Heading ============ */}
      {/* Visual label for the transactions list below */}
      <h3 className="text-lg font-semibold text-gray-700 mb-3">
        Daily Transactions
      </h3>

      {/* ============ Transactions List ============ */}
      {/* Scrollable container for individual transaction items
          - max-h-80: Maximum height (if more transactions, becomes scrollable)
          - overflow-y-auto: Vertical scroll for overflow
          - pr-2: Right padding for scrollbar visibility
          - space-y-2: Vertical spacing between transaction items */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
        
        {/* Empty State Message */}
        {/* Displayed when no transactions match the current day
            - text-gray-500: Muted color indicates empty state
            - text-center: Center align message
            - py-4: Vertical padding for balanced appearance */}
        {filteredTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No transactions for this day.
          </p>
        ) : (
          // Transaction List
          // Map over filtered transactions, rendering each as a card
          filteredTransactions.map((t) => (
            <div
              key={t.id}
              // Dynamic styling based on transaction type (income vs expense)
              // Template: bg-{color}-100 border-{color}-500 for color-coding
              //
              // Income (type === 'income'):
              // - bg-green-100: Light green background
              // - border-l-4 border-green-500: Green left border accent
              // - Color conveys: positive financial activity
              //
              // Expense (type !== 'income'):
              // - bg-red-100: Light red background
              // - border-l-4 border-red-500: Red left border accent
              // - Color conveys: money going out
              className={`p-3 mb-2 rounded-lg shadow flex justify-between items-center ${
                t.type === "income"
                  ? "bg-green-100 border-l-4 border-green-500"
                  : "bg-red-100 border-l-4 border-red-500"
              }`}
            >
              {/* Transaction Details (Left Side) */}
              {/* Displays all transaction information */}
              <div>
                {/* Category Name */}
                {/* Bold, large text for primary identifier
                    Example: "Food", "Transport", "Salary" */}
                <p className="font-semibold text-lg">{t.category}</p>
                
                {/* Date and Amount */}
                {/* Secondary information: when and how much
                    Format: "MM/DD/YYYY - QAR ###.##"
                    Example: "03/15/2024 - QAR 50.00" */}
                <p className="text-sm text-gray-600">
                  {t.date.toDate().toLocaleDateString()} - QAR{" "}
                  {t.amount.toFixed(2)}
                </p>
                
                {/* Transaction Description */}
                {/* Optional note/comment from user
                    Only displayed if:
                    1. t.description exists (not undefined/null)
                    2. t.description has content (after trim())
                    
                    Styling: Smaller, grayed text to show it's secondary info
                    Example: "Grocery shopping at ABC Market" */}
                {t.description && t.description.trim() !== "" && (
                  <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                )}
              </div>

              {/* Delete Button (Right Side) */}
              {/* Triggers transaction deletion with confirmation
                  - Positioned right for easy thumb access on mobile
                  - Red color indicates destructive action
                  - X icon universally understood as delete/close
                  - Calls handleDelete(t.id) which shows confirmation modal */}
              <button
                onClick={() => handleDelete(t.id)}
                className="delete-btn text-red-500 hover:text-red-700 font-semibold p-1 rounded-full"
                aria-label={`Delete ${t.category} transaction`}
              >
                {/* SVG X Icon (Close/Delete) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default TransactionsSection;
