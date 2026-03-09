import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './PasswordSettings.css';

export function PasswordSettings() {
  const { settings, refreshSettings } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEnabled = settings?.passwordEnabled ?? false;

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPassword, enable: true }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Password enabled successfully');
        setNewPassword('');
        setConfirmPassword('');
        refreshSettings();
      } else {
        setError(data.error || 'Failed to enable password');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      // First authenticate with current password by logging in
      const loginResponse = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: currentPassword }),
      });
      const loginData = await loginResponse.json();
      if (!loginData.success) {
        setError('Current password is incorrect');
        setIsLoading(false);
        return;
      }
      
      // Now set new password
      const response = await fetch('/api/v1/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPassword, enable: true }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        refreshSettings();
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable password protection? This will allow anyone to access the app.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: '', enable: false }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Password protection disabled');
        refreshSettings();
      } else {
        setError(data.error || 'Failed to disable password');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="password-settings">
      <h3>Password Protection</h3>
      
      <div className="status-indicator">
        Status: <span className={isEnabled ? 'enabled' : 'disabled'}>
          {isEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {!isEnabled ? (
        <form onSubmit={handleEnable} className="password-form">
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>
          
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Enabling...' : 'Enable Password'}
          </button>
        </form>
      ) : (
        <>
          <form onSubmit={handleChange} className="password-form">
            <h4>Change Password</h4>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword2">New Password</label>
              <input
                type="password"
                id="newPassword2"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword2">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
          
          <div className="disable-section">
            <button onClick={handleDisable} className="disable-btn" disabled={isLoading}>
              Disable Password Protection
            </button>
          </div>
        </>
      )}
    </div>
  );
}
