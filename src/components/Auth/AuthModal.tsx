import React, { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import PasswordChange from './PasswordChange';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'password';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const { state } = useAuth();
  
  // Close the modal when user is authenticated
  useEffect(() => {
    if (state.isAuthenticated && mode !== 'password') {
      onClose();
    }
  }, [state.isAuthenticated, onClose, mode]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog" aria-modal="true">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X size={24} />
        </button>
        
        {mode === 'login' && (
          <Login 
            onSwitch={() => setMode('register')} 
            onPasswordReset={() => setMode('password')}
          />
        )}
        
        {mode === 'register' && (
          <Register onSwitch={() => setMode('login')} />
        )}
        
        {mode === 'password' && (
          <PasswordChange onClose={onClose} />
        )}
      </div>
    </div>
  );
};

export default AuthModal;