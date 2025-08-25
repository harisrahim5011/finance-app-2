import React from 'react';

/**
 * LoadingIndicator Component
 *
 * This component displays a full-screen overlay with a spinning animation,
 * typically used to indicate that content is being loaded or an asynchronous
 * operation is in progress.
 */
const LoadingIndicator = () => {
  return (
    // Modal overlay: fixed position to cover the entire viewport,
    // semi-transparent gray background, flexbox for centering content,
    // and a high z-index to ensure it appears on top of other elements.
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      {/* Spinning animation: a rounded div with a border that animates to create a spinner effect. */}
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>
  );
};

export default LoadingIndicator; // Export the LoadingIndicator component for use in other parts of the application.
