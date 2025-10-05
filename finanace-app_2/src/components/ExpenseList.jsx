import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, Send } from "lucide-react";

const ExpenseList = ({ filteredTransactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const dropdownRef = useRef(null);

  // 1. Safely ensure filteredTransactions is an array
  const transactionsArray = Array.isArray(filteredTransactions)
    ? filteredTransactions
    : Object.values(filteredTransactions || {});

  // 2. Calculate the income, expense, and balance for each category (Memoized)
  const categorySummary = useMemo(() => {
    return transactionsArray.reduce((acc, t) => {
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
  }, [transactionsArray]);

  // 3. Prepare the final list for rendering (Memoized)
  const expenseCategoriesList = useMemo(() => {
    return Object.keys(categorySummary)
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
  }, [categorySummary]);

  // --- Handlers for Dropdown and Forwarding ---

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      if (!prev) {
        setIsForwarding(false);
        setSelectedCategories([]);
      }
      return !prev;
    });
  };

  const toggleForwarding = (e) => {
    e.stopPropagation();
    setIsForwarding((prev) => !prev);
    setSelectedCategories([]);
  };

  const handleSelectCategory = (categoryName) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryName)) {
        return prev.filter((name) => name !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  const handleForwardSelected = () => {
    if (selectedCategories.length === 0) {
      alert("Please select at least one category to forward.");
      return;
    }

    const totalAmount = selectedCategories.reduce(
      (sum, name) => sum + (categorySummary[name]?.balance || 0),
      0
    );

    const isConfirmed = window.confirm(
      `Are you sure you want to forward a total of QAR ${totalAmount.toFixed(
        2
      )} from the ${selectedCategories.length} selected categories?`
    );

    if (!isConfirmed) {
      return;
    }

    const forwardingData = selectedCategories.map((name) => ({
      category: name,
      balance: categorySummary[name].balance,
    }));

    console.log("Forwarding the following categories:", forwardingData);
    alert(
      `Successfully initiated forwarding of QAR ${totalAmount.toFixed(2)}.`
    );

    setIsOpen(false);
    setIsForwarding(false);
    setSelectedCategories([]);
  };

  // --- Side Effect for Click Outside ---

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsForwarding(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // --- Utility Functions ---

  const calculatePercentageRemaining = (expense, income) => {
    if (income === 0 || !income) return 0;
    const spentPercentage = (expense / income) * 100;
    const remainingPercentage = 100 - spentPercentage;
    return Math.max(0, remainingPercentage);
  };

  const getProgressBarColor = (percentageRemaining) => {
    if (percentageRemaining > 50) {
      return "bg-green-500";
    } else if (percentageRemaining > 15) {
      return "bg-yellow-500";
    } else {
      return "bg-red-500";
    }
  };

  // --- Filtered List for Rendering ---

  const renderedCategoriesList = isForwarding
    ? expenseCategoriesList.filter((category) => category.balance > 0)
    : expenseCategoriesList;

  // --- Component Render ---

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
          {isForwarding ? "Select Funds to Forward" : "Expense List"}
          {isOpen ? (
            <ChevronUp className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="
            origin-top-right 
            absolute 
            mt-2 
            
            /* FIX: Width changed to 95vw */
            w-[95vw]                  /* Set width to 95% of Viewport Width */
            max-w-xl                  /* Use a standard max-width on large screens */
            
            left-1/2                  /* Move left edge to parent center */
            transform -translate-x-1/2 /* Shift back by half its width (centering) */
            
            rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in z-20
          "
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex="-1"
        >
          {/* Forward Button Section */}
          <div className="p-2 border-b border-gray-200 flex justify-between items-center">
            {isForwarding ? (
              <button
                onClick={handleForwardSelected}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors 
                    ${selectedCategories.length > 0 ? "text-white bg-blue-600 hover:bg-blue-700" : "text-gray-500 bg-gray-100 cursor-not-allowed"}`}
                disabled={selectedCategories.length === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Forward Selected ({selectedCategories.length})
              </button>
            ) : (
              <button
                onClick={toggleForwarding}
                className="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium rounded-md transition-colors"
              >
                <Send className="w-4 h-4 mr-2" />
                Forward Surplus
              </button>
            )}

            {isForwarding && (
              <button
                onClick={toggleForwarding}
                className="text-gray-500 hover:text-red-600 text-sm font-medium px-2"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Category List Section */}
          <div className="py-1 max-h-60 overflow-y-auto" role="none">
            {renderedCategoriesList.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">
                {isForwarding
                  ? "No categories have a positive balance to forward."
                  : "No activity recorded for this month."}
              </div>
            ) : (
              renderedCategoriesList.map((category) => {
                const percentageRemaining = calculatePercentageRemaining(
                  category.expense,
                  category.income
                );

                const progressBarWidth = percentageRemaining;
                const progressBarColor = getProgressBarColor(percentageRemaining);
                const balance = category.balance;
                const isChecked = selectedCategories.includes(category.name);

                return (
                  <div
                    key={category.id}
                    className={`px-4 py-2 text-sm rounded-md mx-1 my-0.5 ${isForwarding ? 'hover:bg-blue-50' : 'hover:bg-gray-100'}`}
                    role="menuitem"
                    tabIndex="-1"
                  >
                    <label className="flex justify-between items-center cursor-pointer w-full">
                        
                        {isForwarding && (
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSelectCategory(category.name)}
                                className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                        )}

                        <div className="flex-grow">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-gray-700">{category.name}</span>
                              <span className="text-xs text-gray-500">
                                Exp: QAR {category.expense.toFixed(2)} / Inc: QAR{" "}
                                {category.income.toFixed(2)}
                              </span>
                            </div>
                            
                            {!isForwarding && (
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-full rounded-full ${progressBarColor}`}
                                  style={{ width: `${progressBarWidth}%` }}
                                ></div>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center mt-1">
                              <div className="text-xs text-gray-600">
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
                    </label>
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