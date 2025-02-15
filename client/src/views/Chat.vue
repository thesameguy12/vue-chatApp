<template>
    <div class="container">
        <div class="main">
            <Menu @set-chat="handleSelect" :socket="socket"/>
            <ChatBox :chat="selectedChat" :socket="socket"/>
        </div>
        
    </div>
</template>

<script>
import ChatBox from '@/components/ChatBox.vue';
import Menu from '@/components/Menu.vue';
import Cookies from 'js-cookie';
import { io } from 'socket.io-client';
export default {
    name:"Chat",
    components:{
        ChatBox, Menu
    },
    data(){
        return{
            selectedChat:"",
            socket:null
        }
    },
    beforeRouteEnter(){
        if(!Cookies.get("session")){
            return "/login"
        }
    },
    methods:{
        handleSelect(user){
            
            this.selectedChat=user
        }
    },
    beforeMount(){
        this.socket=io(import.meta.env.VITE_API_URL, {
            withCredentials: true,
        })
        console.log(this.socket)
    },
    beforeUnmount(){
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}
</script>

<style>

</style>