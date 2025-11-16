import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useTransactions } from "../components/TransactionContext";
import UserInfo from "./UserInfo";
import OverviewSection from "./OverviewSection";
import TransactionsSection from "./TransactionsSection";
import AddTransactionModal from "./AddTransactionModal";
import MessageModal from "./MessageModal";
import ConfirmModal from "./ConfirmModal";
import LoadingIndicator from "./LoadingIndicator";
import ExpenseList from "./ExpenseList";

/**
 * AppContainer Component
 *
 * Main application container that orchestrates:
 * - User authentication state
 * - Transaction data and filtering
 * - Modal management (add transaction, messages, confirmations)
 * - Layout and component composition
 *
 * Data Flow:
 * 1. Fetches current user from auth context
 * 2. Fetches transactions for current month/year
 * 3. Filters transactions to match calendar or custom billing cycle
 * 4. Passes filtered transactions to child components (Overview, ExpenseList, TransactionsSection)
 * 5. Manages UI state (modals, messages, confirmations)
 *
 * @component
 * @returns {JSX.Element} Main app layout with header, expense list, overview, and transaction management
 */
const AppContainer = () => {
  const { currentUser, signOutUser, signInWithGoogle } = useAuth();
  const { transactions, currentMonth, currentYear, loading: transactionsLoading } = useTransactions();

  // ==================== Modal & UI State Management ====================
  // Controls visibility of "Add Transaction" modal
  const [showAddModal, setShowAddModal] = React.useState(false);
  // Controls visibility of message/notification modal
  const [showMessageModal, setShowMessageModal] = React.useState(false);
  // Controls visibility of confirmation dialog modal
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  // Stores the message text and error flag for the message modal
  const [message, setMessage] = React.useState({ text: "", isError: false });
  // Stores the callback function to execute on confirmation
  const [confirmAction, setConfirmAction] = React.useState(null);
  // Stores the confirmation dialog message text
  const [confirmMessage, setConfirmMessage] = React.useState("");

  // ==================== Transaction Filtering Logic ====================
  /**
   * Filter transactions to show only those within the current month boundaries.
   *
   * The filtering respects the user's billing cycle preference:
   * - If 'calendar' mode: shows transactions from 1st to last day of current month
   * - If 'custom' mode: shows transactions from custom start day (current month)
   *        to custom end day (next month)
   *
   * Month boundaries are calculated as:
   * - monthStart: 1st day of current month at 00:00:00.000
   * - monthEnd: Last day of current month at 23:59:59.999
   */
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  /**
   * Filter transactions array to include only dates within the calculated month range.
   * Safely handles Firestore Timestamp objects using optional chaining.
   *
   * @returns {Array} Filtered transaction array for the current period
   */
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = t.date?.toDate(); // Use optional chaining to prevent errors if date is missing
    return transactionDate >= monthStart && transactionDate <= monthEnd;
  });

  // ==================== Loading & Authorization Guards ====================
  // Show loading indicator while transactions are being fetched from Firestore
  if (transactionsLoading) return <LoadingIndicator />;
  // Prevent rendering if user is not authenticated
  if (!currentUser) return null;

  /**
   * Handler for showing toast/notification messages
   *
   * @param {string} text - The message to display
   * @param {boolean} isError - If true, displays as error (red); otherwise as success (green)
   */
  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setShowMessageModal(true);
  };

  /**
   * Handler for showing confirmation dialog
   * Used when user action requires explicit confirmation (e.g., deleting a category)
   *
   * @param {string} msg - The confirmation message to display
   * @param {Function} action - Callback function to execute if user confirms
   */
  const showConfirm = (msg, action) => {
    setConfirmMessage(msg);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  // ==================== Main Component Render ====================
  return (
    <div className="w-full max-w-md">
      {/* Header Section: User Info and Profile Menu */}
      <header className="mb-6 text-center bg-white p-4 rounded-xl shadow-lg">
        {currentUser && (
          <UserInfo
            user={currentUser}
            onSignOut={signOutUser}
            onSignInGoogle={signInWithGoogle}
          />
        )}
      </header>

      {/* Expense Summary List: Shows recent transactions categorized */}
      <div className="mb-6 text-center bg-white p-4 rounded-xl shadow-lg">
        <ExpenseList filteredTransactions={filteredTransactions} />
      </div>

      {/* Main Content Area: Overview, Add Button, and Transaction Management */}
      <div className="bg-white rounded-xl shadow-2xl p-6">
        {/* Overview Section: Month summary, income/expense totals, balance */}
        <OverviewSection filteredTransactions={filteredTransactions} />

        {/* Add Transaction Button: Opens the modal for adding new income/expense */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
          >
            Add New Transaction
          </button>
        </div>

        {/* Transaction List Section: Displays all transactions for the period */}
        {/* Also handles transaction editing and deletion */}
        <TransactionsSection
          showConfirm={showConfirm}
          showMessage={showMessage}
          filteredTransactions={filteredTransactions}
        />
      </div>

      {/* Modal: Add New Transaction */}
      {/* Allows user to create income or expense transactions with category and date */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        showMessage={showMessage}
        showConfirm={showConfirm}
        filteredTransactions={filteredTransactions}
      />

      {/* Modal: Message/Notification Display */}
      {/* Shows success messages (green) or error messages (red) */}
      <MessageModal
        isOpen={showMessageModal}
        message={message.text}
        isError={message.isError}
        onClose={() => setShowMessageModal(false)}
      />

      {/* Modal: Confirmation Dialog */}
      {/* Requests user confirmation before destructive actions (e.g., deleting categories) */}
      <ConfirmModal
        isOpen={showConfirmModal}
        message={confirmMessage}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
          setShowConfirmModal(false);
        }}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
};

export default AppContainer;