import React, { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const { state } = useAuth();
  
  // Close the modal when user is authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      onClose();
    }
  }, [state.isAuthenticated, onClose]);
  
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
        
        {isLogin ? (
          <Login onSwitch={() => setIsLogin(false)} />
        ) : (
          <Register onSwitch={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
};

export default AuthModal;