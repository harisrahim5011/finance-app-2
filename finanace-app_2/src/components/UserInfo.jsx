import React, { useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { useTransactions } from '../components/TransactionContext';

const UserInfo = ({ user, onSignOut, onSignInGoogle }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = useRef(null);
  
  // Get cycle settings from context
  const {
    cycleType,
    setCycleType,
    customStartDay,
    setCustomStartDay,
    customEndDay,
    setCustomEndDay,
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDayChange = (setter) => (e) => {
    const day = parseInt(e.target.value, 10);
    if (!isNaN(day) && day >= 1 && day <= 31) {
      setter(day);
    }
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
              {/* SVG icon */}
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
          <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-10">
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

            <div className="px-4 pt-2 pb-3 border-t mt-1">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                Billing Cycle Setting
              </p>
              <p className="text-xs text-gray-500 mb-2">
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
                  <span>Custom Cycle</span>
                </label>
              </div>

              {cycleType === "custom" && (
                <div className="flex flex-col space-y-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center space-x-2">
                    <label htmlFor="startDay" className="text-sm text-gray-700 whitespace-nowrap">
                      Cycle Starts Day:
                    </label>
                    <input
                      id="startDay"
                      type="number"
                      min="1"
                      max="31"
                      value={customStartDay}
                      onChange={handleDayChange(setCustomStartDay)}
                      className="w-14 p-1 border border-blue-300 rounded-md text-center text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-between items-center space-x-2">
                    <label htmlFor="endDay" className="text-sm text-gray-700 whitespace-nowrap">
                      Cycle Ends Day:
                    </label>
                    <input
                      id="endDay"
                      type="number"
                      min="1"
                      max="31"
                      value={customEndDay}
                      onChange={handleDayChange(setCustomEndDay)}
                      className="w-14 p-1 border border-blue-300 rounded-md text-center text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
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