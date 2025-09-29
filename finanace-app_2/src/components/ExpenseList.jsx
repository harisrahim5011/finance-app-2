import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const ExpenseList = ({ filteredTransactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Safely ensure filteredTransactions is an array for reduce()
  const transactionsArray = Array.isArray(filteredTransactions)
    ? filteredTransactions
    : Object.values(filteredTransactions || {});

  // 2. Calculate the income, expense, and balance for each category
  const categorySummary = transactionsArray.reduce((acc, t) => {
    if (!t || typeof t.amount !== "number" || !t.category || !t.type) {
      return acc;
    }

    const { category, amount, type } = t;

    if (!acc[category]) {
      acc[category] = {
        income: 0,
        expense: 0,
        balance: 0,
      };
    }

    if (type === "income") {
      acc[category].income += amount;
      acc[category].balance += amount;
    } else if (type === "expense") {
      acc[category].expense += amount;
      acc[category].balance -= amount;
    }

    return acc;
  }, {});

  // 3. Prepare the final list for rendering
  const expenseCategoriesList = Object.keys(categorySummary)
    .filter(
      (categoryName) =>
        categorySummary[categoryName].income > 0 ||
        categorySummary[categoryName].expense > 0
    )
    .map((categoryName) => ({
      name: categoryName,
      id: categoryName,
      ...categorySummary[categoryName],
    }));

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // Function to calculate percentage REMAINING
  const calculatePercentageRemaining = (expense, income) => {
    if (income === 0 || !income) return 0;

    const spentPercentage = (expense / income) * 100;
    const remainingPercentage = 100 - spentPercentage;

    return Math.max(0, remainingPercentage);
  };

  // Function to determine color based on percentage REMAINING
  const getProgressBarColor = (percentageRemaining) => {
    if (percentageRemaining > 50) {
      // More than 50% remaining is good -> GREEN
      return "bg-green-500";
    } else if (percentageRemaining > 15) {
      // 15% to 50% remaining is a warning -> YELLOW
      return "bg-yellow-500";
    } else {
      // Less than 15% remaining is critical -> RED
      return "bg-red-500";
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          className="inline-flex justify-center items-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-in-out"
          id="menu-button"
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={toggleDropdown}
        >
          Expense List
          {isOpen ? (
            <ChevronUp className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute w-[250%] mt-2 -left-[6.7rem] max-w-md md:max-w-lg lg:max-w-xl rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex="-1"
        >
          <div className="py-1 max-h-60 overflow-y-auto" role="none">
            {expenseCategoriesList.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">
                No activity recorded for this month.
              </div>
            ) : (
              expenseCategoriesList.map((category) => {
                const percentageRemaining = calculatePercentageRemaining(
                  category.expense,
                  category.income
                );

                // FIX: Use percentageRemaining for the progress bar width
                // The bar fills as the budget remains.
                const progressBarWidth = percentageRemaining;

                const progressBarColor =
                  getProgressBarColor(percentageRemaining);
                const balance = category.balance;

                return (
                  <div
                    key={category.id}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md mx-1 my-0.5 cursor-pointer"
                    role="menuitem"
                    tabIndex="-1"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs text-gray-500">
                        {/* Display Expense vs Income */}
                        Exp: QAR {category.expense.toFixed(2)} / Inc: QAR{" "}
                        {category.income.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${progressBarColor}`}
                        // Corrected: Use percentageRemaining (progressBarWidth) for the visual width.
                        style={{ width: `${progressBarWidth}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-gray-600">
                        {/* Display percentage REMAINING */}
                        {percentageRemaining.toFixed(0)}% Remaining
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          balance < 0 ? "text-red-500" : "text-green-600"
                        }`}
                      >
                        Balance: QAR {balance.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
