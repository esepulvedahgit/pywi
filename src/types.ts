export interface UserSettings {
  indentation: 2 | 4;
  language: 'es' | 'en';
}

export interface User {
  id: string;
  username: string;
  email: string;
  settings?: UserSettings;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface FileItem {
  id: string;
  projectId: string;
  filename: string;
  filepath: string; // relative to workspace root
  type: 'script' | 'dataset'; // script is .py, dataset is csv/txt/etc.
  size: number; // in bytes
  updatedAt: string;
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number; // in milliseconds
  timestamp: string;
}

export interface EnvRestoreState {
  inProgress: boolean;
  pending: string[];
  done: string[];
  failed: string[];
  total: number;
}

export interface OutdatedPackage {
  name: string;
  version: string;
  latest_version: string;
}

export interface PackageUpdateState {
  outdated: OutdatedPackage[];
  lastChecked: string | null;
  dismissed: boolean;
}
