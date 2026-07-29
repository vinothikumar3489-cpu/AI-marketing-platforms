import { ModuleAdapter } from './ModuleAdapter.js';

export class CrmAdapter extends ModuleAdapter {
  constructor() {
    super('CrmAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};

    const sources = [];
    const companyName = request.companyName || '';
    const contactId = request.contactId || request.payload?.contactId || '';
    const dealId = request.dealId || request.payload?.dealId || '';

    if (companyName) {
      sources.push({
        type: 'crm_context',
        value: { company: companyName },
        confidence: 0.6,
        source: 'CrmAdapter',
      });
    }

    if (memory.crmData?.exists) {
      const crm = memory.crmData.data || {};
      sources.push({
        type: 'crm_data',
        value: { contacts: crm.contactCount, deals: crm.dealCount, leads: crm.leadCount },
        confidence: 0.85,
        source: 'CrmAdapter.memory',
      });
    }

    if (contactId) {
      sources.push({
        type: 'crm_contact',
        value: { contactId },
        confidence: 0.7,
        source: 'CrmAdapter',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, companyName };
  }

  async updateKnowledge(context) {
    return { updates: ['customer_profiles', 'lead_status', 'engagement'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['crm_data'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['crm_patterns', 'lead_conversion_trends'], module: this._name };
  }

  async getContacts(filters) {
    return { success: true, data: { note: 'CRM contact lookup via Brain', filters, module: 'crm' } };
  }
}
