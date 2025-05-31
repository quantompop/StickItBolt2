import React, { useState } from 'react';
import { resetPassword } from '../../firebase/authService';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface PasswordResetProps {
  onBack: () => void;
}

const PasswordReset: React.FC<PasswordResetProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      // Provide user-friendly error messages
      if (err.code === 'auth/user-not-found') {
        setError('No account exists with this email address');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later');
      } else {
        setError(err.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <Mail className="h-12 w-12 text-blue-500 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
        <p className="text-gray-600 mt-1">We'll email you instructions to reset your password</p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-green-700 text-sm">
            Password reset email sent! Check your inbox for instructions.
          </span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="email">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            className={`flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md flex items-center justify-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordReset;