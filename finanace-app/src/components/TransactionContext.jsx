import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, appId } from '../firebase'; // Import Firestore instance (db) and app ID from firebase configuration
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  where, // Added for querying categories by type
  getDocs // Added for checking category existence
} from 'firebase/firestore'; // Firebase Firestore methods
import { useAuth } from '../hooks/useAuth'; // Custom hook to get the current authenticated user

/**
 * TransactionContext
 *
 * This React Context is used to provide transaction-related state and functions
 * to all components wrapped by the TransactionProvider.
 */
const TransactionContext = createContext();

/**
 * useTransactions Hook
 *
 * A custom hook to consume the TransactionContext. This makes it easier for components
 * to access the transaction state and functions without directly using useContext.
 * @returns {object} The value provided by the TransactionContext.
 * @throws {Error} If used outside of a TransactionProvider.
 */
export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}

/**
 * TransactionProvider Component
 *
 * This component acts as a provider for the TransactionContext. It manages:
 * - The list of financial transactions.
 * - The currently displayed month, year, and day for filtering transactions.
 * - The loading state for transaction operations.
 * - User-defined categories for income and expenses (fetched from Firestore).
 * - Functions to add, delete, and fetch transactions from Firestore.
 * - Functions to add and delete user-defined categories in Firestore.
 * - Functions to change the current month/year view and the current day view.
 *
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The child components that will consume the TransactionContext.
 */
