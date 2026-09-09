export {};

type DatabaseQueryResult = {
  rows: Record<string, unknown>[];
  rowCount: number | null;
};

type AuthUser = {
  id: number;
  username: string;
  role: UserRole;
};

type UserRole = 'doctor' | 'nurse' | 'lab' | 'pharmacy' | 'moderator' | 'admin';

type PatientFileUpload = {
  originalName: string;
  storedName: string;
  fileSizeBytes: number;
};

declare global {
  interface Window {
    electronAPI: {
      database: {
        isReady(): Promise<boolean>;
        query(text: string, values?: unknown[]): Promise<DatabaseQueryResult>;
      };
      auth: {
        hasUsers(): Promise<boolean>;
        register(username: string, password: string): Promise<AuthUser>;
        login(username: string, password: string): Promise<AuthUser>;
        logout(): Promise<boolean>;
        getCurrentUser(): Promise<AuthUser | null>;
        createUser(username: string, password: string, role: UserRole): Promise<AuthUser>;
        listUsers(): Promise<AuthUser[]>;
        deleteUser(userId: number): Promise<boolean>;
      };
      patientFiles: {
        add(medicalRecordId: number): Promise<PatientFileUpload[]>;
        open(medicalRecordId: number, storedName: string): Promise<void>;
        delete(medicalRecordId: number, storedName: string): Promise<void>;
        deleteRecord(medicalRecordId: number): Promise<void>;
      };
    };
  }
}