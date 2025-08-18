import React from 'react';
import AuthContainer from './components/AuthContainer';
import AppContainer from './components/AppContainer';
import { AuthProvider } from './components/AuthContext';
import { TransactionProvider } from './components/TransactionContext';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <AuthContainer />
        <TransactionProvider>
          <AppContainer />
        </TransactionProvider>
      </div>
    </AuthProvider>
  );
}

export default App;