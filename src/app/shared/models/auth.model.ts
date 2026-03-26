export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    major: string;
  }

export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface AuthResponse {
    message?: string;
    status: boolean;
    data?: UserToken;
    error?: string; 
  }

  export interface UserToken {
    access_token: string;
    refresh_token: string;
    user: User;
  }
  
  export interface RefreshTokenRequest {
    refreshToken: string;
  }
  
  export interface RefreshTokenResponse {
    access_token: string;
  }

  export interface UserModel{
    id: string,
    email: string,
    firstName: string,
    lastName?: string,
    role: string
  }
  
  export interface UserResponse{
    status: boolean,
    message: string,
    access_token: string,
    user: User
  }

  export interface UserModelResponse{
    guid: string,
    email: string,
    firstName: string,
    lastName?: string,
    major?: string,
    mobile?: string,
    profileImage?: string,
  }

  export interface UserDetailApiResponse{
    status: boolean,
    message: string,
    users: UserModelResponse[]
  }

  export interface User {
    id: string;
    uguid: string;
    firstName: string,
    lastName: string,
    email: string;
    //role: 'admin' | 'user' | 'manager' | 'doctor' | 'prvider';
    mobile: string;
    major: string;
    profileImage: string;
    is_active: number;
    role_id: string;
    created_at: string;
    isEmailVerified: boolean;
    isDeleted: boolean;
    lastLogin: Date;
    role: Role,
    username: string;
    
  }


  export interface Role{
    id: number;
    name: string;
    rguid: string;
  }