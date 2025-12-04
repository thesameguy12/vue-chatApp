<template>
    <div class="container">
        <form @submit.prevent="checkLogin">
            <h3>Log In</h3>
            <input type="text" placeholder="Username" v-model="username"/><br>
            <span class="inputErrorText inputError" v-show="usernameError.length!==0">{{ usernameError }}</span><br>
            <input type="password" placeholder="Password" v-model="password"/><br>
            <span class="inputErrorText inputError" >{{ passwordError }}</span><br>
            <span class="inputErrorText inputError" >{{ loginError }}</span><br>
            <button>Log In</button>
            <p>Dont have an account? <RouterLink :to="{name:'Signup'}">Sign up!</RouterLink></p>
        </form>
    </div>
  
</template>

<script>
import axios from "axios";
import {io} from "socket.io-client"
import { RouterLink } from "vue-router";
const API_URL = import.meta.env.VITE_API_URL;
export default {
    data(){
        return{
            socket:null,
            username:"",
            password:"",
            usernameError:"",
            passwordError:"",
            loginError:""
        }
    },
    components:{
        RouterLink
    },
    mounted(){
        this.socket=io(API_URL)

    },
    watch:{
        username(){
            this.usernameError=""
            this.loginError=""
        },
        password(){
            this.passwordError=""
            this.loginError=""
        }
    },
    methods:{
        checkLogin(){
            if(this.username.length===0){
                this.usernameError="Username is empty!"
                
            }
            if(this.password.length===0){
                this.passwordError="Password is empty!"
                
            }
            if(this.usernameError || this.passwordError){
                return
            }
            axios.post(`/login`,{username:this.username,password:this.password},{ withCredentials: true }).then((res)=>{
                
                if(res.data.length>0){
                    this.loginError=res.data
                    
                }else{
                    this.$router.push({name:"Chat"})
                }
            }).catch(err=>console.log(err))
        }
    }
}
</script>

<style>

</style>