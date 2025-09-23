import React, { useState, useRef, useEffect } from 'react';
import { useTransactions } from '../components/TransactionContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ExpenseList = () => {
  const { userCategories } = useTransactions();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Filter categories to include only those with a spent amount,
  // which are relevant for an expense list.
  const expenseCategories = userCategories.filter(cat => cat.spentAmount > 0);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  const calculatePercentage = (spent, budget) => {
    if (budget === 0 || !budget) return 0;
    const remaining = budget - spent;
    return Math.max(0, (remaining / budget) * 100);
  };

  const getProgressBarColor = (percentage) => {
    if (percentage > 70) {
      return 'bg-green-500';
    } else if (percentage > 30) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
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
          className="origin-top-right absolute left-0 mt-2 w-screen max-w-md md:max-w-lg lg:max-w-xl rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex="-1"
        >
          <div className="py-1 max-h-60 overflow-y-auto" role="none">
            {expenseCategories.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">No expenses recorded yet.</div>
            ) : (
              expenseCategories.map((category) => {
                const percentage = calculatePercentage(category.spentAmount, category.budgetAmount);
                const progressBarColor = getProgressBarColor(percentage);
                const remaining = (category.budgetAmount || 0) - (category.spentAmount || 0);

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
                        QAR {category.spentAmount.toFixed(2)} / QAR {category.budgetAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${progressBarColor}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-gray-600">
                        {percentage.toFixed(0)}% Remaining
                      </div>
                      <div className={`text-xs font-semibold ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
                        QAR {remaining.toFixed(2)}
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