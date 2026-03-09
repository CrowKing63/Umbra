import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './NetworkSettings.css';

interface NetworkInfo {
  port: number;
  lanEnabled: boolean;
  localhostUrl: string;
  lanUrl?: string;
  localIp?: string;
}

export function NetworkSettings() {
  const { settings, refreshSettings } = useAuth();
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fetchNetworkInfo = async () => {
    try {
      const response = await fetch('/api/v1/network');
      const data = await response.json();
      if (data.success) {
        setNetworkInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch network info:', error);
    }
  };

  useEffect(() => {
    fetchNetworkInfo();
  }, []);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(label);
      setTimeout(() => setCopiedUrl(null), 2000);
      setMessage({ type: 'success', text: `${label} copied to clipboard` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to copy to clipboard' });
    }
  };

  const updateSettings = async (updates: { port?: number; lanEnabled?: boolean }) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings updated. Restart server to apply changes.' });
        refreshSettings();
        // Refresh network info after a short delay
        setTimeout(fetchNetworkInfo, 500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const port = parseInt(formData.get('port') as string, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      await updateSettings({ port });
    } else {
      setMessage({ type: 'error', text: 'Invalid port number (1-65535)' });
    }
  };

  const handleLanToggle = async () => {
    const newLanEnabled = !settings?.lanEnabled;
    await updateSettings({ lanEnabled: newLanEnabled });
  };

  if (!settings || !networkInfo) {
    return <div className="network-settings">Loading network settings...</div>;
  }

  const isLanEnabled = networkInfo.lanEnabled;
  const showLanWarning = isLanEnabled && !settings.passwordEnabled;

  return (
    <div className="network-settings">
      <h3>Network Settings</h3>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {showLanWarning && (
        <div className="warning-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Warning: LAN access is enabled but password protection is disabled. Consider enabling password protection for security.</span>
        </div>
      )}

      <div className="settings-section">
        <h4>Port</h4>
        <form onSubmit={handlePortChange} className="inline-form">
          <div className="input-group">
            <input
              type="number"
              name="port"
              defaultValue={networkInfo.port}
              min="1"
              max="65535"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Port'}
            </button>
          </div>
          <p className="help-text">Changes require server restart to take effect.</p>
        </form>
      </div>

      <div className="settings-section">
        <h4>LAN Access</h4>
        <div className="toggle-container">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isLanEnabled}
              onChange={handleLanToggle}
              disabled={isLoading}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">
              {isLanEnabled ? 'Enabled (accessible on local network)' : 'Disabled (localhost only)'}
            </span>
          </label>
        </div>
        <p className="help-text">
          When enabled, other devices on your local network can access Umbra.
          {isLanEnabled && networkInfo.lanUrl && (
            <> The app is accessible at <code>{networkInfo.lanUrl}</code></>
          )}
        </p>
      </div>

      <div className="settings-section">
        <h4>Connection URLs</h4>
        <div className="url-list">
          <div className="url-item">
            <div className="url-info">
              <span className="url-label">Localhost</span>
              <code className="url-value">{networkInfo.localhostUrl}</code>
            </div>
            <button
              className="copy-btn"
              onClick={() => copyToClipboard(networkInfo.localhostUrl, 'Localhost URL')}
              disabled={copiedUrl === 'Localhost URL'}
            >
              {copiedUrl === 'Localhost URL' ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {isLanEnabled && networkInfo.lanUrl && (
            <div className="url-item">
              <div className="url-info">
                <span className="url-label">LAN ({networkInfo.localIp})</span>
                <code className="url-value">{networkInfo.lanUrl}</code>
              </div>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(networkInfo.lanUrl!, 'LAN URL')}
                disabled={copiedUrl === 'LAN URL'}
              >
                {copiedUrl === 'LAN URL' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
