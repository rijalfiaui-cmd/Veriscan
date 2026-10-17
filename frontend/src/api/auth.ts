import api from './client';

export interface LoginResponse {
  accessToken: string;
  staff: {
    id: string;
    username: string;
    name: string;
  };
}

export interface StaffMe {
  id: string;
  username: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', { username, password });
    return res.data;
  },

  getMe: async (): Promise<StaffMe> => {
    const res = await api.get<StaffMe>('/auth/me');
    return res.data;
  },
};
