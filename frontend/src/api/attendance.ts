import api from './client';

export type RecipientType = 'STUDENT' | 'THREE_B_ELDERLY';
export interface Recipient {
  type: RecipientType;
  name: string;
  identifier: string;
  schoolName?: string;
  gender?: string;
  address?: string;
  decile?: number;
  foodRestrictions: string | null;
  photoUrl: string | null;
}

export interface ScanResult {
  recipient?: Recipient;
  status: 'recorded' | 'already_present' | 'invalid_qr' | 'inactive_student' | 'inactive_beneficiary';
  message: string;
  student?: {
    name: string;
    nisn: string;
    schoolName: string;
    gender?: string;
    foodRestrictions?: string | null;
    photoUrl?: string | null;
  };
  attendance?: {
    date: string;
    time: string;
    id?: string;
  };
}

export interface AttendanceRecord {
  recipient: Recipient;
  id: string;
  attendanceDate: string;
  scannedAt: string;
  status: string;
  student: {
    name: string;
    nisn: string;
    schoolName: string;
    gender: string;
    foodRestrictions: string | null;
    photoPath: string | null;
  } | null;
  scannedBy: {
    name: string;
    username: string;
  };
}

export interface AttendanceMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const attendanceApi = {
  scan: async (qrToken: string): Promise<ScanResult> => {
    const res = await api.post<ScanResult>('/attendance/scan', { qrToken });
    return res.data;
  },

  getAll: async (params: {
    page?: number;
    limit?: number;
    date?: string;
    search?: string;
    type?: RecipientType;
  }): Promise<{ data: AttendanceRecord[]; meta: AttendanceMeta }> => {
    const res = await api.get('/attendance', { params });
    return res.data;
  },

  getOne: async (id: string): Promise<AttendanceRecord> => {
    const res = await api.get(`/attendance/${id}`);
    return res.data;
  },
};
