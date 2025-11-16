import React from 'react';
import { useTransactions } from '../components/TransactionContext';

/**
 * OverviewSection Component
 * 
 * Purpose:
 * Displays a summary of financial data for the selected calendar month, including:
 * - Month navigation (previous/next month)
 * - Total income for the month
 * - Total expenses for the month
 * - Current balance (income - expenses)
 * 
 * Behavior:
 * - Always uses calendar month boundaries (1st to last day of month)
 * - Filters transactions based on selected month/year from context
 * - Updates totals reactively when transactions change
 * - Supports month navigation with previous/next buttons
 * 
 * Data Flow:
 * 1. Gets transactions and month/year from TransactionContext
 * 2. Filters transactions to match current calendar month
 * 3. Calculates income, expenses, and balance totals
 * 4. Displays results in three colored cards (green/red/blue)
 * 
 * Features:
 * - Color-coded totals: Green (income), Red (expenses), Blue (balance)
 * - Responsive layout: Cards stack and scroll on mobile
 * - Navigation arrows: Easy month switching
 * - Currency formatting: Displays amounts with QAR currency and 2 decimal places
 * 
 * Usage Example:
 * ```jsx
 * <OverviewSection />
 * 
 * // Displays:
 * // [< Previous Month | March 2024 | Next Month >]
 * // [Total Income: QAR 5,000.00] [Total Expenses: QAR 2,500.00] [Balance: QAR 2,500.00]
 * ```
 * 
 * Dependencies:
 * - useTransactions: Provides transactions, currentMonth, currentYear, changeMonth
 */
