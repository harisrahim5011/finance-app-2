import React from 'react';

/**
 * MessageModal Component
 *
 * A reusable notification modal for displaying user feedback messages.
 *
 * Purpose:
 * - Displays success messages (e.g., "Transaction added successfully!")
 * - Displays error messages (e.g., "Failed to save transaction")
 * - Provides clear, user-friendly feedback for app operations
 * - Blocks interaction until user acknowledges message (clicks OK)
 *
 * Features:
 * - Dual-mode styling: Success (default) and Error (red) modes
 * - Full-screen overlay with semi-transparent backdrop
 * - Centered modal for prominent visibility
 * - Keyboard accessible (button can be focused/clicked)
 *
 * Use Cases:
 * - After adding a transaction → "Transaction added successfully!"
 * - After deleting a category → "Category deleted!"
 * - Failed Firebase operation → "Error: Connection failed" (red)
 * - Validation error → "Please fill all required fields" (red)
 * - Profile update → "Profile updated!" (green)
 *
 * Props:
 * @param {boolean} isOpen - Controls modal visibility (true = show, false = hidden)
 *                           Only renders DOM when true (performance optimization)
 * @param {string} message - The message text to display
 *                          Should be concise and user-friendly
 *                          Example: "Transaction added successfully!"
 * @param {boolean} isError - Determines text styling
 *                           true = red text (error/warning style)
 *                           false = default dark gray (success style)
 * @param {Function} onClose - Callback executed when user clicks "OK"
 *                             Typically closes the modal by setting parent state
 *
 * @component
 * @returns {JSX.Element|null} Message modal or null if not open
 *
 * @example
 * // Success message
 * <MessageModal
 *   isOpen={showMessage}
 *   message="Transaction added successfully!"
 *   isError={false}
 *   onClose={() => setShowMessage(false)}
 * />
 *
 * @example
 * // Error message
 * <MessageModal
 *   isOpen={showError}
 *   message="Failed to save transaction. Please try again."
 *   isError={true}
 *   onClose={() => setShowError(false)}
 * />
 */
const MessageModal = ({ isOpen, message, isError, onClose }) => {
  // ==================== Visibility Guard ====================
  // Only render modal DOM when isOpen is true
  // Benefits:
  // - Prevents unnecessary DOM elements when modal is hidden
  // - Improves performance (no hidden elements taking memory)
  // - Avoids event listener conflicts from hidden modals
  // - Keeps DOM tree clean and manageable
  if (!isOpen) return null;

  // ==================== Modal Render ====================
  return (
    // Backdrop Layer
    // - Fixed position covers entire viewport
    // - Semi-transparent dark overlay (60% opacity)
    //   - Dark enough to show modal is important
    //   - Transparent enough to see hint of content behind
    // - Flexbox centers modal both horizontally and vertically
    // - z-50 ensures modal appears above other content
    // - p-4 adds safe padding on mobile screens
    <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex items-center justify-center z-50 p-4">
      
      {/* Modal Card Container */}
      {/* - White background makes content readable
          - Rounded corners for modern appearance
          - Shadow creates depth and visual separation from backdrop
          - w-full max-w-sm: responsive width (max 384px on desktop, full width on mobile)
          - text-center: centers all text and buttons */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
        
        {/* Message Text */}
        {/* Displays the notification message to the user
            Text color changes based on isError prop:
            - Success (isError=false): Default gray (subtle, positive)
            - Error (isError=true): Red (bold, indicates problem)
            
            Template literal: `text-lg mb-4 ${isError ? 'text-red-700' : ''}`
            - text-lg: Large font size for readability
            - mb-4: Bottom margin creates space before button
            - text-red-700: Only applied if isError is true */}
        <p className={`text-lg mb-4 ${isError ? 'text-red-700' : ''}`}>{message}</p>
        
        {/* OK Button */}
        {/* Primary action to acknowledge and close the notification
            - Full width: Makes it easy to tap on mobile
            - Blue background: Primary action styling
            - Hover effect: bg-blue-600 provides visual feedback
            - onClick triggers onClose callback (parent handles modal state) */}
        <button 
          onClick={onClose}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg w-full"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default MessageModal; // Export the MessageModal component for use in other parts of the application.
