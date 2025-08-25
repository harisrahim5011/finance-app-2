import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react'; // Using lucide-react for icons

const ExpenseList = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sample expense data with current spent amount and budget
  // Added more items to demonstrate scrolling
  const expenseCategories = [
    { name: 'Groceries', spent: 300, budget: 500 },
    { name: 'Utilities', spent: 150, budget: 200 },
    { name: 'Transportation', spent: 100, budget: 300 },
    { name: 'Dining Out', spent: 250, budget: 250 },
    { name: 'Savings', spent: 400, budget: 1000 },
    { name: 'Entertainment', spent: 80, budget: 150 },
    { name: 'Shopping', spent: 200, budget: 300 },
    { name: 'Health', spent: 50, budget: 100 },
    { name: 'Education', spent: 75, budget: 100 },
    { name: 'Miscellaneous', spent: 60, budget: 100 },
  ];

  // Function to toggle the dropdown's visibility
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Effect to handle clicks outside the dropdown to close it
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

  // Function to calculate the percentage of budget remaining
  const calculatePercentage = (spent, budget) => {
    if (budget === 0) return 0; // Avoid division by zero
    const remaining = budget - spent;
    return Math.max(0, (remaining / budget) * 100); // Ensure percentage doesn't go below 0
  };

  // Determine the color of the progress bar based on percentage
  const getProgressBarColor = (percentage) => {
    if (percentage > 70) {
      return 'bg-green-500'; // Plenty of budget left
    } else if (percentage > 30) {
      return 'bg-yellow-500'; // Getting low
    } else {
      return 'bg-red-500'; // Very low or over budget
    }
  };

  return (
    // <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4 font-inter">
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
              {expenseCategories.map((category, index) => {
                const percentage = calculatePercentage(category.spent, category.budget);
                const progressBarColor = getProgressBarColor(percentage);

                return (
                  <div
                    key={index}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md mx-1 my-0.5 cursor-pointer"
                    role="menuitem"
                    tabIndex="-1"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs text-gray-500">${category.spent} / ${category.budget}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${progressBarColor}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-right mt-1 text-gray-600">
                      {percentage.toFixed(0)}% Remaining
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    // </div> // End of main container
  );
};

export default ExpenseList;
