import React from "react";
import { useTransactions } from "../components/TransactionContext"; // Custom hook to access transaction-related state and functions

/**
 * TransactionsSection Component
 *
 * This component displays a list of financial transactions filtered for the currently
 * selected day, month, and year. It allows users to view and delete individual transactions.
 * It also provides navigation buttons and a date picker to move between days, integrating with the
 * overall month/year selection from the TransactionContext.
 *
 * @param {object} props - The component's props.
 * @param {function} props.showConfirm - A function to display a confirmation modal before deletion.
 * @param {function} props.showMessage - A function to display general messages (success/error).
 */
const TransactionsSection = ({ showConfirm, showMessage }) => {
  // Destructure necessary state and functions from the useTransactions hook.
  // transactions: An array of all financial transactions.
  // currentMonth: The index of the currently selected month (0-11).
  // currentYear: The currently selected year.
  // currentDay: The currently selected day (1-31).
  // deleteTransaction: An asynchronous function to delete a transaction from Firestore.
  // changeDay: A function to change the current day (e.g., -1 for previous, 1 for next).
  const {
    transactions,
    currentMonth,
    currentYear,
    currentDay,
    deleteTransaction,
    changeDay,
  } = useTransactions();

  // --- Date Calculation and Formatting for the Date Picker ---
  // Create a Date object for the currently selected day to get accurate date information.
  const currentSelectedDate = new Date(currentYear, currentMonth, currentDay);

  // Get the local date components
  const year = currentSelectedDate.getFullYear();
  const month = String(currentSelectedDate.getMonth() + 1).padStart(2, "0"); // Get month (0-11) and add 1, then pad with a leading zero if needed
  const day = String(currentSelectedDate.getDate()).padStart(2, "0"); // Get day (1-31), then pad with a leading zero if needed

  // Format the current date into 'YYYY-MM-DD' string, which is the required format for input type="date".
  // const formattedDateForInput = currentSelectedDate.toISOString().split("T")[0];
  const formattedDateForInput =  `${year}-${month}-${day}`;

  // Calculate the first and last day of the current month. These will be used to set
  // the 'min' and 'max' attributes of the date picker, restricting selection to the current month.
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonthNumber = new Date(currentYear, currentMonth + 1, 0); // Day 0 of the next month gives the last day of the current month
  const lastDayOfMonth = lastDayOfMonthNumber.getDate(); // Day 0 of the next month gives the last day of the current month

  const minDateForInput = firstDayOfMonth.toISOString().split("T")[0];
  // const maxDateForInput = lastDayOfMonth.toISOString().split("T")[0];
  const maxDateForInput = lastDayOfMonth;

  // --- Transaction Filtering Logic ---
  // Define the start and end timestamps for the current day to accurately filter transactions.
  // This ensures only transactions within the exact 24-hour period of the 'currentDay' are shown.
  const dayStart = new Date(currentYear, currentMonth, currentDay, 0, 0, 0, 0); // Start of the current day (00:00:00.000)
  const dayEnd = new Date(
    currentYear,
    currentMonth,
    currentDay,
    23,
    59,
    59,
    999
  ); // End of the current day (23:59:59.999)

  // Filter the full list of transactions based on the calculated day range.
  const filteredTransactions = transactions.filter((t) => {
    const transactionDate = t.date.toDate(); // Convert Firestore Timestamp object to a JavaScript Date object
    // Check if the transaction's date falls within the defined 'dayStart' and 'dayEnd'.
    return transactionDate >= dayStart && transactionDate <= dayEnd;
  });

  /**
   * handleDateChange Function
   *
   * This function is triggered when the user selects a new date using the date input.
   * It calculates the numerical difference in days between the previously selected day
   * and the newly selected day, then calls 'changeDay' from the context to update the state.
   *
   * @param {object} e - The event object from the date input's onChange event.
   */
  const handleDateChange = (e) => {
    const selectedDateString = e.target.value; // Get the selected date string (e.g., "2025-07-15")
    const newlySelectedDate = new Date(selectedDateString); // Convert it to a Date object

    // Calculate the difference in days. We set hours to UTC midnight to avoid timezone issues
    // affecting the day calculation, ensuring accuracy regardless of local time.
    // const diffTime =
    //   newlySelectedDate.setUTCHours(0, 0, 0, 0) -
    //   currentSelectedDate.setUTCHours(0, 0, 0, 0);
    // const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

    const diffTime =
      newlySelectedDate.setHours(0, 0, 0, 0) -
      currentSelectedDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

    // Update the 'currentDay' state in the TransactionContext using the calculated delta.
    changeDay(diffDays);
  };

  /**
   * handleDelete Function
   *
   * This function is called when a user clicks the delete button for a specific transaction.
   * It first prompts the user for confirmation using a modal ('showConfirm'). If confirmed,
   * it attempts to delete the transaction via the 'deleteTransaction' function from context
   * and provides feedback using 'showMessage'.
   *
   * @param {string} id - The unique ID of the transaction to be deleted.
   */
  const handleDelete = (id) => {
    // Display a confirmation modal to the user.
    showConfirm(
      "Are you sure you want to delete this transaction?",
      async () => {
        // If the user confirms, proceed with the deletion.
        const success = await deleteTransaction(id);
        // Provide appropriate feedback to the user based on the operation's success.
        if (success) {
          showMessage("Transaction deleted successfully.");
        } else {
          showMessage("Failed to delete transaction.", true); // Indicate an error if deletion fails
        }
      }
    );
  };

  // --- Component JSX Structure ---
  return (
    // Main section container for the daily transactions list and navigation.
    <section>
      {/* Daily Navigation and Date Selector Bar */}
      <div className="flex justify-between items-center mb-4">
        {/* Button to navigate to the previous day */}
        <button
          onClick={() => changeDay(-1)} // Decrements the current day by 1
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Previous Day" // Accessibility label for screen readers
        >
          {/* SVG icon for a left arrow */}
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

        {/* Date input field for direct day selection */}
        <input
          type="date"
          value={formattedDateForInput} // Displays the currently selected date
          onChange={handleDateChange} // Calls the handler when a new date is selected
          min={minDateForInput} // Restricts selection to the first day of the current month
          max={maxDateForInput} // Restricts selection to the last day of the current month
          className="p-2 border border-gray-300 rounded-lg text-center font-semibold text-gray-700 focus:ring-blue-500 focus:border-blue-500 w-36 sm:w-48" // Tailwind CSS for styling
          aria-label="Select Date" // Accessibility label
        />
        {/* <span>{formattedDateForInput}</span> */}
        {/* Button to navigate to the next day */}
        <button
          onClick={() => changeDay(1)} // Increments the current day by 1
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Next Day" // Accessibility label for screen readers
        >
          {/* SVG icon for a right arrow */}
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

      {/* Secondary heading for the list of transactions */}
      <h3 className="text-lg font-semibold text-gray-700 mb-3">
        Daily Transactions
      </h3>
      {/* Container for the scrollable list of individual transactions */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
        {/* Conditional rendering: Display a message if no transactions are found for the current day */}
        {filteredTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No transactions for this day.
          </p>
        ) : (
          // Map over the filtered transactions and render each one
          filteredTransactions.map((t) => (
            <div
              key={t.id} // Unique key for React list rendering
              // Dynamic styling based on transaction type (income or expense)
              className={`p-3 mb-2 rounded-lg shadow flex justify-between items-center ${
                t.type === "income"
                  ? "bg-green-100 border-l-4 border-green-500" // Green border and background for income
                  : "bg-red-100 border-l-4 border-red-500" // Red border and background for expense
              }`}
            >
              {/* Transaction details display */}
              <div>
                <p className="font-semibold text-lg">{t.category}</p>
                <p className="text-sm text-gray-600">
                  {/* Format and display the transaction date and amount */}
                  {t.date.toDate().toLocaleDateString()} - QAR{" "}
                  {t.amount.toFixed(2)}
                </p>
                {/* NEW: Conditionally display description if it exists and is not empty */}
                {t.description && t.description.trim() !== "" && (
                  <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                )}
              </div>
              {/* Delete button for the transaction item */}
              <button
                onClick={() => handleDelete(t.id)} // Calls handleDelete function with the transaction's ID
                className="delete-btn text-red-500 hover:text-red-700 font-semibold p-1 rounded-full"
                aria-label={`Delete ${t.category} transaction`} // Accessibility label
              >
                {/* SVG icon for a delete/close button */}
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

export default TransactionsSection; // Export the TransactionsSection component for use in other parts of the application.
