import { createRouter, createWebHistory } from 'vue-router'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path:"/login",
      name:"Login",
      component:()=>import('../views/Login.vue')
    },
    {
      path:"/signup",
      name:"Signup",
      component:()=>import('../views/Signup.vue')
    },
    {
      path:"/chat",
      name:"Chat",
      component:()=>import('../views/Chat.vue')
    },
    {
      path:"/",
      redirect:"/login"
    }
    /*{
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },*/
  ],
})

export default router
