export interface ProfileFormData {
  name: string;
  avatar: string;
}

export interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ConsoleTab = 'profile' | 'security' | 'preferences' | 'integrations';
