import React from 'react';

type HeaderProps = {
  onMenuClick: () => void;
  user: any;
};

const Header: React.FC<HeaderProps> = ({ onMenuClick, user }) => {
  return (
    <header className="bg-white shadow px-4 py-3 flex items-center justify-between">
      <button onClick={onMenuClick} className="text-gray-500 focus:outline-none">
        ☰
      </button>
      <div className="flex items-center space-x-4">
        {user && (
          <span className="text-sm text-gray-700">{user.email}</span>
        )}
        <button
          onClick={() => {
            localStorage.clear();
            location.reload();
          }}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
