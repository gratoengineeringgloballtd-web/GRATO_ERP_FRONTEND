import api from './api';

const delegationAPI = {
  getMyDelegation:  () => api.get('/delegation/me'),
  setDelegation:    (data) => api.post('/delegation/me', data),
  clearDelegation:  () => api.delete('/delegation/me'),
  getMyDelegators:  () => api.get('/delegation/delegators'),
  searchCandidates: (q) => api.get('/delegation/candidates', { params: { q } })
};

export default delegationAPI;
