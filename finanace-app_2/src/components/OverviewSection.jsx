import React from 'react';
import { useTransactions } from '../components/TransactionContext'; // Custom hook to access transaction-related state and functions

/**
 * OverviewSection Component
 *
 * This component displays a financial overview for the currently selected month and year.
 * It shows the total income, total expenses, and the net balance for that specific month.
 * It also provides navigation buttons to change the displayed month.
 */
const OverviewSection = () => {
  // Destructure necessary state and functions from the useTransactions hook.
  // transactions: An array of all financial transactions.
  // currentMonth: The index of the currently selected month (0-11).
  // currentYear: The currently selected year.
  // changeMonth: A function to change the current month (e.g., -1 for previous, 1 for next).
  const { transactions, currentMonth, currentYear, changeMonth } = useTransactions();

  // Format the current month and year for display (e.g., "July 2025").
  const monthYear = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long',  // Full month name
    year: 'numeric' // Full year
  });

  // --- Transaction Filtering Logic ---
  // Determine the start and end dates for the current month to filter transactions.
  // The filter will now be for the entire month.
  const monthStart = new Date(currentYear, currentMonth, 1); // First day of the current month
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999); // Last millisecond of the last day of the current month

  // Filter the full list of transactions to include only those within the current month.
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = t.date.toDate(); // Convert Firestore Timestamp to JavaScript Date object
    return transactionDate >= monthStart && transactionDate <= monthEnd; // Check if transaction date is within the current month
  });

  // --- Calculation of Totals ---
  let totalIncome = 0; // Initialize total income
  let totalExpenses = 0; // Initialize total expenses

  // Iterate through the filtered transactions to calculate total income and expenses.
  filteredTransactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount; // Add to income if transaction type is 'income'
    } else {
      totalExpenses += t.amount; // Add to expenses if transaction type is 'expense'
    }
  });

  // Calculate the net balance.
  const balance = totalIncome - totalExpenses;

  // --- Component JSX Structure ---
  return (
    // Section container for the financial overview.
    <section className="mb-6">
      {/* Month navigation and display. */}
      <div className="flex justify-between items-center mb-4">
        {/* Button to navigate to the previous month. */}
        <button
          onClick={() => changeMonth(-1)} // Calls changeMonth with -1 to go back one month
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          {/* SVG icon for previous arrow. */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        {/* Display of the current month and year. */}
        <h2 className="text-xl font-semibold text-gray-700">{monthYear}</h2>
        {/* Button to navigate to the next month. */}
        <button
          onClick={() => changeMonth(1)} // Calls changeMonth with 1 to go forward one month
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          {/* SVG icon for next arrow. */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Grid layout for displaying total income, expenses, and balance. */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        {/* Total Income display card. */}
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <p className="text-sm text-green-700 font-medium">Total Income</p>
          {/* Displays total income, formatted to two decimal places. */}
          <p className="text-xl font-bold text-green-600">QAR {totalIncome.toFixed(2)}</p>
        </div>
        {/* Total Expenses display card. */}
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <p className="text-sm text-red-700 font-medium">Total Expenses</p>
          {/* Displays total expenses, formatted to two decimal places. */}
          <p className="text-xl font-bold text-red-600">QAR {totalExpenses.toFixed(2)}</p>
        </div>
        {/* Balance display card. */}
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <p className="text-sm text-blue-700 font-medium">Balance</p>
          {/* Displays balance, with dynamic text color based on positive/negative value. */}
          {/* Uses Math.abs() to display the absolute value, as the color indicates positive/negative. */}
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            QAR {Math.abs(balance).toFixed(2)}
          </p>
        </div>
      </div>
    </section>
  );
};

export default OverviewSection; // Export the OverviewSection component for use in other parts of the application.
