import path from 'path';
import fs from 'fs';
import type { Settings } from '@umbra/shared-types';

const DEFAULT_SETTINGS: Settings = {
  rootPath: null,
  port: 3847,
  lanEnabled: false,
  theme: 'system',
  autosaveInterval: 2000,
  snapshotInterval: 60000,
  passwordEnabled: false,
  passwordHash: null,
};

const DATA_DIR = path.join(process.cwd(), '.umbra-data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSettings(): Settings {
  ensureDataDir();
  
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let cachedSettings: Settings | null = null;

export function getSettings(): Settings {
  if (cachedSettings !== null) return cachedSettings;
  cachedSettings = loadSettings();
  return cachedSettings;
}

export function updateSettings(updates: Partial<Settings>): Settings {
  ensureDataDir();
  const current = getSettings();
  const updated = { ...current, ...updates };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  cachedSettings = updated;
  return updated;
}
