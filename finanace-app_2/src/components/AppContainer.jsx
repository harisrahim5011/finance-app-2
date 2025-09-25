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

const AppContainer = () => {
  const { currentUser, signOutUser, signInWithGoogle } = useAuth();
  const { transactions, currentMonth, currentYear, loading: transactionsLoading } = useTransactions();

  // --- State Management for Modals ---
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showMessageModal, setShowMessageModal] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [message, setMessage] = React.useState({ text: "", isError: false });
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [confirmMessage, setConfirmMessage] = React.useState("");

  // --- Transaction Filtering Logic ---
  // This is the core change. We will calculate the filtered transactions here
  // and pass them down to the relevant components.
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  const filteredTransactions = transactions.filter(t => {
    const transactionDate = t.date?.toDate(); // Use optional chaining to prevent errors if date is missing
    return transactionDate >= monthStart && transactionDate <= monthEnd;
  });

  // --- Conditional Rendering for Loading States ---
  if (transactionsLoading) return <LoadingIndicator />;
  if (!currentUser) return null;

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setShowMessageModal(true);
  };

  const showConfirm = (msg, action) => {
    setConfirmMessage(msg);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  return (
    <div className="w-full max-w-md">
      <header className="mb-6 text-center bg-white p-4 rounded-xl shadow-lg">
        {currentUser && (
          <UserInfo
            user={currentUser}
            onSignOut={signOutUser}
            onSignInGoogle={signInWithGoogle}
          />
        )}
      </header>
      <div className="mb-6 text-center bg-white p-4 rounded-xl shadow-lg">
        <ExpenseList filteredTransactions={filteredTransactions} />
      </div>
      <div className="bg-white rounded-xl shadow-2xl p-6">
        <OverviewSection filteredTransactions={filteredTransactions} />
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
          >
            Add New Transaction
          </button>
        </div>
        <TransactionsSection
          showConfirm={showConfirm}
          showMessage={showMessage}
          filteredTransactions={filteredTransactions} // Pass the filtered list here too
        />
      </div>

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        showMessage={showMessage}
        showConfirm={showConfirm}
      />

      <MessageModal
        isOpen={showMessageModal}
        message={message.text}
        isError={message.isError}
        onClose={() => setShowMessageModal(false)}
      />

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