const OverviewSection = () => {
  const { 
    transactions, 
    currentMonth, 
    currentYear, 
    changeMonth
    // Note: Removed getCycleBoundaries and formatCycleHeader
  } = useTransactions();

  // ==================== Calendar Month Boundaries ====================
  // Always use calendar month (1st to last day), regardless of any billing cycle settings
  // This ensures OverviewSection always shows a complete calendar month view
  //
  // Calculation:
  // - calendarStart: First day of the month (time = 00:00:00)
  //   Format: new Date(year, month, 1)
  //   Example: March 1, 2024 at 00:00:00
  //
  // - calendarEnd: Last moment of the month (time = 23:59:59.999)
  //   Format: new Date(year, month + 1, 0, 23, 59, 59, 999)
  //   Why month + 1? JavaScript's Date constructor wraps around:
  //   - new Date(2024, 3, 0) = Feb 29, 2024 (last day of Feb)
  //   - new Date(2024, 3, 0, 23:59:59) = last moment of Feb
  //   - new Date(2024, 4, 0) = Mar 31, 2024 (last day of Mar)
  //
  // Examples:
  // March 2024: Start 2024-03-01 00:00:00 → End 2024-03-31 23:59:59.999
  // Feb 2024:   Start 2024-02-01 00:00:00 → End 2024-02-29 23:59:59.999 (leap year)
  const calendarStart = new Date(currentYear, currentMonth, 1);
  const calendarEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
  
  // ==================== Filter Transactions by Calendar Month ====================
  // Extract only transactions that fall within the current calendar month
  //
  // Process:
  // 1. For each transaction in the list:
  //    - Convert Firestore Timestamp to JavaScript Date: t.date.toDate()
  //    - Check if transactionDate >= calendarStart AND <= calendarEnd
  //    - Include transaction only if both conditions are true
  //
  // 2. Result: filteredTransactions contains only transactions for this month
  //
  // Example:
  // If currentMonth = February 2024:
  // - calendarStart = Feb 1, 2024 00:00:00
  // - calendarEnd = Feb 29, 2024 23:59:59.999
  // - Only transactions between these dates are included
  //
  // Why this matters:
  // - Ensures accurate monthly totals (no data from previous/next months)
  // - Prevents double-counting in cumulative calculations
  // - Supports proper month-to-month comparisons
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = t.date.toDate();
    return transactionDate >= calendarStart && transactionDate <= calendarEnd;
  });

  // ==================== Month Header Display ====================
  // Format the current month and year for display above the totals card
  //
  // toLocaleString() converts month number to readable text:
  // - Options: { month: 'long', year: 'numeric' }
  // - month: 'long' = full month name (e.g., "March", "February")
  // - year: 'numeric' = 4-digit year (e.g., "2024", "2025")
  //
  // Locale behavior:
  // - 'default' uses browser's locale settings
  // - Automatically handles month names in user's language
  //
  // Examples:
  // - currentMonth = 2 (March, 0-indexed), currentYear = 2024 → "March 2024"
  // - currentMonth = 1 (February, 0-indexed), currentYear = 2024 → "February 2024"
  const cycleHeader = new Date(currentYear, currentMonth).toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

  // ==================== Calculate Monthly Totals ====================
  // Sum up all income and expenses for the current month
  //
  // Initialize accumulators:
  // - totalIncome: Sum of all transactions with type === 'income'
  // - totalExpenses: Sum of all transactions with type !== 'income' (includes 'expense', etc.)
  //
  // Process:
  // 1. Loop through each filtered transaction
  // 2. Check transaction type:
  //    - If 'income': add to totalIncome
  //    - If 'expense': add to totalExpenses
  // 3. Final values represent complete month summary
  //
  // Formula:
  // - balance = totalIncome - totalExpenses
  // - Positive balance: More income than expenses (good month!)
  // - Negative balance: More expenses than income (deficit)
  //
  // Example:
  // Transactions: [
  //   { type: 'income', amount: 5000 },
  //   { type: 'expense', amount: 2000 },
  //   { type: 'expense', amount: 1500 }
  // ]
  // Result: totalIncome = 5000, totalExpenses = 3500, balance = 1500
  let totalIncome = 0;
  let totalExpenses = 0;
  
  filteredTransactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
    }
  });
  
  const balance = totalIncome - totalExpenses;

  // ==================== Render Section ====================
  return (
    <section className="mb-6">
      
      {/* ============ Month Navigation Header ============ */}
      {/* Displays month name centered with navigation arrows on left/right */}
      <div className="flex justify-between items-center mb-4">
        
        {/* Previous Month Button */}
        {/* - Rounded-full creates circular button
            - hover:bg-gray-200 provides visual feedback on hover
            - onClick={() => changeMonth(-1)} calls context function to go back 1 month
            - SVG: Left arrow icon (chevron-left) */}
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        {/* Month and Year Display */}
        {/* - text-xl: Large font size for prominence
            - font-semibold: Bold text
            - text-gray-700: Dark gray color for good contrast
            - cycleHeader: "March 2024" format */}
        <h2 className="text-xl font-semibold text-gray-700">{cycleHeader}</h2>
        
        {/* Next Month Button */}
        {/* - Same styling as previous button
            - onClick={() => changeMonth(1)} moves forward 1 month
            - SVG: Right arrow icon (chevron-right) */}
        <button
          onClick={() => changeMonth(1)}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* ============ Financial Summary Cards ============ */}
      {/* Displays three cards in a row showing income, expenses, and balance
          - flex gap-x-3: Horizontal layout with spacing between cards
          - text-center: All content centered within each card
          - overflow-x-auto: Allows scrolling on mobile if needed */}
      <div className="flex gap-x-3 text-center overflow-x-auto">
        
        {/* Total Income Card */}
        {/* Color scheme: Green (positive indicator)
            - bg-green-50: Very light green background
            - text-green-700: Dark green label text
            - text-green-600: Medium green for amount
            - p-4: Padding inside card
            - rounded-lg: Rounded corners
            - shadow: Subtle shadow for depth */}
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <p className="text-sm text-green-700 font-medium">Total Income</p>
          <p className="text-xl font-bold text-green-600">QAR {totalIncome.toFixed(2)}</p>
        </div>
        
        {/* Total Expenses Card */}
        {/* Color scheme: Red (warning indicator)
            - bg-red-50: Very light red background
            - text-red-700: Dark red label text
            - text-red-600: Medium red for amount
            - Styling same as income card (consistent design) */}
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <p className="text-sm text-red-700 font-medium">Total Expenses</p>
          <p className="text-xl font-bold text-red-600">QAR {totalExpenses.toFixed(2)}</p>
        </div>
        
        {/* Balance Card */}
        {/* Color scheme: Blue primary, with dynamic color for amount
            - bg-blue-50: Very light blue background
            - text-blue-700: Dark blue label text
            - Dynamic amount color:
              • balance >= 0: Blue (healthy balance)
              • balance < 0: Red (deficit warning)
            - Math.abs() ensures positive display (color shows direction)
            - toFixed(2): Always shows 2 decimal places for currency */}
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <p className="text-sm text-blue-700 font-medium">Balance</p>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            QAR {Math.abs(balance).toFixed(2)}
          </p>
        </div>
      </div>
    </section>
  );
};

export default OverviewSection;