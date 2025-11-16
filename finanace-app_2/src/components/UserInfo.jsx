import React, { useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { useTransactions } from '../components/TransactionContext';

/**
 * UserInfo Component
 * 
 * Purpose:
 * Displays user profile information in header and provides access to account settings.
 * Includes:
 * - User avatar (with fallback placeholder)
 * - User display name
 * - Sign in prompt (if anonymous user)
 * - Dropdown menu for:
 *   • Sign out button (authenticated users only)
 *   • Billing cycle mode selector (calendar vs custom)
 *   • Custom date range picker (if custom mode selected)
 * 
 * Key Features:
 * - Click-outside detection to close dropdown menu
 * - Avatar image error handling with fallback
 * - Radio button selection for billing cycle mode
 * - Conditional rendering of custom date range inputs
 * - Real-time sync with TransactionContext for settings
 * - Responsive design with scrollable menu on small screens
 * - Accessibility labels for screen readers
 * 
 * State Management:
 * - isMenuOpen: Controls dropdown menu visibility
 * - cycleType, customDateRange: Managed by TransactionContext
 * - Automatically persists settings to localStorage via context
 * 
 * Props:
 * @param {object} props
 * @param {object} props.user - Firebase user object with:
 *                              - displayName: User's name
 *                              - photoURL: User's profile picture
 *                              - isAnonymous: Whether user is not authenticated
 * @param {function} props.onSignOut - Callback to sign out user
 * @param {function} props.onSignInGoogle - Callback to sign in with Google
 * 
 * Dependencies:
 * - lucide-react: Icons (MoreVertical for menu button)
 * - useTransactions: Billing cycle state and functions
 * - Firebase Auth: User data structure
 * 
 * Usage Example:
 * ```jsx
 * <UserInfo
 *   user={currentUser}
 *   onSignOut={handleSignOut}
 *   onSignInGoogle={handleGoogleSignIn}
 * />
 * 
 * // Displays:
 * // [Avatar] [Name] [≡ Menu]
 * //   ↓ When menu opened:
 * //   [Sign Out]
 * //   [User Name]
 * //   Billing Cycle Setting
 * //   ○ Calendar Month  ○ Custom Range
 * //   (if Custom selected: Start Date, End Date inputs)
 * ```
 */
const UserInfo = ({ user, onSignOut, onSignInGoogle }) => {
  // ==================== State Management ====================
  
  // Menu Visibility State
  // true: Dropdown menu is open and visible
  // false: Dropdown menu is closed and hidden
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  
  // Menu Container Reference
  // Used for click-outside detection to auto-close menu
  // Allows detecting clicks outside the menu to close it
  const menuRef = useRef(null);
  
  // ==================== Context Data ====================
  // Billing cycle settings from TransactionContext
  // These values are persisted to localStorage automatically
  //
  // cycleType: "calendar" | "custom"
  // - "calendar": Standard month (1st to last day)
  // - "custom": User-defined date range
  //
  // customDateRange: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
  // - Only used when cycleType === "custom"
  // - Format: ISO date string without time
  //
  // formatCycleSettingInfo(): Function that returns human-readable cycle description
  // - Calendar mode: "Calendar Month (1st - EOM)"
  // - Custom mode: "MM/DD/YYYY to MM/DD/YYYY"
  const {
    cycleType,
    setCycleType,
    customDateRange,
    setCustomDateRange,
    formatCycleSettingInfo
  } = useTransactions();

  // ==================== Avatar Setup ====================
  
  // Extract first letter of display name for placeholder avatar
  // Examples:
  // - user.displayName = "John Doe" → firstLetter = "J"
  // - user.displayName = "Anonymous" → firstLetter = "A"
  // - user.displayName = undefined → firstLetter = "U" (default "User")
  const firstLetter = user.displayName?.charAt(0) || "U";
  
  // Determine avatar image URL
  // Priority:
  // 1. user.photoURL: Profile picture from Google/Firebase Auth (if available)
  // 2. Fallback placeholder: Generated with first letter if no photo
  //
  // Placeholder Service: placehold.co
  // Format: https://placehold.co/{width}x{height}/{bgColor}/{textColor}?text={text}
  // Example: https://placehold.co/40x40/E2E8F0/4A5568?text=J
  // - 40x40: Avatar size
  // - E2E8F0: Light gray background
  // - 4A5568: Dark gray text
  // - text=J: First letter of name
  const photoUrl = user.photoURL || `https://placehold.co/40x40/E2E8F0/4A5568?text= ${firstLetter}`;

  // ==================== Click-Outside Detection ====================
  // Purpose: Auto-close dropdown menu when user clicks outside of it
  // Improves UX by allowing menu dismissal without re-clicking button
  //
  // How it works:
  // 1. useEffect sets up a document-level mousedown listener
  // 2. When user clicks anywhere on page:
  //    a. Check if click target is inside menuRef (the menu container)
  //    b. If YES: click is inside menu, do nothing (menu stays open)
  //    c. If NO: click is outside menu, close menu by setting isMenuOpen=false
  // 3. Cleanup: Remove listener when component unmounts (prevents memory leak)
  //
  // Why mousedown instead of click?
  // - mousedown fires before click (feels more responsive)
  // - Prevents menu flicker when interacting with nested elements
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if menuRef exists and click target is outside the menu
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        // Click was outside menu, close it
        setIsMenuOpen(false);
      }
    };
    
    // Attach listener to document
    document.addEventListener("mousedown", handleClickOutside);
    
    // Cleanup: Remove listener to prevent memory leaks
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==================== Event Handlers ====================
  
  /**
   * handleDateChange(type)
   * 
   * Purpose:
   * Factory function that creates handlers for start/end date input changes.
   * Updates custom billing cycle dates in context.
   * 
   * How it works (Currying Pattern):
   * - Called as: handleDateChange('start') → returns a function
   * - That function: (e) => { ... updates start date ... }
   * - Allows reuse for both start and end date inputs
   * 
   * Process:
   * 1. Extract new date value from input event
   * 2. Create new object with updated date using spread operator
   * 3. Call setCustomDateRange to update context
   * 4. Context automatically persists to localStorage
   * 
   * Parameters:
   * type: "start" | "end" (which date to update)
   * 
   * Example:
   * ```javascript
   * // For start date input:
   * onChange={handleDateChange('start')}
   * 
   * // When user selects "2024-03-15":
   * // customDateRange becomes: { start: "2024-03-15", end: "2024-04-14" }
   * 
   * // For end date input:
   * onChange={handleDateChange('end')}
   * // customDateRange becomes: { start: "2024-03-15", end: "2024-05-15" }
   * ```
   */
  const handleDateChange = (type) => (e) => {
    const date = e.target.value; // Extract date string from input (YYYY-MM-DD)
    
    // Update the specified date (start or end) in context
    // Spread operator (...prev) preserves the other date value
    setCustomDateRange(prev => ({
      ...prev,
      [type]: date // [type] is "start" or "end" (computed property)
    }));
  };

  // ==================== Component Render ====================
  return (
    <div className="flex items-center justify-between">
      
      {/* ============ Left Side: User Profile ============ */}
      {/* Displays avatar and user information */}
      <div className="flex items-center">
        
        {/* User Avatar Image */}
        {/* 40x40px circular image
            - Falls back to placeholder if image fails to load
            - onError handler: If main image fails, use placeholder with first letter
            - alt: Accessibility text for screen readers */}
        <img
          src={photoUrl}
          className="w-10 h-10 rounded-full mr-4"
          alt="User Photo"
          onError={(e) => {
            // If image fails to load, prevent infinite retry loop
            e.target.onerror = null;
            // Set fallback placeholder with first letter
            e.target.src = `https://placehold.co/40x40/E2E8F0/4A5568?text= ${firstLetter}`;
          }}
        />
        
        {/* User Name and Sign In Prompt */}
        <div>
          {/* Display Name */}
          {/* Shows user's name from Firebase Auth
              Defaults to "Guest User" if not logged in */}
          <p className="font-semibold text-gray-800 text-left">
            {user.displayName || "Guest User"}
          </p>
          
          {/* Sign In with Google Button (Anonymous Users Only) */}
          {/* Shown only if user is anonymous (not authenticated)
              Prompts user to upgrade to authenticated account
              onClick triggers Google sign-in flow */}
          {user.isAnonymous && (
            <button
              onClick={onSignInGoogle}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>

      {/* ============ Right Side: Menu Button & Dropdown ============ */}
      {/* Three-dot menu icon with dropdown settings */}
      <div className="relative" ref={menuRef}>
        
        {/* Menu Toggle Button */}
        {/* Three vertical dots (MoreVertical icon) from lucide-react
            - Click toggles menu open/closed
            - Hover effect: light gray background
            - aria-label for screen readers */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors duration-150 focus:outline-none"
          aria-label="User Menu"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {/* Dropdown Menu */}
        {/* Conditionally rendered when isMenuOpen === true
            - absolute right-0: Positioned top-right relative to button
            - mt-2: Small gap below button
            - w-72: Wide enough for date inputs
            - z-10: Appears above other content */}
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-10">
            
            {/* ========== Section 1: Sign Out ========== */}
            <div className="py-1">
              {/* Sign Out Button (Authenticated Users Only) */}
              {/* - Hidden if user.isAnonymous === true
                  - Red color indicates sign out action
                  - onClick: Sign out and close menu
                  - Displayed only for authenticated users */}
              {!user.isAnonymous && (
                <button
                  onClick={() => {
                    onSignOut();
                    setIsMenuOpen(false); // Close menu after signing out
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800 font-medium"
                >
                  Sign Out
                </button>
              )}
              
              {/* User Name Display */}
              {/* Light gray separator showing current user
                  Useful when multiple accounts, shows who is logged in */}
              <div className="text-xs text-gray-400 px-4 py-1 border-t mt-1">
                {user.displayName || "Guest User"}
              </div>
            </div>

            {/* ========== Section 2: Billing Cycle Settings ========== */}
            <div className="px-4 pt-3 pb-4 border-t mt-1">
              
              {/* Section Title */}
              <p className="text-sm font-semibold text-gray-800 mb-3">
                Billing Cycle Setting
              </p>

              {/* Current Cycle Display */}
              {/* Shows human-readable description of current billing cycle mode
                  Examples:
                  - "Calendar Month (1st - EOM)"
                  - "03/15/2024 to 04/14/2024" */}
              <p className="text-xs text-gray-500 mb-3">
                Current:{" "}
                <span className="font-normal text-gray-700">
                  {formatCycleSettingInfo()}
                </span>
              </p>

              {/* Billing Cycle Mode Selection */}
              {/* Two radio button options for billing cycle type
                  - Calendar Month: Standard 1st to last day of month
                  - Custom Range: User-defined start/end dates
                  
                  Radio buttons grouped by name="cycleType"
                  Only one can be selected at a time
                  
                  onChange: Calls setCycleType("calendar") or setCycleType("custom")
                  Updates context and persists to localStorage */}
              <div className="flex space-x-2 mb-3">
                
                {/* Calendar Month Radio */}
                <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input
                    type="radio"
                    name="cycleType"
                    value="calendar"
                    checked={cycleType === "calendar"}
                    onChange={() => setCycleType("calendar")}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span>Calendar Month</span>
                </label>

                {/* Custom Range Radio */}
                <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input
                    type="radio"
                    name="cycleType"
                    value="custom"
                    checked={cycleType === "custom"}
                    onChange={() => setCycleType("custom")}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span>Custom Range</span>
                </label>
              </div>

              {/* Custom Date Range Inputs */}
              {/* Conditionally rendered only when cycleType === "custom"
                  Allows user to set custom start/end dates
                  - Light blue background box for visual grouping
                  - Two date inputs (start and end)
                  - Format hint: "YYYY-MM-DD" */}
              {cycleType === "custom" && (
                <div className="flex flex-col space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  
                  {/* Start Date Input */}
                  {/* Allows selection of custom cycle start date
                      - onChange: Triggers handleDateChange('start')
                      - Updates customDateRange.start in context
                      - Value synced from context state */}
                  <div className="flex flex-col space-y-1">
                    <label htmlFor="startDate" className="text-sm text-gray-700 font-medium">
                      Start Date:
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      value={customDateRange.start}
                      onChange={handleDateChange('start')}
                      className="p-2 border border-blue-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* End Date Input */}
                  {/* Allows selection of custom cycle end date
                      - onChange: Triggers handleDateChange('end')
                      - Updates customDateRange.end in context
                      - Value synced from context state */}
                  <div className="flex flex-col space-y-1">
                    <label htmlFor="endDate" className="text-sm text-gray-700 font-medium">
                      End Date:
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      value={customDateRange.end}
                      onChange={handleDateChange('end')}
                      className="p-2 border border-blue-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Format Hint */}
                  {/* Helper text explaining expected date format
                      Assists users unfamiliar with ISO date format */}
                  <p className="text-xs text-gray-500 mt-1">
                    Format: YYYY-MM-DD
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserInfo;