import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
export type UserRole = 'admin' | 'staff';

export type UsersTable = {
  id: Generated<number>;
  username: string;
  password_hash: string;
  role: ColumnType<UserRole, UserRole | undefined, UserRole>;
  created_at: Timestamp;
};

export type ClinicSectionsTable = {
  id: Generated<number>;
  name: string;
  description: string | null;
  created_by_user_id: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Database = {
  users: UsersTable;
  clinic_sections: ClinicSectionsTable;
};

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export type ClinicSection = Selectable<ClinicSectionsTable>;
export type NewClinicSection = Insertable<ClinicSectionsTable>;
export type ClinicSectionUpdate = Updateable<ClinicSectionsTable>;