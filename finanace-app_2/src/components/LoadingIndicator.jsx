import React from 'react';

/**
 * LoadingIndicator Component
 *
 * A full-screen overlay loading spinner displayed during asynchronous operations.
 *
 * Purpose:
 * - Blocks user interaction while data is loading
 * - Provides visual feedback that an operation is in progress
 * - Prevents multiple rapid clicks/submissions while waiting
 *
 * Use Cases:
 * - Initial Firebase auth state check
 * - Fetching transactions from Firestore
 * - Signing in with Google
 * - Forwarding surplus balances
 * - Any async operation that requires user to wait
 *
 * Design:
 * - Full viewport coverage (fixed inset-0)
 * - Semi-transparent overlay (prevents seeing content behind but not completely opaque)
 * - Centered spinner (both horizontally and vertically)
 * - High z-index (z-50) ensures it appears above all other content
 * - Blue spinner matches app's primary color scheme
 *
 * Props:
 * None - This is a simple stateless component
 *
 * @component
 * @returns {JSX.Element} Full-screen loading overlay with spinner animation
 *
 * @example
 * // Show during auth check
 * if (loading) {
 *   return <LoadingIndicator />;
 * }
 *
 * @example
 * // Show during data fetch
 * {transactionsLoading && <LoadingIndicator />}
 */
const LoadingIndicator = () => {
  return (
    // ==================== Overlay Layer ====================
    // Fixed position overlay covering entire viewport
    // - fixed: stays in place even when content scrolls
    // - inset-0: covers full viewport (top: 0, right: 0, bottom: 0, left: 0)
    // - bg-gray-500 bg-opacity-75: semi-transparent dark background
    //   (75% opacity allows faint view of content behind, prevents blind spot)
    // - flex items-center justify-center: centers spinner both axes
    // - z-50: appears above all other content (high z-index)
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      
      {/* ==================== Spinner Animation ====================
          Rotating div that appears as a loading spinner
          
          Design breakdown:
          - animate-spin: Tailwind animation class (continuous 1s rotation)
          - rounded-full: Makes it circular
          - h-16 w-16: 64px × 64px size (medium, visible from distance)
          - border-t-4 border-b-4: Top and bottom blue borders (4px thick)
          - border-blue-500: Blue color matching app's primary color
          
          How it works:
          - Only top and bottom borders are visible (blue)
          - Left and right borders inherit background color (transparent/gray)
          - This creates visual effect of a spinning circle
          - Rotation happens continuously via animate-spin
          
          Note: Not showing left/right borders creates the distinctive
          spinner look. If all 4 borders were colored, it would just
          look like a rotating square.
      */}
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>
  );
};

export default LoadingIndicator;
