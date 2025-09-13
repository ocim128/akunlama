import config from '@/../config/apiconfig'

interface State {
  domain: string;
  apiUrl: string;
}

// State
const state: State = {
  domain: config.domain,
  apiUrl: config.apiUrl
}

const mutations = {
}

const getters = {}

const actions = {}

export default {
  mutations,
  state,
  getters,
  actions
}