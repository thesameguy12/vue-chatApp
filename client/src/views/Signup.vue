<template>
  <div class="container">
    <form @submit.prevent="sendSubmit">
        <h3>Sign Up</h3>
        
        <input id="username" type="text" v-model="username" placeholder="Username"/><br>
        <span class="inputErrorText inputError" v-show="usernameError.length!==0">{{ usernameError }}</span><br>
    
    
        <input id="pass" type="password" v-model="password" placeholder="Password"/><br>
        <span class="inputErrorText inputError" >{{ passwordError }}</span><br>
        
        <button>Sign up</button>

        <p>All ready have an account? <RouterLink :to="{name:'Login'}">Log in!</RouterLink></p>
    </form>
  </div>
</template>

<script>
import axios from "axios"
import { RouterLink } from "vue-router";
export default {
    name:"Signup",
    components:{
        RouterLink
    },
    data(){
        return{
            username:"",
            password:"",
            usernameError:"",
            passwordError:"",
            typingTimer:null
        }
    },
    watch:{
        username(){
            this.usernameError=""
            clearTimeout(this.typingTimer)
            this.typingTimer=setTimeout(()=>{
                axios.get(`/signup/${this.username}`).then((res)=>{
                    
                    if(res.data){
                        this.usernameError=res.data
                    }else{
                        this.usernameError=""
                    }
                }).catch((err)=>{
                    console.log(err)
                })
                
            },1000)
        },
        password(){
            this.passwordError=""
            const passRegex=/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
            if(!passRegex.test(this.password)){
                this.passwordError="Password must be at least 8 characters long, must have one uppercase letter, and one sign!"
            }
        }

    },
    methods:{
        sendSubmit(){
            if(this.username.length<6){
                this.usernameError="Name is less than 6 characters"
                
            }
            if(this.username.length>18){
                this.usernameError="Name cant be more than 18 characters"
                
            }
            if(this.password.length===0){
                this.passwordError="Password is empty!"
                
            }
            if(this.usernameError || this.passwordError){
                return
            }
            axios.post(`/signup`,{username:this.username,password:this.password}).then((res)=>{
               
                if(res.status===200){
                    
                    this.$router.push({name:"Login"})
                }
            }).catch((err)=>{
                console.log(err)
            })
        }
    }
}
</script>

<style>

</style>