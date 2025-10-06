import { api } from "../api";

export type PaginationParams = Record<string, string | number | boolean>;

export const crmService = {
  async getLeads(params: PaginationParams = {}) {
    return api.get<any>("/admin/leads", params);
  },

  async createLead(payload: any) {
    return api.post<any>("/admin/leads", payload);
  },

  async getContacts(params: PaginationParams = {}) {
    return api.get<any>("/admin/contacts", params);
  },

  async createContact(payload: any) {
    return api.post<any>("/admin/contacts", payload);
  },

  async getOpportunities(params: PaginationParams = {}) {
    return api.get<any>("/admin/opportunities", params);
  },

  async createOpportunity(payload: any) {
    return api.post<any>("/admin/opportunities", payload);
  },

  async getActivities(params: PaginationParams = {}) {
    return api.get<any>("/admin/activities", params);
  },

  async createActivity(payload: any) {
    return api.post<any>("/admin/activities", payload);
  },

  async getPipeline(params: PaginationParams = {}) {
    return api.get<any>("/admin/pipeline", params);
  },
};


