import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, appId } from '../firebase';
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
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

const TransactionContext = createContext();

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const [userCategories, setUserCategories] = useState([]);

  const defaultCategories = [
    { name: "Food", budgetAmount: 0, spentAmount: 0 },
    { name: "Transport", budgetAmount: 0, spentAmount: 0 },
    { name: "Rent", budgetAmount: 0, spentAmount: 0 },
    { name: "Utilities", budgetAmount: 0, spentAmount: 0 },
    { name: "Entertainment", budgetAmount: 0, spentAmount: 0 },
    { name: "Health", budgetAmount: 0, spentAmount: 0 },
    { name: "Shopping", budgetAmount: 0, spentAmount: 0 },
    { name: "Education", budgetAmount: 0, spentAmount: 0 },
    { name: "Savings", budgetAmount: 0, spentAmount: 0 },
  ];

  useEffect(() => {
    let unsubscribeTransactions = () => {};
    let unsubscribeCategories = () => {};

    if (!currentUser) {
      setTransactions([]);
      setUserCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const categoriesCol = collection(db, `artifacts/${appId}/users/${currentUser.uid}/categories`);
    
    // Check if the user has any categories. If not, add the defaults.
    const checkAndPopulateCategories = async () => {
        try {
            const categoriesSnapshot = await getDocs(categoriesCol);
            if (categoriesSnapshot.empty) {
                console.log("No categories found for user. Populating with defaults...");
                for (const category of defaultCategories) {
                    await addDoc(categoriesCol, {
                        ...category,
                        userId: currentUser.uid,
                        createdAt: Timestamp.now()
                    });
                }
            }
        } catch (error) {
            console.error("Error checking or populating default categories:", error);
        }
    };
    
    checkAndPopulateCategories();

    // Set up the real-time listener for categories
    unsubscribeCategories = onSnapshot(categoriesCol, (querySnapshot) => {
        const fetchedCategories = [];
        querySnapshot.forEach((doc) => {
            fetchedCategories.push({ id: doc.id, ...doc.data() });
        });
        
        setUserCategories(fetchedCategories);
        setLoading(false);
    }, (error) => {
        console.error("Error loading categories:", error);
        setLoading(false);
    });

    // Set up the real-time listener for transactions
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
        }, (error) => {
            console.error("Error loading transactions:", error);
            setLoading(false);
        });
    } catch (error) {
        console.error("Error setting up transaction listener:", error);
        setLoading(false);
    }

    return () => {
      unsubscribeTransactions();
      unsubscribeCategories();
    };
  }, [currentUser, appId]);

  const addCategory = async (name, budgetAmount) => {
    if (!currentUser || !name.trim()) {
      console.warn("Cannot add category: Missing user or name.");
      return false;
    }

    const categoriesRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/categories`);
    const q = query(categoriesRef, where("name", "==", name.trim()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.warn(`Category '${name}' already exists.`);
      return false;
    }

    setLoading(true);
    try {
      await addDoc(categoriesRef, {
        name: name.trim(),
        budgetAmount: budgetAmount || 0,
        spentAmount: 0,
        userId: currentUser.uid,
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

  const deleteCategory = async (categoryId) => {
    if (!currentUser || !categoryId) {
      console.warn("Cannot delete category: Missing user or ID.");
      return false;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${currentUser.uid}/categories`, categoryId));
      return true;
    } catch (error) {
      console.error("Error deleting category:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transaction) => {
    if (!currentUser) {
      console.warn("Cannot add transaction: No user authenticated.");
      return false;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`), {
        ...transaction,
        userId: currentUser.uid,
        date: Timestamp.fromDate(new Date(transaction.date)),
        createdAt: Timestamp.now()
      });

      const categoryToUpdateQuery = query(
        collection(db, `artifacts/${appId}/users/${currentUser.uid}/categories`),
        where("name", "==", transaction.category)
      );

      const categorySnapshot = await getDocs(categoryToUpdateQuery);
      if (!categorySnapshot.empty) {
        const categoryDoc = categorySnapshot.docs[0];
        const categoryId = categoryDoc.id;
        const currentData = categoryDoc.data();

        if (transaction.type === 'income') {
          const newBudget = (currentData.budgetAmount || 0) + transaction.amount;
          await updateDoc(doc(db, `artifacts/${appId}/users/${currentUser.uid}/categories`, categoryId), {
            budgetAmount: newBudget
          });
        } else if (transaction.type === 'expense') {
          const newSpent = (currentData.spentAmount || 0) + transaction.amount;
          await updateDoc(doc(db, `artifacts/${appId}/users/${currentUser.uid}/categories`, categoryId), {
            spentAmount: newSpent
          });
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
      setCurrentDay(1);
      return newMonth;
    });
  };

  const changeDay = (delta) => {
    const currentDate = new Date(currentYear, currentMonth, currentDay);
    currentDate.setDate(currentDate.getDate() + delta);

    setCurrentYear(currentDate.getFullYear());
    setCurrentMonth(currentDate.getMonth());
    setCurrentDay(currentDate.getDate());
  };

  const value = {
    transactions,
    currentMonth,
    currentYear,
    currentDay,
    userCategories,
    addTransaction,
    deleteTransaction,
    addCategory,
    deleteCategory,
    changeMonth,
    changeDay,
    loading
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}