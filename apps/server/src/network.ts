import os from 'os';
import { getSettings } from './database';

export interface NetworkInfo {
  port: number;
  lanEnabled: boolean;
  localhostUrl: string;
  lanUrl?: string;
  localIp?: string;
}

/**
 * Get all non-internal IPv4 addresses from network interfaces
 * Returns an array of IP addresses that are usable on the local network
 */
export function getLocalIPAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const ifaceName of Object.keys(interfaces)) {
    const iface = interfaces[ifaceName];
    if (!iface) continue;

    for (const addr of iface) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (addr.family !== 'IPv4' || addr.internal) {
        continue;
      }
      addresses.push(addr.address);
    }
  }

  return addresses;
}

/**
 * Get the primary local IP address (first non-internal IPv4)
 */
export function getPrimaryLocalIP(): string | null {
  const addresses = getLocalIPAddresses();
  return addresses.length > 0 ? addresses[0] : null;
}

/**
 * Generate network connection information based on current settings
 */
export function getNetworkInfo(): NetworkInfo {
  const settings = getSettings();
  const localhostUrl = `http://localhost:${settings.port}`;

  const networkInfo: NetworkInfo = {
    port: settings.port,
    lanEnabled: settings.lanEnabled,
    localhostUrl,
  };

  if (settings.lanEnabled) {
    const localIp = getPrimaryLocalIP();
    if (localIp) {
      networkInfo.localIp = localIp;
      networkInfo.lanUrl = `http://${localIp}:${settings.port}`;
    }
  }

  return networkInfo;
}
