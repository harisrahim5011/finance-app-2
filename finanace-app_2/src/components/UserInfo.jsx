import React, { useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { useTransactions } from '../components/TransactionContext';

const UserInfo = ({ user, onSignOut, onSignInGoogle }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = useRef(null);
  
  const {
    cycleType,
    setCycleType,
    customDateRange,
    setCustomDateRange,
    formatCycleSettingInfo
  } = useTransactions();

  const firstLetter = user.displayName?.charAt(0) || "U";
  const photoUrl = user.photoURL || `https://placehold.co/40x40/E2E8F0/4A5568?text= ${firstLetter}`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateChange = (type) => (e) => {
    const date = e.target.value;
    setCustomDateRange(prev => ({
      ...prev,
      [type]: date
    }));
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <img
          src={photoUrl}
          className="w-10 h-10 rounded-full mr-4"
          alt="User Photo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/40x40/E2E8F0/4A5568?text= ${firstLetter}`;
          }}
        />
        <div>
          <p className="font-semibold text-gray-800 text-left">
            {user.displayName || "Guest User"}
          </p>
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

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors duration-150 focus:outline-none"
          aria-label="User Menu"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-10">
            <div className="py-1">
              {!user.isAnonymous && (
                <button
                  onClick={() => {
                    onSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800 font-medium"
                >
                  Sign Out
                </button>
              )}
              <div className="text-xs text-gray-400 px-4 py-1 border-t mt-1">
                {user.displayName || "Guest User"}
              </div>
            </div>

            <div className="px-4 pt-3 pb-4 border-t mt-1">
              <p className="text-sm font-semibold text-gray-800 mb-3">
                Billing Cycle Setting
              </p>

              <p className="text-xs text-gray-500 mb-3">
                Current:{" "}
                <span className="font-normal text-gray-700">
                  {formatCycleSettingInfo()}
                </span>
              </p>

              <div className="flex space-x-2 mb-3">
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

              {cycleType === "custom" && (
                <div className="flex flex-col space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  {/* Start Date Input */}
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