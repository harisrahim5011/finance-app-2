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

    // Billing cycle settings
    const [cycleType, setCycleType] = useState(() => {
        const saved = localStorage.getItem("userInfo_billingCycle_type");
        return saved || "calendar";
    });
    
    const [customDateRange, setCustomDateRange] = useState(() => {
        const savedStart = localStorage.getItem("userInfo_customStartDate");
        const savedEnd = localStorage.getItem("userInfo_customEndDate");
        
        const today = new Date();
        const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        return {
            start: savedStart || defaultStart.toISOString().split('T')[0],
            end: savedEnd || defaultEnd.toISOString().split('T')[0]
        };
    });

    // Persist settings
    useEffect(() => {
        localStorage.setItem("userInfo_billingCycle_type", cycleType);
    }, [cycleType]);
    
    useEffect(() => {
        localStorage.setItem("userInfo_customStartDate", customDateRange.start);
        localStorage.setItem("userInfo_customEndDate", customDateRange.end);
    }, [customDateRange]);

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

    const getCycleBoundaries = (month, year) => {
        if (cycleType === "calendar") {
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
            return { start, end };
        } else {
            return {
                start: new Date(customDateRange.start),
                end: new Date(customDateRange.end)
            };
        }
    };

    const formatCycleHeader = (month, year) => {
        if (cycleType === "calendar") {
            return new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
        } else {
            const start = new Date(customDateRange.start);
            const end = new Date(customDateRange.end);
            
            const startStr = start.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
            const endStr = end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
            
            return `${startStr} - ${endStr}`;
        }
    };

    const formatCycleSettingInfo = () => {
        if (cycleType === "calendar") {
            return "Calendar Month (1st - EOM)";
        } else {
            const start = new Date(customDateRange.start);
            const end = new Date(customDateRange.end);
            return `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
        }
    };

    const forwardSurplus = async (surplusData) => {
        if (!currentUser) return false;

        const { start: viewedCycleStart, end: viewedCycleEnd } = getCycleBoundaries(currentMonth, currentYear);
        const today = new Date();
        
        const isViewedPeriodComplete = today > viewedCycleEnd;
        
        if (!isViewedPeriodComplete) {
            alert("Forwarding failed: Funds can only be forwarded from a completed budget period.");
            return false;
        }

        let targetDate = new Date(
            viewedCycleEnd.getFullYear(),
            viewedCycleEnd.getMonth() + 1,
            today.getDate()
        );
        
        if (targetDate.getDate() !== today.getDate()) {
            targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        }
        
        const targetTimestamp = Timestamp.fromDate(targetDate);
        const sourceTimestamp = Timestamp.fromDate(viewedCycleEnd);

        setLoading(true);
        
        const transactionsRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`);
        const categoriesRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/categories`);

        try {
            const promises = surplusData.map(async ({ categoryName, balance }) => {
                if (balance <= 0) return; 
                
                await addDoc(transactionsRef, {
                    type: 'expense',
                    amount: balance,
                    category: categoryName,
                    description: `Surplus roll-out to next period`,
                    date: sourceTimestamp,
                    userId: currentUser.uid,
                    createdAt: Timestamp.now(),
                    isRollOver: true,
                });

                await addDoc(transactionsRef, {
                    type: 'income',
                    amount: balance,
                    category: categoryName,
                    description: `Surplus roll-over from previous period`,
                    date: targetTimestamp,
                    userId: currentUser.uid,
                    createdAt: Timestamp.now(),
                    isRollOver: true,
                });

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

    // ✅ FIXED: Always update currentMonth/currentYear for OverviewSection
    const changeMonth = (delta) => {
        // Always update calendar month state (required for OverviewSection)
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

        // Also update custom date range if in custom mode (for ExpenseList)
        if (cycleType === "custom") {
            const currentStart = new Date(customDateRange.start);
            const currentEnd = new Date(customDateRange.end);
            const rangeInMs = currentEnd - currentStart;
            
            const newStart = new Date(currentStart.getTime() + delta * rangeInMs);
            const newEnd = new Date(currentEnd.getTime() + delta * rangeInMs);
            
            setCustomDateRange({
                start: newStart.toISOString().split('T')[0],
                end: newEnd.toISOString().split('T')[0]
            });
        }
    };

    // ✅ FIXED: Added missing changeDay function
    const changeDay = (delta) => {
        const currentDate = new Date(currentYear, currentMonth, currentDay);
        currentDate.setDate(currentDate.getDate() + delta);

        setCurrentYear(currentDate.getFullYear());
        setCurrentMonth(currentDate.getMonth());
        setCurrentDay(currentDate.getDate());
    };

    // Add transaction
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

    // Add category
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

    // Delete transaction
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

    // Delete category
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
    }

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
        loading,
        cycleType,
        setCycleType,
        customDateRange,
        setCustomDateRange,
        getCycleBoundaries,
        formatCycleHeader,
        formatCycleSettingInfo,
    };

    return (
        <TransactionContext.Provider value={value}>
            {children}
        </TransactionContext.Provider>
    );
}