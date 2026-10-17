import api from "./client";

export interface BeneficiaryPayload {
  name: string;
  nik: string;
  street: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  postalCode: string;
  foodRestrictions: string;
  decile: number;
  isActive: boolean;
}
export interface Beneficiary extends Omit<
  BeneficiaryPayload,
  "foodRestrictions"
> {
  id: string;
  foodRestrictions: string | null;
  photoPath: string | null;
  createdAt: string;
  updatedAt: string;
  qrDataUrl?: string;
}
export const addressText = (b: BeneficiaryPayload | Beneficiary) =>
  `${b.street}, RT ${b.rt}/RW ${b.rw}, ${b.kelurahan}, ${b.kecamatan}, ${b.city}, ${b.province} ${b.postalCode}`;
const base = "/beneficiaries-3b";
export const beneficiariesApi = {
  async getAll(
    params: { page: number; limit: number; search?: string },
    signal?: AbortSignal,
  ) {
    return (
      await api.get<{
        data: Beneficiary[];
        meta: { total: number; totalPages: number };
      }>(base, { params, signal })
    ).data;
  },
  async create(data: BeneficiaryPayload) {
    return (await api.post<Beneficiary>(base, data)).data;
  },
  async update(id: string, data: BeneficiaryPayload) {
    return (await api.patch<Beneficiary>(`${base}/${id}`, data)).data;
  },
  async delete(id: string) {
    await api.delete(`${base}/${id}`);
  },
  async qr(id: string) {
    return (await api.get<{ qrDataUrl: string }>(`${base}/${id}/qr`)).data;
  },
  async photo(id: string, file: File) {
    const data = new FormData();
    data.append("photo", file);
    return (await api.post<Beneficiary>(`${base}/${id}/photo`, data)).data;
  },
};
