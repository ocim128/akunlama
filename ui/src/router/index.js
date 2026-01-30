import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/landingpage.vue'
import KittenRouter from '@/kittenrouter.vue'
import Inbox from '@/components/mail/inbox.vue'
import MessageDetail from '@/components/mail/message_detail.vue'
import MessageList from '@/components/mail/message_list.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Kitten Land',
      component: LandingPage
    },
    {
      path: '/inbox/:email',
      name: 'Inbox',
      redirect: { name: 'List' },
      component: Inbox,
      children: [
        {
          path: '',
          redirect: { name: 'List' }
        },
        {
          path: 'list',
          name: 'List',
          component: MessageList
        },
        {
          path: 'message/:region/:key',
          name: 'Message',
          component: MessageDetail
        },
        {
          path: ':pathMatch(.*)*',
          redirect: { name: 'List' }
        }
      ]
    },
    {
      path: '/kittenrouter',
      name: 'KittenRouter',
      component: KittenRouter
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'Kitten Land' }
    }
  ]
})
