import React, { useState, useEffect } from "react";
import { useTransactions } from "../components/TransactionContext";

const AddTransactionModal = ({
  isOpen,
  onClose,
  showMessage,
  showConfirm,
  filteredTransactions,
}) => {
  const { userCategories, addTransaction, addCategory, deleteCategory } =
    useTransactions();

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [newCategoryBudget, setNewCategoryBudget] = useState("");

  const [selectedCategory, setSelectedCategory] = useState(null);

  // The NON_DELETABLE_DEFAULT_CATEGORIES array is now removed.

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      setDate(today.toISOString().split("T")[0]);
      setAmount("");
      setCategory("");
      setDescription("");
      setNewCategoryName("");
      setNewCategoryBudget("");
      setShowCategoryManagement(false);
    }
  }, [isOpen]);

  const categories = userCategories || [];

  useEffect(() => {
    if (category) {
      const currentCategory = categories.find((cat) => cat.name === category);
      setSelectedCategory(currentCategory);
    } else {
      setSelectedCategory(null);
    }
  }, [category, categories]);

  const handleAddCategory = async () => {
    if (newCategoryName.trim() === "") {
      showMessage("Please enter a name for the new category.", true);
      return;
    }
    const budgetAmount = parseFloat(newCategoryBudget);
    if (isNaN(budgetAmount) || budgetAmount < 0) {
      showMessage("Please enter a valid budget amount (can be 0).", true);
      return;
    }

    const success = await addCategory(newCategoryName.trim(), budgetAmount);
    if (success) {
      showMessage(`Category '${newCategoryName.trim()}' with budget added!`);
      setNewCategoryName("");
      setNewCategoryBudget("");
    } else {
      showMessage(`Error adding category '${newCategoryName.trim()}'.`, true);
    }
  };

  const handleDeleteCategory = async (categoryToDeleteName) => {
    if (typeof showConfirm !== "function") {
      console.error(
        "showConfirm function is not provided to AddTransactionModal."
      );
      showMessage("An internal error occurred. Cannot confirm deletion.", true);
      return;
    }

    showConfirm(
      `Are you sure you want to delete the category '${categoryToDeleteName}'? This will not affect existing transactions.`,
      async () => {
        const categoryToDelete = userCategories.find(
          (cat) => cat.name === categoryToDeleteName
        );
        if (categoryToDelete) {
          const success = await deleteCategory(categoryToDelete.id);
          if (success) {
            showMessage(`Category '${categoryToDeleteName}' deleted!`);
          } else {
            showMessage(
              `Error deleting category '${categoryToDeleteName}'.`,
              true
            );
          }
        } else {
          showMessage(`Category '${categoryToDeleteName}' not found.`, true);
        }
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || !category || !date || parseFloat(amount) <= 0) {
      showMessage("Please fill all fields with valid values.", true);
      return;
    }

    const transaction = {
      type,
      amount: parseFloat(amount),
      category,
      date,
      description: description.trim(),
    };

    const success = await addTransaction(transaction);

    if (success) {
      showMessage(
        `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`
      );
      onClose();
    } else {
      showMessage(`Error adding ${type}`, true);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((cat) => {
    if (type === "income") {
      return cat.budgetAmount !== null && cat.budgetAmount !== undefined;
    } else {
      return true;
    }
  });

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-40 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Add Transaction
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="transactionType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type
            </label>
            <select
              id="transactionType"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setCategory("");
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              htmlFor="transactionAmount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Amount (QAR)
            </label>
            <input
              type="number"
              id="transactionAmount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 50.00"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="transactionCategory"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category
            </label>
            <select
              id="transactionCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a category</option>
              {filteredCategories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory && (
            <div className="mb-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
              <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-700">
                <div>
                  <div className="text-xs text-gray-500">Budget:</div>
                  QAR {(selectedCategory.budgetAmount || 0).toFixed(2)}
                </div>
                <div>
                  <div className="text-xs text-gray-500">Spent:</div>
                  QAR {(selectedCategory.spentAmount || 0).toFixed(2)}
                </div>
                <div>
                  <div className="text-xs text-gray-500">Remaining:</div>
                  <div
                    className={
                      selectedCategory.budgetAmount -
                        selectedCategory.spentAmount <
                      0
                        ? "text-red-500"
                        : "text-green-600"
                    }
                  >
                    QAR{" "}
                    {(
                      (selectedCategory.budgetAmount || 0) -
                      (selectedCategory.spentAmount || 0)
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="transactionDescription"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description (Optional)
            </label>
            <textarea
              id="transactionDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Dinner with friends, Monthly rent payment"
            ></textarea>
          </div>

          {type === "income" && (
            <div className="mb-4 text-center">
              <button
                type="button"
                onClick={() => setShowCategoryManagement((prev) => !prev)}
                className="text-blue-600 hover:text-blue-800 font-semibold text-sm py-2 px-4 rounded-lg border border-blue-600 hover:border-blue-800 transition-colors"
              >
                {showCategoryManagement
                  ? "Hide Category Management"
                  : "Manage Categories"}
              </button>
            </div>
          )}

          {showCategoryManagement && type === "income" && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-3">
                Add New Category with Budget
              </h4>
              <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="flex-grow p-2 border border-gray-300 rounded-lg md:rounded-l-lg md:rounded-r-none focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={newCategoryBudget}
                  onChange={(e) => setNewCategoryBudget(e.target.value)}
                  placeholder="Budget (QAR)"
                  step="0.01"
                  min="0"
                  className="flex-grow p-2 border border-gray-300 rounded-lg md:rounded-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg md:rounded-r-lg"
                >
                  Add
                </button>
              </div>

              <h4 className="font-semibold text-gray-700 mb-3">
                Existing Categories
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center">
                    No custom categories added yet.
                  </p>
                ) : (
                  categories.map((cat) => {
                    // Removed the isDeletable check, now all categories can be deleted.
                    return (
                      <div
                        key={cat.name}
                        className="flex justify-between items-center p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
                      >
                        <span className="text-gray-700 text-sm">
                          {cat.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.name)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold p-1 rounded-full"
                          title={`Delete ${cat.name}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="mb-6">
            <label
              htmlFor="transactionDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date
            </label>
            <input
              type="date"
              id="transactionDate"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
            >
              Add Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