export function TransactionProvider({ children }) {
  // transactions: State to store the array of financial transactions.
  const [transactions, setTransactions] = useState([]);
  // currentMonth: State to store the index of the currently displayed month (0-11).
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  // currentYear: State to store the currently displayed year.
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  // currentDay: State to store the currently displayed day of the month (1-31).
  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  // loading: State to indicate if transaction data or category data is being fetched or modified.
  const [loading, setLoading] = useState(false);
  // currentUser: Get the authenticated user from the AuthContext.
  const { currentUser } = useAuth();

  // NEW: State for user-defined categories, fetched from Firestore
  const [userIncomeCategories, setUserIncomeCategories] = useState([]);
  const [userExpenseCategories, setUserExpenseCategories] = useState([]);

  // Default categories - these are now just initial values, not the main source.
  // We'll add these if the user has no categories, or keep them if they're already present.
  const defaultIncomeCategories = ["Salary", "Business", "Freelance", "Gifts","Adjusted", "Borrowed", "returned"];
  const defaultExpenseCategories = ["Food", "Transport", "Rent", "Utilities", "Entertainment", "Health", "Shopping", "Education", "Adjusted", "lent", "returned"];

  /**
   * useEffect Hook for Loading Transactions and Categories
   *
   * This effect sets up real-time listeners (onSnapshot) to fetch both transactions
   * and user-defined categories from Firestore for the current user.
   * It runs whenever the `currentUser` changes.
   */
  useEffect(() => {
    let unsubscribeTransactions = () => {};
    let unsubscribeCategories = () => {};

    // If no user is logged in, clear all data and stop loading.
    if (!currentUser) {
      setTransactions([]);
      setUserIncomeCategories([]);
      setUserExpenseCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true); // Set loading to true when starting to fetch data

    // --- Setup Transactions Listener ---
    try {
      const transactionsCol = collection(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`);
      const qTransactions = query(transactionsCol);

      unsubscribeTransactions = onSnapshot(qTransactions, (querySnapshot) => {
        const transactionsData = [];
        querySnapshot.forEach((doc) => {
          transactionsData.push({ id: doc.id, ...doc.data() });
        });
        transactionsData.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
        setTransactions(transactionsData);
        // Only set loading to false after both transactions AND categories are loaded
        // This is handled better by a combined loading state if more complex.
        // For simplicity, we'll let category loading handle final setLoading(false).
      }, (error) => {
        console.error("Error loading transactions:", error);
        setLoading(false);
      });
    } catch (error) {
      console.error("Error setting up transaction listener:", error);
      setLoading(false);
    }

    // --- Setup Categories Listener ---
    const categoriesCol = collection(db, `artifacts/${appId}/users/${currentUser.uid}/categories`);
    unsubscribeCategories = onSnapshot(categoriesCol, async (querySnapshot) => {
      const fetchedIncomeCategories = [];
      const fetchedExpenseCategories = [];
      querySnapshot.forEach((doc) => {
        const catData = doc.data();
        if (catData.type === 'income') {
          fetchedIncomeCategories.push(catData.name);
        } else if (catData.type === 'expense') {
          fetchedExpenseCategories.push(catData.name);
        }
      });

      // Ensure default categories are present if user hasn't added any yet or they are missing
      const finalIncomeCategories = [...new Set([...defaultIncomeCategories, ...fetchedIncomeCategories])].sort();
      const finalExpenseCategories = [...new Set([...defaultExpenseCategories, ...fetchedExpenseCategories])].sort();

      setUserIncomeCategories(finalIncomeCategories);
      setUserExpenseCategories(finalExpenseCategories);
      setLoading(false); // Set loading to false once categories are loaded (and implicitly transactions too, if that listener fired)
    }, (error) => {
      console.error("Error loading categories:", error);
      setLoading(false);
    });

    // Return cleanup function to unsubscribe from listeners
    return () => {
      unsubscribeTransactions();
      unsubscribeCategories();
    };
  }, [currentUser, appId]); // Dependency array includes appId now

  /**
   * addCategory Function
   *
   * Adds a new user-defined category to Firestore.
   * @param {string} name - The name of the new category.
   * @param {'income' | 'expense'} type - The type of category (income or expense).
   * @returns {Promise<boolean>} True if the category was added successfully, false otherwise.
   */
  const addCategory = async (name, type) => {
    if (!currentUser || !name.trim() || !type) {
      console.warn("Cannot add category: Missing user, name, or type.");
      return false;
    }

    // Check if category already exists to prevent duplicates
    const categoriesRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/categories`);
    const q = query(categoriesRef, where("name", "==", name.trim()), where("type", "==", type));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.warn(`Category '${name}' already exists for ${type}.`);
      return false; // Category already exists
    }

    setLoading(true);
    try {
      await addDoc(categoriesRef, {
        name: name.trim(),
        type: type,
        createdAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error("Error adding category:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * deleteCategory Function
   *
   * Deletes a user-defined category from Firestore.
   * @param {string} name - The name of the category to delete.
   * @param {'income' | 'expense'} type - The type of category (income or expense).
   * @returns {Promise<boolean>} True if the category was deleted successfully, false otherwise.
   */
  const deleteCategory = async (name, type) => {
    if (!currentUser || !name || !type) {
      console.warn("Cannot delete category: Missing user, name, or type.");
      return false;
    }

    setLoading(true);
    try {
      const categoriesRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/categories`);
      // Find the document ID for the category to delete
      const q = query(categoriesRef, where("name", "==", name), where("type", "==", type));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn(`Category '${name}' not found for deletion.`);
        return false;
      }

      // Assuming unique names per type, delete the first found document
      const docToDelete = querySnapshot.docs[0];
      await deleteDoc(doc(db, `artifacts/${appId}/users/${currentUser.uid}/categories`, docToDelete.id));
      return true;
    } catch (error) {
      console.error("Error deleting category:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * addTransaction Function
   *
   * Adds a new transaction document to the current user's transactions collection in Firestore.
   * @param {object} transaction - The transaction object containing type, amount, category, date, and description.
   * @returns {Promise<boolean>} True if the transaction was added successfully, false otherwise.
   */
  const addTransaction = async (transaction) => { // Updated to accept transaction object directly
    if (!currentUser) {
      console.warn("Cannot add transaction: No user authenticated.");
      return false;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`), {
        ...transaction,
        // Ensure date is converted to Firestore Timestamp
        date: Timestamp.fromDate(new Date(transaction.date)),
        // Add a createdAt timestamp for tracking.
        createdAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error("Error adding transaction:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * deleteTransaction Function
   *
   * Deletes a specific transaction document from the current user's transactions collection in Firestore.
   * @param {string} transactionId - The ID of the transaction document to delete.
   * @returns {Promise<boolean>} True if the transaction was deleted successfully, false otherwise.
   */
  const deleteTransaction = async (transactionId) => {
    if (!currentUser) {
      console.warn("Cannot delete transaction: No user authenticated.");
      return false;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`, transactionId));
      return true;
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * changeMonth Function
   *
   * Updates the currentMonth and currentYear states to navigate between months.
   * When changing months, the day is reset to 1 to avoid issues with month-end dates.
   * @param {number} delta - The change in months (e.g., -1 for previous month, 1 for next month).
   */
  const changeMonth = (delta) => {
    setCurrentMonth(prev => {
      let newMonth = prev + delta;
      let newYear = currentYear;

      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }

      setCurrentYear(newYear);
      setCurrentDay(1); // Reset day to 1 when month changes
      return newMonth;
    });
  };

  /**
   * changeDay Function
   *
   * Updates the currentDay, currentMonth, and currentYear states to navigate between days.
   * It handles day, month, and year rollovers correctly.
   * @param {number} delta - The change in days (e.g., -1 for previous day, 1 for next day).
   */
  const changeDay = (delta) => {
    const currentDate = new Date(currentYear, currentMonth, currentDay);
    currentDate.setDate(currentDate.getDate() + delta);

    setCurrentYear(currentDate.getFullYear());
    setCurrentMonth(currentDate.getMonth());
    setCurrentDay(currentDate.getDate());
  };

  // The value object containing all state and functions to be provided by the context.
  const value = {
    transactions,
    currentMonth,
    currentYear,
    currentDay,
    userIncomeCategories, // Exposed user-defined income categories
    userExpenseCategories, // Exposed user-defined expense categories
    addTransaction,
    deleteTransaction,
    addCategory, // Exposed function to add categories
    deleteCategory, // Exposed function to delete categories
    changeMonth,
    changeDay,
    loading
  };

  // Render the TransactionContext.Provider, making the 'value' available to its children.
  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}
