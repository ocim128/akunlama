// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import 'normalize.css'
import 'purecss/build/pure-min.css'
import App from "./App.vue"
import router from './router'

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: {App},
  template: '<App/>',
  created () {
    this.$eventHub = new Vue({
      name: 'EventHub',
      parent: this,
      functional: true
    })
  }
})

