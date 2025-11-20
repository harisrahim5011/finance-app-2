import React, { createContext, useContext, useState, useEffect } from "react";
import { db, appId } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";

/**
 * TransactionContext & useTransactions Hook
 *
 * Purpose:
 * Centralized state management for financial transactions and categories using React Context API.
 * Provides real-time data synchronization with Firestore and manages:
 * - Transaction CRUD operations (Create, Read, Update, Delete)
 * - Category management with budget tracking
 * - Billing cycle modes (calendar month vs custom date range)
 * - Surplus forwarding logic for budget overflow handling
 * - Month/day navigation for calendar views
 *
 * Architecture:
 * - Context Pattern: createContext() creates TransactionContext
 * - Provider Pattern: TransactionProvider wraps app and supplies value to all consumers
 * - Custom Hook: useTransactions() provides easy access to context with error checking
 *
 * Global State Managed:
 * - transactions: Array of all user transactions with Firestore Timestamps
 * - userCategories: Array of expense/income categories with budgets
 * - currentMonth/currentYear/currentDay: Current view date for calendar filtering
 * - cycleType: "calendar" (standard month) or "custom" (user-defined date range)
 * - customDateRange: Start and end dates for custom billing cycles
 * - loading: Async operation status indicator
 *
 * Data Flow:
 * 1. User logs in → currentUser from AuthContext becomes available
 * 2. useEffect sets up real-time Firestore listeners (onSnapshot)
 * 3. Default categories auto-created if none exist for new users
 * 4. Transactions and categories subscribed to in real-time
 * 5. Components call context functions to modify data
 * 6. Firestore updates trigger listeners → state updates → components re-render
 *
 * Performance Considerations:
 * - Real-time listeners (onSnapshot) automatically update on any Firestore change
 * - Transactions sorted by date (newest first) for efficient rendering
 * - Cleanup function unsubscribes from listeners when component unmounts
 * - Loading state prevents race conditions during async operations
 *
 * Usage Example:
 * ```jsx
 * function MyComponent() {
 *   const { transactions, addTransaction, currentMonth, currentYear } = useTransactions();
 *
 *   const handleAdd = async () => {
 *     const success = await addTransaction({
 *       type: 'expense',
 *       amount: 50,
 *       category: 'Food',
 *       description: 'Lunch',
 *       date: new Date().toISOString()
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <p>Transactions: {transactions.length}</p>
 *       <button onClick={handleAdd}>Add Transaction</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * Dependencies:
 * - Firebase Firestore: database operations, real-time listeners
 * - useAuth: provides currentUser for user-specific data
 * - localStorage: persists billing cycle settings across sessions
 */

const TransactionContext = createContext();

/**
 * useTransactions Hook
 *
 * Purpose: Simplified access to TransactionContext with built-in error handling
 *
 * Returns: TransactionContext value object (transactions, functions, state)
 *
 * Throws Error: If called outside TransactionProvider (prevents silent failures)
 *
 * Usage:
 * ```jsx
 * const { transactions, addTransaction } = useTransactions();
 * ```
 *
 * vs. direct useContext:
 * ```jsx
 * const context = useContext(TransactionContext); // Could be undefined!
 * ```
 */
export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error(
      "useTransactions must be used within a TransactionProvider"
    );
  }
  return context;
}

