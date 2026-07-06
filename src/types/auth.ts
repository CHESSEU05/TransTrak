export type UserRoleId = 1000 | 2000;

export type RegistrationDraft = {
  roleId: UserRoleId;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  vehicle?: DriverVehicleInput;
};

export type DriverVehicleInput = {
  vehicleTypeId: 1000 | 2000;
  plateNumber?: string;
  colour?: string;
};

export type RegisterInput = {
  fullName: string;
  phone?: string;
  city?: string;
  email: string;
  password: string;
  roleId: UserRoleId;
  vehicle?: DriverVehicleInput;
};

export type RegisterResult =
  {
    status: 'signed_in';
    email: string;
    userId: string;
  };

export type LoginInput = {
  email: string;
  password: string;
};

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  role_id: number;
  account_status_id: number;
  created_at: string;
  updated_at: string;
};
