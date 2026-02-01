import { createRouter, createWebHistory, type RouteRecordRaw, type RouteLocationNormalized } from 'vue-router'
import LandingPage from '@/LandingPage.vue'
import KittenRouter from '@/KittenRouter.vue'
import Inbox from '@/components/mail/Inbox.vue'
import MessageDetail from '@/components/mail/MessageDetail.vue'
import MessageList from '@/components/mail/MessageList.vue'

const routes: RouteRecordRaw[] = [
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
                component: MessageDetail,
                props: (route: RouteLocationNormalized) => ({
                    region: route.params.region,
                    key: route.params.key,
                    email: route.params.email
                })
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

export default createRouter({
    history: createWebHistory(),
    routes
})