export function TransactionProvider({ children }) {
  // ==================== State Variables ====================

  // Core Transaction & Category State
  const [transactions, setTransactions] = useState([]);
  // All user transactions: [{ id, type, amount, category, date, ... }, ...]
  // Updated in real-time from Firestore onSnapshot listener
  // Sorted newest-first by transaction date

  const [userCategories, setUserCategories] = useState([]);
  // All user categories: [{ id, name, budgetAmount, spentAmount, type, ... }, ...]
  // Includes both expense and income categories
  // Updated in real-time from Firestore onSnapshot listener

  // Calendar Navigation State
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  // 0-indexed month: 0=Jan, 1=Feb, ..., 11=Dec
  // Used by OverviewSection and ExpenseList for filtering display

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  // Full year: 2024, 2025, etc.
  // Combined with currentMonth to create date boundaries

  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  // 1-31: Current day of month
  // Primarily used for month navigation edge cases

  const [loading, setLoading] = useState(false);
  // true during: Firestore operations, category/transaction adds/deletes
  // false when: Operations complete or error occurs
  // Used to show loading spinners and prevent duplicate clicks

  // ==================== Billing Cycle Configuration ====================

  const { currentUser } = useAuth();
  // Current authenticated user from Firebase Auth
  // Used to: Namespace user data in Firestore, check if user is logged in

  const [cycleType, setCycleType] = useState(() => {
    // Initialize from localStorage or default to "calendar"
    const saved = localStorage.getItem("userInfo_billingCycle_type");
    return saved || "calendar";
  });
  // Values: "calendar" | "custom"
  // "calendar": Standard month (1st - last day)
  // "custom": User-defined date range (e.g., 15th to 14th next month)
  // Used by ExpenseList and forwardSurplus logic

  const [customDateRange, setCustomDateRange] = useState(() => {
    // Initialize from localStorage with fallback to current calendar month
    const savedStart = localStorage.getItem("userInfo_customStartDate");
    const savedEnd = localStorage.getItem("userInfo_customEndDate");

    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      start: savedStart || defaultStart.toISOString().split("T")[0],
      // Format: "YYYY-MM-DD" (ISO string without time)
      // Start date of custom billing cycle
      end: savedEnd || defaultEnd.toISOString().split("T")[0],
      // Format: "YYYY-MM-DD"
      // End date of custom billing cycle
    };
  });

  // ==================== Persist Settings to localStorage ====================

  // Auto-save cycleType when user changes it
  // Ensures billing cycle preference survives page reload
  useEffect(() => {
    localStorage.setItem("userInfo_billingCycle_type", cycleType);
  }, [cycleType]);

  // Auto-save custom date range when user modifies it
  // Ensures custom billing cycle dates persist across sessions
  useEffect(() => {
    localStorage.setItem("userInfo_customStartDate", customDateRange.start);
    localStorage.setItem("userInfo_customEndDate", customDateRange.end);
  }, [customDateRange]);

  // ==================== Default Categories ====================
  // Pre-defined expense and income categories for new users
  // Auto-populated in Firestore when user has no existing categories
  // User can add/delete categories after this initial setup
  const defaultCategories = [
    { name: "Food", budgetAmount: 0, spentAmount: 0, type: "expense" },
    // Food/groceries/dining out
    { name: "Transport", budgetAmount: 0, spentAmount: 0, type: "expense" },
    // Gas, public transit, vehicle maintenance
    { name: "Rent", budgetAmount: 0, spentAmount: 0, type: "expense" },
    // Housing/rent payment
    { name: "Utilities", budgetAmount: 0, spentAmount: 0, type: "expense" },
    // Electricity, water, internet, phone bills
    { name: "Entertainment", budgetAmount: 0, spentAmount: 0, type: "expense" },
    // Movies, games, hobbies, streaming services
    { name: "Health", budgetAmount: 0, spentAmount: 0, type: "expense" },
    // Medical, insurance, gym membership
    { name: "Shopping", budgetAmount: 0, spentAmount: 0, type: "expense" },
    // Clothes, household items, personal care
    { name: "Education", budgetAmount: 0, spentAmount: 0, type: "expense" },
    // Courses, books, training materials
    { name: "Savings", budgetAmount: 0, spentAmount: 0, type: "income" },
    // Income category for savings/transfers
  ];

  // ==================== Firestore Real-Time Listeners Setup ====================
  // Initialize real-time data sync from Firestore when user logs in
  // Uses onSnapshot for live updates (transactions/categories change → components re-render)
  //
  // Dependency array: [currentUser, appId]
  // Re-runs: When user logs in/out or appId changes
  // Cleanup: Unsubscribe from listeners when component unmounts
  useEffect(() => {
    // Storage for unsubscribe functions (cleanup)
    let unsubscribeTransactions = () => {};
    let unsubscribeCategories = () => {};

    // Guard: If no user logged in, clear data and return
    if (!currentUser) {
      setTransactions([]);
      setUserCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // ========== CATEGORIES LISTENER & INITIALIZATION ==========
    // Path: artifacts/{appId}/users/{userId}/categories
    const categoriesCol = collection(
      db,
      `artifacts/${appId}/users/${currentUser.uid}/categories`
    );

    // Check if user has existing categories; populate with defaults if empty
    const checkAndPopulateCategories = async () => {
      try {
        const categoriesSnapshot = await getDocs(categoriesCol);

        // If no categories exist, add all default categories
        if (categoriesSnapshot.empty) {
          console.log(
            "No categories found for user. Populating with defaults..."
          );
          for (const category of defaultCategories) {
            await addDoc(categoriesCol, {
              ...category,
              userId: currentUser.uid,
              createdAt: Timestamp.now(),
            });
          }
        }
      } catch (error) {
        console.error(
          "Error checking or populating default categories:",
          error
        );
      }
    };

    checkAndPopulateCategories();

    // Subscribe to categories collection
    // Runs initially to fetch all categories, then runs on every change
    unsubscribeCategories = onSnapshot(
      categoriesCol,
      (querySnapshot) => {
        const fetchedCategories = [];
        querySnapshot.forEach((doc) => {
          fetchedCategories.push({ id: doc.id, ...doc.data() });
        });

        setUserCategories(fetchedCategories);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading categories:", error);
        setLoading(false);
      }
    );

    // ========== TRANSACTIONS LISTENER ==========
    // Path: artifacts/{appId}/users/{userId}/transactions
    // Fetches all user transactions, sorts by date (newest first)
    try {
      const transactionsCol = collection(
        db,
        `artifacts/${appId}/users/${currentUser.uid}/transactions`
      );
      const qTransactions = query(transactionsCol);

      // Subscribe to transactions collection
      unsubscribeTransactions = onSnapshot(
        qTransactions,
        (querySnapshot) => {
          const transactionsData = [];
          querySnapshot.forEach((doc) => {
            transactionsData.push({ id: doc.id, ...doc.data() });
          });

          // Sort newest transactions first (for display in lists)
          transactionsData.sort(
            (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
          );
          setTransactions(transactionsData);
        },
        (error) => {
          console.error("Error loading transactions:", error);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("Error setting up transaction listener:", error);
      setLoading(false);
    }

    // ========== CLEANUP FUNCTION ==========
    // Called when:
    // 1. Component unmounts
    // 2. Dependency array changes (user logs out/in)
    // Unsubscribes from Firestore listeners to prevent memory leaks
    return () => {
      unsubscribeTransactions();
      unsubscribeCategories();
    };
  }, [currentUser, appId]);

  // ==================== Billing Cycle Boundary Calculations ====================

  /**
   * getCycleBoundaries(month, year)
   *
   * Calculates start and end dates for the current billing cycle
   *
   * Behavior:
   * - cycleType === "calendar": Returns standard calendar month (1st - last day)
   * - cycleType === "custom": Returns user-defined date range from localStorage
   *
   * Returns: { start: Date, end: Date }
   * - start: First moment of the period (00:00:00)
   * - end: Last moment of the period (23:59:59.999)
   *
   * Examples:
   * Calendar mode, March 2024:
   *   Returns: { start: Mar 1 00:00:00, end: Mar 31 23:59:59.999 }
   *
   * Custom mode, 15th to 14th:
   *   Returns: { start: 2024-03-15, end: 2024-04-14 }
   */
  const getCycleBoundaries = (month, year) => {
    if (cycleType === "calendar") {
      // Calendar month: 1st of current month to last day of current month
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end };
    } else {
      // Custom cycle: use stored start/end dates
      return {
        start: new Date(customDateRange.start),
        end: new Date(customDateRange.end),
      };
    }
  };

  /**
   * formatCycleHeader(month, year)
   *
   * Formats cycle boundaries as human-readable text for UI display
   *
   * Examples:
   * - Calendar mode: "March 2024"
   * - Custom mode: "Mar 15, 2024 - Apr 14, 2024"
   */
  const formatCycleHeader = (month, year) => {
    if (cycleType === "calendar") {
      // "March 2024" format
      return new Date(year, month).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
    } else {
      // "Mar 15, 2024 - Apr 14, 2024" format
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);

      const startStr = start.toLocaleDateString("default", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const endStr = end.toLocaleDateString("default", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return `${startStr} - ${endStr}`;
    }
  };

  /**
   * formatCycleSettingInfo()
   *
   * Returns user-friendly text describing the current billing cycle setting
   * Displayed in settings/info screens
   *
   * Examples:
   * - Calendar mode: "Calendar Month (1st - EOM)"
   * - Custom mode: "3/15/2024 to 4/14/2024"
   */
  const formatCycleSettingInfo = () => {
    if (cycleType === "calendar") {
      return "Calendar Month (1st - EOM)";
    } else {
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);
      return `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
    }
  };

  // ==================== Budget Surplus Forwarding ====================

  /**
   * forwardSurplus(surplusData)
   *
   * Purpose:
   * Transfers budget surplus (remaining balance) from current period to next period.
   * Creates two transactions: one expense (rollout) and one income (rollin).
   * Updates category spentAmount to reflect the forwarded surplus.
   *
   * When to use:
   * - User finishes a budget period with leftover money
   * - Wants to carry forward that balance to next period
   * - Provides continuity of budgets across periods
   *
   * Parameters:
   * surplusData: Array of { categoryName: string, balance: number }
   *
   * Guard Checks:
   * 1. currentUser exists (user must be logged in)
   * 2. Viewed period is complete (today > cycleEnd)
   * 3. Balance > 0 (only forward positive balances)
   * 4. Target date calculation handles edge cases (e.g., Feb 31 → Feb 28)
   *
   * Process Flow:
   * 1. Verify viewed period is complete (prevent early forwarding)
   * 2. Calculate target date in next period (same day, or last day if invalid)
   * 3. Create two transactions per category:
   *    - Expense on cycle end date (rolls out the surplus)
   *    - Income on next period date (rolls in the surplus)
   * 4. Update category spentAmount to track forward movement
   * 5. Return true on success, false on failure
   *
   * Example:
   * Forward $200 from Food budget:
   * - Date: Mar 31 (cycle end) - adds $200 expense to Food
   * - Date: Apr 15 (next period date) - adds $200 income to Food
   * Result: Food balance carries over to next period
   *
   * Returns: true (success) | false (failure/guard check failed)
   */
  const forwardSurplus = async (surplusData) => {
    if (!currentUser) return false;

    const { end: viewedCycleEnd } = getCycleBoundaries(
      currentMonth,
      currentYear
    );
    const today = new Date();

    // Guard: Only allow forwarding from completed periods
    const isViewedPeriodComplete = today > viewedCycleEnd;

    // ✅ NEW: Restrict to calendar mode only
    if (cycleType !== "calendar") {
      alert(
        "Surplus forwarding is only available in Calendar Month mode. Please switch your billing cycle in settings."
      );
      return false;
    }

    if (!isViewedPeriodComplete) {
      alert(
        "Forwarding failed: Funds can only be forwarded from a completed budget period."
      );
      return false;
    }

    // ========== TARGET DATE CALCULATION ==========
    // Attempt to create date with same day of month in next period
    let targetDate = new Date(
      viewedCycleEnd.getFullYear(),
      viewedCycleEnd.getMonth() + 1,
      today.getDate()
    );

    // Edge case: If month doesn't have that day (e.g., Feb 31), use last day of month
    if (targetDate.getDate() !== today.getDate()) {
      targetDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        0
      );
    }

    const targetTimestamp = Timestamp.fromDate(targetDate);
    const sourceTimestamp = Timestamp.fromDate(viewedCycleEnd);

    setLoading(true);

    const transactionsRef = collection(
      db,
      `artifacts/${appId}/users/${currentUser.uid}/transactions`
    );
    const categoriesRef = collection(
      db,
      `artifacts/${appId}/users/${currentUser.uid}/categories`
    );

    try {
      // ========== PROCESS EACH CATEGORY'S SURPLUS ==========
      const promises = surplusData.map(async ({ categoryName, balance }) => {
        // Skip categories with no surplus (balance <= 0)
        if (balance <= 0) return;

        // Create rollout expense transaction
        // Records surplus being moved out of current period
        await addDoc(transactionsRef, {
          type: "expense",
          amount: balance,
          category: categoryName,
          description: `Surplus roll-out to next period`,
          date: sourceTimestamp,
          userId: currentUser.uid,
          createdAt: Timestamp.now(),
          isRollOver: true, // Flag: This is a rollover transaction
        });

        // Create rollin income transaction
        // Records surplus being moved into next period
        await addDoc(transactionsRef, {
          type: "income",
          amount: balance,
          category: categoryName,
          description: `Surplus roll-over from previous period`,
          date: targetTimestamp,
          userId: currentUser.uid,
          createdAt: Timestamp.now(),
          isRollOver: true, // Flag: This is a rollover transaction
        });

        // Update category spentAmount to reflect forwarded balance
        const q = query(categoriesRef, where("name", "==", categoryName));
        const categorySnapshot = await getDocs(q);

        if (!categorySnapshot.empty) {
          const categoryDoc = categorySnapshot.docs[0];
          const categoryId = categoryDoc.id;
          const currentData = categoryDoc.data();
          const newSpentAmount = (currentData.spentAmount || 0) + balance;

          await updateDoc(doc(categoriesRef, categoryId), {
            spentAmount: newSpentAmount,
          });
        }
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error("Error during surplus forwarding:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ==================== Month & Day Navigation ====================

  /**
   * changeMonth(delta)
   *
   * Purpose:
   * Navigates to a different month for viewing/filtering data.
   * Updates both calendar month state AND custom cycle dates (if in custom mode).
   *
   * Parameters:
   * delta: -1 (previous month) | +1 (next month)
   *
   * Behavior:
   * 1. Update currentMonth/currentYear (handles year wraparound)
   * 2. Reset currentDay to 1 (avoid invalid dates like Feb 31)
   * 3. If cycleType === "custom": Calculate new custom date range
   *    - Get range duration (e.g., 30 days)
   *    - Add that duration to both start and end dates
   *    - Result: Custom cycle "slides" forward by same duration
   *
   * Example:
   * Current: March 1-31 in calendar mode
   * changeMonth(1) → April 1-30
   *
   * Current: Mar 15 - Apr 14 in custom mode
   * changeMonth(1) → Apr 15 - May 14 (maintains ~30-day cycle)
   *
   * Used by: OverviewSection and ExpenseList navigation buttons
   */
  const changeMonth = (delta) => {
    // Always update calendar month state (required for OverviewSection)
    setCurrentMonth((prev) => {
      let newMonth = prev + delta;
      let newYear = currentYear;

      // Handle month wraparound
      if (newMonth < 0) {
        newMonth = 11; // December
        newYear--;
      } else if (newMonth > 11) {
        newMonth = 0; // January
        newYear++;
      }

      setCurrentYear(newYear);
      setCurrentDay(1);
      return newMonth;
    });

    // Also update custom date range if in custom mode (for ExpenseList)
    // This ensures custom cycle dates shift forward/back with month navigation
    if (cycleType === "custom") {
      const currentStart = new Date(customDateRange.start);
      const currentEnd = new Date(customDateRange.end);
      const rangeInMs = currentEnd - currentStart;

      // Calculate new dates by adding/subtracting the cycle duration
      const newStart = new Date(currentStart.getTime() + delta * rangeInMs);
      const newEnd = new Date(currentEnd.getTime() + delta * rangeInMs);

      setCustomDateRange({
        start: newStart.toISOString().split("T")[0],
        end: newEnd.toISOString().split("T")[0],
      });
    }
  };

  /**
   * changeDay(delta)
   *
   * Purpose:
   * Navigate to a different day, updating all date state variables.
   * Handles month/year wraparound automatically.
   *
   * Parameters:
   * delta: -1 (previous day) | +1 (next day) | any positive/negative number
   *
   * Process:
   * 1. Create date from currentYear/currentMonth/currentDay
   * 2. Add delta days to that date
   * 3. JavaScript Date handles wraparound automatically:
   *    - Jan 1 - 1 day = Dec 31 of previous year
   *    - Feb 28 + 1 day = Mar 1 (or Feb 29 in leap year)
   * 4. Extract new year, month, day from result date
   * 5. Update all three state variables
   *
   * Example:
   * Current: Mar 1, 2024
   * changeDay(-1) → Feb 29, 2024 (leap year handles automatically)
   *
   * Current: Dec 31, 2024
   * changeDay(1) → Jan 1, 2025 (year wraparound handled)
   */
  const changeDay = (delta) => {
    const currentDate = new Date(currentYear, currentMonth, currentDay);
    currentDate.setDate(currentDate.getDate() + delta);

    setCurrentYear(currentDate.getFullYear());
    setCurrentMonth(currentDate.getMonth());
    setCurrentDay(currentDate.getDate());
  };

  // ==================== Transaction CRUD Operations ====================

  /**
   * addTransaction(transaction)
   *
   * Purpose:
   * Add a new income or expense transaction to Firestore.
   * Also updates the associated category's budgetAmount (income) or spentAmount (expense).
   *
   * Parameters:
   * transaction: {
   *   type: 'income' | 'expense',
   *   amount: number (QAR),
   *   category: string (category name),
   *   description: string (user note),
   *   date: ISO string or Date object
   * }
   *
   * Process:
   * 1. Verify user is authenticated
   * 2. Add transaction document to Firestore with Timestamp
   * 3. Find associated category by name
   * 4. Update category amounts:
   *    - Income type: Add amount to budgetAmount
   *    - Expense type: Add amount to spentAmount
   * 5. Return true on success, false on failure
   *
   * Example:
   * ```javascript
   * const success = await addTransaction({
   *   type: 'expense',
   *   amount: 50.00,
   *   category: 'Food',
   *   description: 'Grocery shopping',
   *   date: '2024-03-15'
   * });
   * ```
   *
   * Returns: true (success) | false (failure)
   */
  const addTransaction = async (transaction) => {
    if (!currentUser) {
      console.warn("Cannot add transaction: No user authenticated.");
      return false;
    }

    setLoading(true);
    try {
      // Add transaction to Firestore
      await addDoc(
        collection(
          db,
          `artifacts/${appId}/users/${currentUser.uid}/transactions`
        ),
        {
          ...transaction,
          userId: currentUser.uid,
          date: Timestamp.fromDate(new Date(transaction.date)),
          createdAt: Timestamp.now(),
        }
      );

      // Find the category associated with this transaction
      const categoryToUpdateQuery = query(
        collection(
          db,
          `artifacts/${appId}/users/${currentUser.uid}/categories`
        ),
        where("name", "==", transaction.category)
      );

      const categorySnapshot = await getDocs(categoryToUpdateQuery);
      if (!categorySnapshot.empty) {
        const categoryDoc = categorySnapshot.docs[0];
        const categoryId = categoryDoc.id;
        const currentData = categoryDoc.data();

        // Update category amounts based on transaction type
        if (transaction.type === "income") {
          // Income adds to budget available
          const newBudget =
            (currentData.budgetAmount || 0) + transaction.amount;
          await updateDoc(
            doc(
              db,
              `artifacts/${appId}/users/${currentUser.uid}/categories`,
              categoryId
            ),
            {
              budgetAmount: newBudget,
            }
          );
        } else if (transaction.type === "expense") {
          // Expense adds to amount spent
          const newSpent = (currentData.spentAmount || 0) + transaction.amount;
          await updateDoc(
            doc(
              db,
              `artifacts/${appId}/users/${currentUser.uid}/categories`,
              categoryId
            ),
            {
              spentAmount: newSpent,
            }
          );
        }
      }
      return true;
    } catch (error) {
      console.error("Error adding transaction:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * deleteTransaction(transactionId)
   *
   * Purpose:
   * Remove a transaction from Firestore by ID.
   * Note: Does NOT update category amounts (consider for future enhancement)
   *
   * Parameters:
   * transactionId: Firestore document ID of transaction to delete
   *
   * Returns: true (success) | false (failure)
   */
  const deleteTransaction = async (transactionId) => {
    if (!currentUser) {
      console.warn("Cannot delete transaction: No user authenticated.");
      return false;
    }

    setLoading(true);
    try {
      await deleteDoc(
        doc(
          db,
          `artifacts/${appId}/users/${currentUser.uid}/transactions`,
          transactionId
        )
      );
      return true;
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ==================== Category CRUD Operations ====================

  /**
   * addCategory(name, budgetAmount)
   *
   * Purpose:
   * Create a new expense or income category with optional initial budget.
   * If budgetAmount > 0, automatically creates an income transaction for that amount.
   * Prevents duplicate category names.
   *
   * Parameters:
   * name: string (category name, e.g., "Food", "Transport")
   * budgetAmount: number (optional, initial budget in QAR)
   *
   * Process:
   * 1. Verify user is authenticated and name is not empty
   * 2. Query existing categories to prevent duplicates
   * 3. Return false if category with same name exists
   * 4. Create new category document in Firestore
   * 5. If budgetAmount > 0:
   *    - Create income transaction for that amount (today's date)
   *    - This represents initial budget allocation
   * 6. Return true on success, false on failure
   *
   * Example:
   * ```javascript
   * // Create category with 500 QAR initial budget
   * const success = await addCategory('Entertainment', 500);
   * // This creates:
   * // 1. Category document: { name: 'Entertainment', budgetAmount: 0, ... }
   * // 2. Income transaction: 500 QAR for Entertainment category today
   * ```
   *
   * Returns: true (success) | false (failure or duplicate)
   */
  const addCategory = async (name, budgetAmount) => {
    if (!currentUser || !name.trim()) {
      console.warn("Cannot add category: Missing user or name.");
      return false;
    }

    const categoriesRef = collection(
      db,
      `artifacts/${appId}/users/${currentUser.uid}/categories`
    );
    const q = query(categoriesRef, where("name", "==", name.trim()));
    const querySnapshot = await getDocs(q);

    // Guard: Prevent duplicate category names
    if (!querySnapshot.empty) {
      console.warn(`Category '${name}' already exists.`);
      return false;
    }

    setLoading(true);
    try {
      // Create category document
      await addDoc(categoriesRef, {
        name: name.trim(),
        budgetAmount: budgetAmount || 0,
        spentAmount: 0,
        userId: currentUser.uid,
        createdAt: Timestamp.now(),
      });

      // If budget amount provided, create income transaction for it
      if (budgetAmount > 0) {
        const transactionsRef = collection(
          db,
          `artifacts/${appId}/users/${currentUser.uid}/transactions`
        );
        await addDoc(transactionsRef, {
          type: "income",
          amount: budgetAmount,
          category: name.trim(),
          description: `Initial budget for ${name.trim()}`,
          date: Timestamp.now(),
          userId: currentUser.uid,
          createdAt: Timestamp.now(),
        });
      }

      return true;
    } catch (error) {
      console.error("Error adding category:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * deleteCategory(categoryId)
   *
   * Purpose:
   * Remove a category from Firestore by ID.
   * Note: Associated transactions are NOT deleted (orphaned references)
   * Consider adding cascade delete in future enhancement
   *
   * Parameters:
   * categoryId: Firestore document ID of category to delete
   *
   * Returns: true (success) | false (failure)
   */
  const deleteCategory = async (categoryId) => {
    if (!currentUser || !categoryId) {
      console.warn("Cannot delete category: Missing user or ID.");
      return false;
    }

    setLoading(true);
    try {
      await deleteDoc(
        doc(
          db,
          `artifacts/${appId}/users/${currentUser.uid}/categories`,
          categoryId
        )
      );
      return true;
    } catch (error) {
      console.error("Error deleting category:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ==================== Context Value & Provider ====================

  /**
   * Context Value Object
   *
   * This object is provided to all consuming components via TransactionContext.Provider
   * Components access these values with the useTransactions() hook
   *
   * Data (Read-only state):
   * - transactions: Array of all user's transactions
   * - currentMonth: 0-indexed current month (0=Jan, 11=Dec)
   * - currentYear: Full year number
   * - currentDay: Day of month (1-31)
   * - userCategories: Array of all user's categories
   * - loading: boolean, true during async operations
   * - cycleType: "calendar" or "custom"
   * - customDateRange: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
   *
   * Functions (Mutation):
   * - addTransaction(transaction): Create new transaction
   * - deleteTransaction(id): Remove transaction
   * - addCategory(name, amount): Create new category
   * - deleteCategory(id): Remove category
   * - changeMonth(delta): Navigate between months
   * - changeDay(delta): Navigate between days
   * - forwardSurplus(data): Transfer surplus to next period
   * - setCycleType(mode): Update billing cycle mode
   * - setCustomDateRange(range): Update custom cycle dates
   * - getCycleBoundaries(month, year): Get date boundaries
   * - formatCycleHeader(month, year): Format cycle name for display
   * - formatCycleSettingInfo(): Get current cycle info text
   */
  const value = {
    // ===== State Data =====
    transactions,
    currentMonth,
    currentYear,
    currentDay,
    userCategories,
    loading,
    cycleType,
    customDateRange,

    // ===== Transaction Mutations =====
    addTransaction,
    deleteTransaction,

    // ===== Category Mutations =====
    addCategory,
    deleteCategory,

    // ===== Navigation =====
    changeMonth,
    changeDay,

    // ===== Budget Operations =====
    forwardSurplus,

    // ===== Settings =====
    setCycleType,
    setCustomDateRange,

    // ===== Utilities =====
    getCycleBoundaries,
    formatCycleHeader,
    formatCycleSettingInfo,
  };

  // ===== Provider Render =====
  // Wrap entire app with TransactionContext.Provider
  // Makes context value available to all child components
  // Components consume with: const context = useTransactions()
  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}
