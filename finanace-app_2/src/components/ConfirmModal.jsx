import React from 'react';

/**
 * ConfirmModal Component
 *
 * A reusable confirmation dialog for destructive or irreversible actions.
 *
 * Purpose:
 * - Prevents accidental data loss (e.g., deleting categories, transactions)
 * - Provides explicit user confirmation before proceeding
 * - Gives users a clear "undo" option (cancel) before action is executed
 *
 * Use Cases:
 * - Delete category confirmation
 * - Delete transaction confirmation
 * - Clear data warning
 * - Logout warning (if needed)
 *
 * Props:
 * @param {boolean} isOpen - Controls modal visibility (true = show, false = hidden)
 * @param {string} message - Confirmation message displayed to user
 *                           Should clearly explain what action will be performed
 *                           Example: "Are you sure you want to delete 'Groceries'?"
 * @param {Function} onConfirm - Callback executed when user clicks "Yes, Delete"
 *                               Should contain the destructive logic (delete, clear, etc.)
 * @param {Function} onCancel - Callback executed when user clicks "No"
 *                              Should close modal or revert to previous state
 *
 * @component
 * @returns {JSX.Element|null} Confirmation modal or null if not open
 *
 * @example
 * const [showConfirm, setShowConfirm] = useState(false);
 *
 * return (
 *   <>
 *     <button onClick={() => setShowConfirm(true)}>Delete Item</button>
 *     <ConfirmModal
 *       isOpen={showConfirm}
 *       message="Are you sure you want to delete this item?"
 *       onConfirm={() => {
 *         deleteItem();
 *         setShowConfirm(false);
 *       }}
 *       onCancel={() => setShowConfirm(false)}
 *     />
 *   </>
 * );
 */
const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
  // ==================== Visibility Guard ====================
  // If modal is closed, don't render any DOM elements
  // This prevents:
  // - Unnecessary DOM bloat
  // - Event listeners from hidden modals interfering
  // - Focus management issues
  if (!isOpen) return null;

  // ==================== Modal Render ====================
  return (
    // Backdrop Layer
    // - Fixed position covers entire viewport
    // - Semi-transparent dark overlay (60% opacity)
    // - z-50 ensures modal appears above other content
    // - Flexbox centers modal in both dimensions
    // - p-4 adds padding on mobile for safety
    <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex items-center justify-center z-50 p-4">
      {/* Modal Card Container */}
      {/* - White background with rounded corners
          - Shadow creates depth and visual separation
          - max-w-sm limits width to small screens (384px)
          - Full width on mobile due to w-full
          - Centered text alignment for message and buttons */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
        
        {/* Confirmation Message */}
        {/* Displays the user-provided message explaining what action will occur
            Large enough to be clearly readable
            Margin bottom creates space before buttons */}
        <p className="text-lg mb-4">{message}</p>

        {/* Action Buttons Container */}
        {/* - flex with justify-end aligns buttons to the right
            - space-x-3 adds gap between buttons
            - Follows common UI pattern: cancel (secondary) then confirm (primary) */}
        <div className="flex justify-end space-x-3">
          
          {/* Cancel Button */}
          {/* - Secondary action (gray background)
              - Executes onCancel callback on click
              - Allows user to abort the destructive action
              - Gray styling indicates non-primary action */}
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            No
          </button>

          {/* Confirm Button */}
          {/* - Primary action (red background)
              - Executes onConfirm callback on click (triggers the deletion/destructive action)
              - Red styling clearly indicates this is destructive
              - Hover effect provides visual feedback
              - Placed after Cancel button (typical UX pattern: safe option first) */}
          <button 
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
