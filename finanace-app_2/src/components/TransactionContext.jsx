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
    // FIX: Ensure useState is used for currentDay initialization
    const [currentDay, setCurrentDay] = useState(new Date().getDate());
    const [loading, setLoading] = useState(false);
    const { currentUser } = useAuth();

    const [userCategories, setUserCategories] = useState([]);

    const defaultCategories = [
        { name: "Food", budgetAmount: 0, spentAmount: 0, type: "expense" },
        { name: "Transport", budgetAmount: 0, spentAmount: 0, type: "expense" },
        { name: "Rent", budgetAmount: 0, spentAmount: 0, type: "expense" },
        { name: "Utilities", budgetAmount: 0, spentAmount: 0, type: "expense" },
        { name: "Entertainment", budgetAmount: 0, spentAmount: 0, type: "expense" },
        { name: "Health", budgetAmount: 0, spentAmount: 0, type: "expense" },
        { name: "Shopping", budgetAmount: 0, spentAmount: 0, type: "expense" },
        { name: "Education", budgetAmount: 0, spentAmount: 0, type: "expense" },
        { name: "Savings", budgetAmount: 0, spentAmount: 0, type: "income" },
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
            
            if (budgetAmount > 0) {
                const transactionsRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`);
                await addDoc(transactionsRef, {
                    type: 'income',
                    amount: budgetAmount,
                    category: name.trim(),
                    description: `Initial budget for ${name.trim()}`,
                    date: Timestamp.now(),
                    userId: currentUser.uid,
                    createdAt: Timestamp.now()
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

    const forwardSurplus = async (surplusData, viewDate) => {
        if (!currentUser) return false;

        const viewedMonth = viewDate.getMonth();
        const viewedYear = viewDate.getFullYear();
        const today = new Date();
        
        const isViewedMonthInPast = 
            today.getFullYear() > viewedYear ||
            (today.getFullYear() === viewedYear && today.getMonth() > viewedMonth);

        if (!isViewedMonthInPast) {
            console.warn("Forwarding failed: Funds can only be forwarded from a completed budget period (a past month).");
            return false;
        }

        // Target: First day of the month AFTER the viewed month.
        const targetDate = new Date(viewedYear, viewedMonth + 1, 1); 
        const targetTimestamp = Timestamp.fromDate(targetDate);
        
        // Source: Last day of the viewed month (for the expense transaction)
        const sourceDate = new Date(viewedYear, viewedMonth + 1, 0); 
        const sourceTimestamp = Timestamp.fromDate(sourceDate);

        setLoading(true);
        
        const transactionsRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`);
        const categoriesRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/categories`);

        try {
            const promises = surplusData.map(async ({ categoryName, balance }) => {
                if (balance <= 0) return; 
                
                // 1. Source Month: Create an EXPENSE transaction to zero out the surplus
                await addDoc(transactionsRef, {
                    type: 'expense',
                    amount: balance,
                    category: categoryName,
                    description: `Surplus roll-out to next period (Zeroing ${viewedYear}-${(viewedMonth + 1).toString().padStart(2, '0')})`,
                    date: sourceTimestamp, // Dated for the end of the source month
                    userId: currentUser.uid,
                    createdAt: Timestamp.now(),
                    isRollOver: true,
                });

                // 2. Target Month: Create an INCOME transaction (the roll-over budget)
                await addDoc(transactionsRef, {
                    type: 'income',
                    amount: balance,
                    category: categoryName,
                    description: `Surplus roll-over from previous period`,
                    date: targetTimestamp, // Dated for the start of the target month
                    userId: currentUser.uid,
                    createdAt: Timestamp.now(),
                    isRollOver: true,
                });

                // 3. Update the category's aggregate budget (needed for the roll-out expense)
                const q = query(categoriesRef, where("name", "==", categoryName));
                const categorySnapshot = await getDocs(q);
                
                if (!categorySnapshot.empty) {
                    const categoryDoc = categorySnapshot.docs[0];
                    const categoryId = categoryDoc.id;
                    const currentData = categoryDoc.data();
                    
                    // Add the roll-out expense amount to the category's spent amount
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
        forwardSurplus,
        loading
    };

    return (
        <TransactionContext.Provider value={value}>
            {children}
        </TransactionContext.Provider>
    );
}