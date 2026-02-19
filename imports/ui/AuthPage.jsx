import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

const inputClass = 'w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
const errorClass = 'p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg';
const successClass = 'p-3 text-sm text-green-600 bg-green-100 dark:bg-green-900/30 rounded-lg';
const btnPrimaryClass = 'w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl';
const linkClass = 'text-blue-600 dark:text-blue-400 hover:underline';

export default function AuthPage({ onSuccess }) {
  const [mode, setMode] = useState('login');
  const [loginError, setLoginError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Reset
  const [teamCode, setTeamCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const clearMessages = () => {
    setLoginError('');
    setResetMessage('');
  };

  const handleShowLogin = () => {
    clearMessages();
    setMode('login');
  };
  const handleShowSignup = () => {
    clearMessages();
    setMode('signup');
  };
  const handleShowReset = () => {
    clearMessages();
    setMode('reset');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    Meteor.loginWithPassword(email.trim(), password, (err) => {
      setIsLoading(false);
      if (err) {
        setLoginError(err.reason || 'Login failed');
      } else {
        onSuccess();
      }
    });
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setLoginError('');
    if (!firstName.trim() || !lastName.trim()) {
      setLoginError('First name and last name are required');
      return;
    }
    if (password !== confirmPassword) {
      setLoginError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setLoginError('Password too short');
      return;
    }
    setIsLoading(true);
    Accounts.createUser({
      email: email.trim(),
      password,
      profile: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
    }, (err) => {
      setIsLoading(false);
      if (err) {
        setLoginError('Signup failed: ' + err.reason);
      } else {
        onSuccess();
      }
    });
  };

  const handleReset = (e) => {
    e.preventDefault();
    setLoginError('');
    setResetMessage('');
    if (newPassword !== resetConfirmPassword) {
      setLoginError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    Meteor.call('resetPasswordWithTeamCode', {
      email: resetEmail.trim(),
      teamCode: teamCode.trim(),
      newPassword: newPassword,
    }, (err) => {
      setIsLoading(false);
      if (err) {
        setLoginError(err.reason || err.message || 'Reset failed');
      } else {
        setResetMessage('Password updated. Please log in.');
        setMode('login');
        setResetEmail('');
        setTeamCode('');
        setNewPassword('');
        setResetConfirmPassword('');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">TimeHarbor</h1>
          <p className="text-gray-600 dark:text-gray-400">Your personal time tracking assistant</p>
        </div>

        {loginError && (
          <div className={`mb-4 ${errorClass}`}>{loginError}</div>
        )}
        {resetMessage && (
          <div className={`mb-4 ${successClass}`}>{resetMessage}</div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">Welcome Back</h2>
              <div>
                <label htmlFor="loginEmail" className={labelClass}>Email</label>
                <input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="loginPassword" className={labelClass}>Password</label>
                <input
                  id="loginPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className={inputClass}
                />
              </div>
              <button type="submit" disabled={isLoading} className={btnPrimaryClass}>
                {isLoading ? 'Logging in...' : 'Log In'}
              </button>
              <div className="text-right mt-2">
                <button type="button" onClick={handleShowReset} className={linkClass}>
                  Forgot password?
                </button>
              </div>
              <div className="text-center mt-6">
                <p className="text-gray-600 dark:text-gray-400">Don't have an account?</p>
                <button type="button" onClick={handleShowSignup} className={linkClass + ' font-medium'}>
                  Create Account
                </button>
              </div>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">Create Account</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="signupFirstName" className={labelClass}>First Name</label>
                  <input
                    id="signupFirstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="signupLastName" className={labelClass}>Last Name</label>
                  <input
                    id="signupLastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="signupEmail" className={labelClass}>Email</label>
                <input
                  id="signupEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="signupPassword" className={labelClass}>Password</label>
                <input
                  id="signupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose password"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className={inputClass}
                />
              </div>
              <button type="submit" disabled={isLoading} className={btnPrimaryClass}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
              <div className="text-center mt-6">
                <p className="text-gray-600 dark:text-gray-400">Already have an account?</p>
                <button type="button" onClick={handleShowLogin} className={linkClass + ' font-medium'}>
                  Log In
                </button>
              </div>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">Reset Password</h2>
              <div>
                <label htmlFor="resetEmail" className={labelClass}>Email</label>
                <input
                  id="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="resetTeamCode" className={labelClass}>Team Code</label>
                <input
                  id="resetTeamCode"
                  type="text"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  placeholder="Enter team code"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="resetNewPassword" className={labelClass}>New Password</label>
                <input
                  id="resetNewPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="resetConfirmPassword" className={labelClass}>Confirm Password</label>
                <input
                  id="resetConfirmPassword"
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className={inputClass}
                />
              </div>
              <button type="submit" disabled={isLoading} className={btnPrimaryClass}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
              <div className="text-center mt-6">
                <button type="button" onClick={handleShowLogin} className={linkClass}>
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
