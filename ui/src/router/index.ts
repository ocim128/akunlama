import { createRouter, createWebHistory, type RouteRecordRaw, type RouteLocationNormalized } from 'vue-router'
import LandingPage from '@/LandingPage.vue'

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
        component: () => import('@/components/mail/Inbox.vue'),
        children: [
            {
                path: '',
                redirect: { name: 'List' }
            },
            {
                path: 'list',
                name: 'List',
                component: () => import('@/components/mail/MessageList.vue')
            },
            {
                path: 'message/:region/:key',
                name: 'Message',
                component: () => import('@/components/mail/MessageDetail.vue'),
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
        component: () => import('@/KittenRouter.vue')
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
