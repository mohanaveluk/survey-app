export interface UserProfile {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    mobile: string;
    created_at: Date;
    updated_at: Date;
    is_active: number;
    uguid: string;
    role_id: number;
    address_line1?: string;
    address_line2?: string;
    city?:          string;
    state?:         string;
    postal_code?:   string;
    country?:       string;
    profileImage: string;
  }
  
  interface UserProfile1 {
  firstname:     string;
  lastname:      string;
  email:         string;
  mobile?:       string;
  address_line1?: string;
  address_line2?: string;
  city?:          string;
  state?:         string;
  postal_code?:   string;
  country?:       string;
  avatarUrl?:     string; // URL of the currently saved avatar
}

export interface ProfileUpdateRequest {
  id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  password?: string;
  mobile: string;
  major: string;
  created_at: Date;
  updated_at: Date;
  is_active?: number;
  uguid?: string;
  role_id?: number;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  profileImage: string;
}