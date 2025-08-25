import React from 'react';

/**
 * MessageModal Component
 *
 * This component displays a generic modal for showing messages to the user,
 * such as success notifications or error alerts. It features a customizable
 * message text and an "OK" button to close the modal.
 *
 * @param {object} props - The component's props.
 * @param {boolean} props.isOpen - Controls the visibility of the modal. If true, the modal is displayed.
 * @param {string} props.message - The text content of the message to be displayed in the modal.
 * @param {boolean} props.isError - A boolean flag. If true, the message text will be styled to indicate an error (e.g., red color).
 * @param {function} props.onClose - Callback function to be executed when the "OK" button is clicked, typically to close the modal.
 */
const MessageModal = ({ isOpen, message, isError, onClose }) => {
  // If the modal is not open, return null to prevent rendering its DOM.
  if (!isOpen) return null;

  // --- Component JSX Structure ---
  return (
    // Modal overlay: fixed position to cover the entire viewport,
    // semi-transparent dark background, flexbox for centering content,
    // and a high z-index to ensure it appears on top of other elements.
    <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex items-center justify-center z-50 p-4">
      {/* Modal content container: white background, padding, rounded corners, shadow, and centered text. */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
        {/* Message text paragraph. */}
        {/* The text color dynamically changes to red if 'isError' prop is true. */}
        <p className={`text-lg mb-4 ${isError ? 'text-red-700' : ''}`}>{message}</p>
        {/* "OK" button to close the modal. */}
        <button 
          onClick={onClose} // Triggers the onClose callback when clicked.
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg w-full"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default MessageModal; // Export the MessageModal component for use in other parts of the application.
