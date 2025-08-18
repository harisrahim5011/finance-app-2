import React from 'react';

/**
 * ConfirmModal Component
 *
 * This component renders a generic confirmation modal that can be used to ask the user
 * for confirmation before proceeding with a potentially destructive or irreversible action.
 * It displays a message and provides "No" (cancel) and "Yes" (confirm) buttons.
 *
 * @param {object} props - The component's props.
 * @param {boolean} props.isOpen - Controls the visibility of the modal. If true, the modal is displayed.
 * @param {string} props.message - The message text to display within the confirmation modal.
 * @param {function} props.onConfirm - Callback function to be executed when the "Yes" (confirm) button is clicked.
 * @param {function} props.onCancel - Callback function to be executed when the "No" (cancel) button is clicked.
 */
const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
  // If the modal is not open, return null to prevent rendering its DOM.
  if (!isOpen) return null;

  // --- Component JSX Structure ---
  return (
    // Modal overlay: fixed position, semi-transparent dark background, centered content.
    <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex items-center justify-center z-50 p-4">
      {/* Modal content container: white background, rounded corners, shadow, text alignment. */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
        {/* The confirmation message displayed to the user. */}
        <p className="text-lg mb-4">{message}</p>
        {/* Container for the action buttons, aligned to the end with spacing. */}
        <div className="flex justify-end space-x-3">
          {/* "No" (Cancel) button. */}
          <button 
            onClick={onCancel} // Triggers the onCancel callback when clicked.
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            No
          </button>
          {/* "Yes, Delete" (Confirm) button. */}
          <button 
            onClick={onConfirm} // Triggers the onConfirm callback when clicked.
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal; // Export the ConfirmModal component for use in other parts of the application.
