import api from './client';

export interface Student {
  id: string;
  nisn: string;
  name: string;
  schoolName: string;
  gender: 'LAKI_LAKI' | 'PEREMPUAN' | string;
  foodRestrictions: string | null;
  photoPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  qrDataUrl?: string;
}

export interface CreateStudentPayload {
  nisn: string;
  name: string;
  schoolName: string;
  gender: 'LAKI_LAKI' | 'PEREMPUAN';
  foodRestrictions?: string;
  isActive?: boolean;
}

export const studentsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await api.get('/students', { params });
    return res.data as { data: Student[]; meta: { total: number; page: number; limit: number; totalPages: number } };
  },

  getOne: async (id: string): Promise<Student> => {
    const res = await api.get(`/students/${id}`);
    return res.data;
  },

  create: async (data: CreateStudentPayload): Promise<Student & { qrDataUrl?: string }> => {
    const res = await api.post('/students', data);
    return res.data;
  },

  update: async (id: string, data: Partial<CreateStudentPayload>): Promise<Student> => {
    const res = await api.patch(`/students/${id}`, data);
    return res.data;
  },

  uploadPhoto: async (id: string, file: File): Promise<Student> => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.post(`/students/${id}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`);
  },

  getQrCode: async (id: string): Promise<{ qrDataUrl: string }> => {
    const res = await api.get(`/students/${id}/qr`);
    return res.data;
  },
};
