<template>
    
  <div class="menu">
    <Modal :isOpen="modalOptions.isOpen" :title="modalOptions.title" @close="modalOptions.isOpen=false" @confirm="handleRemoveFriend">
        Do you want to unfriend {{ modalOptions.user }}
    </Modal>
    <div class="userInfo">
        Welcome {{ username }} <button @click="handleLogout">Log Out</button>
    </div>
    <input type="text" placeholder="Find friends" class="findFriends" v-model="findFriendsText"/>
    <div class="friendsList">
        <div class="options">
            <h3 @click="this.option='friends'">Friends({{ this.friends?.length || 0 }})</h3>
            <h3 @click="this.option='requests'">Requests({{ this.requrests?.length || 0 }})</h3>
        </div>

        <div class="myFriendsList flist" v-if="option==='friends'">
            <div v-if="friends.length===0">No friends.</div>
            <div v-for="friend in friends" class="friend" :class="{selectedFriend:selectedChat===friend.user}" @click="handleSelect(friend)">
                <div v-if="friend.online" class="online marker"></div>
                <div v-else class="offline marker"></div><div >{{ friend.user }}</div><div class="userMenuOptions" @click.stop="openModal(friend.user)"><svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-width="3" stroke="#000000" fill="none"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><circle cx="29.22" cy="16.28" r="11.14"></circle><path d="M41.32,35.69c-2.69-1.95-8.34-3.25-12.1-3.25h0A22.55,22.55,0,0,0,6.67,55h29.9"></path><circle cx="45.38" cy="46.92" r="11.94"></circle><line x1="38.98" y1="46.8" x2="52.98" y2="46.8"></line></g></svg></div>
            </div>
        </div>

        <div class="findFriendsList flist" v-if="option==='findFriends'">
            <div v-if="noUserFound">No user found.</div>
            <div  v-for="user in findFriends">
                <div><button @click="sendFriendRequest(user.username)">Add</button>{{ user.username }}  </div>
            </div>
            <button v-if="findFriends.length>=5 && !noMoreFriends" @click="findMoreFriends">Load more...</button>
        </div>
        <div class="requsetFriendsList flist" v-if="option==='requests'">
            <div v-if="requrests.length===0">No requests.</div>
            <div v-for="request in requrests">
                <div><button @click="acceptFriendRequest(request.user)">Accept</button>{{ request.user }}</div>
            </div>
        </div>
    </div>
  </div>
  
</template>

<script>
import axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import Modal from './Modal.vue';
export default {
    name:"Menu",
    components:{Modal,},
    props:{
        socket:{
            type:Object,
            required:true
        }
    },
    
    data(){
        return{
            username:jwtDecode(Cookies.get("token")).username,
            friends:[],
            findFriends:[],
            requrests:[],
            findFriendsText:"",
            option:"friends",
            unseenMessages:0,
            typingTimer:null,
            noMoreFriends:false,
            selectedChat:"",
            noUserFound:false,
            modalOptions:{
                title:"Warning",
                isOpen:false,
                user:""
            }
        }
    },
    methods:{
        openModal(user){
            this.modalOptions.user=user
            this.modalOptions.isOpen=true
        },
        handleRemoveFriend(){
            axios.delete(`/friend?username=${this.modalOptions.user}`).then((res)=>{
                if(res.status===200){
                    this.getFriends()
                    this.modalOptions.isOpen=false
                }
            }).catch((err)=>{
                if(err.status===400){
                    this.$router.push({name:"Login"})
                }
            })
        },
        handleSelect(user){
            this.$emit("set-chat",{user:user.user,online:user.online})
            this.selectedChat=user.user
        },
        getFriends(){
            axios.get(`/friends/${this.username}`).then((res)=>{
                this.friends=res.data
                this.socket.emit("online",{username:this.username,friends:this.friends})
            }).catch(()=>{
                this.$router.push({name:"Login"})
            })
        },
        getRequests(){
            axios.get(`/requests/${this.username}`).then((res)=>{
                console.log(res.data)
                this.requrests=res.data
                    
            }).catch(()=>{
                this.$router.push({name:"Login"})
            })
        },
        handleLogout(){
            axios.delete(`/login`,{ withCredentials: true }).then((res)=>{
                
                if(res.status===200){
                    this.socket.emit("logout",{username:this.username,friends:this.friends})
                    if (this.socket) {
                        this.socket.disconnect();
                    }
                    
                    this.$router.push({name:"Login"})
                }
            }).catch((err)=>{
                console.log(err)
            })
        },
        sendFriendRequest(username){
            console.log(this.findFriends)
            axios.get(`/sendFriendRequest/${username}`).then(res=>{
                console.log(res)
                if(res.status===200){
                    this.findFriends=this.findFriends.filter((name)=> name.username!==username)
                    this.getFriends()
                }
            }).catch(err=>{
                this.$router.push({name:"Login"})
            })
        },
        findMoreFriends(){
            axios.get(`/getMatchUsername?username=${this.findFriendsText}&skip=${this.findFriends.length}`).then((res)=>{
                        if(res.data.length===0){
                            this.noMoreFriends=true
                        }else{

                            this.findFriends=[...this.findFriends,...res.data]
                        }
                    }).catch((err)=>{
                        this.$router.push({name:"Login"})
                    })
        },
        acceptFriendRequest(username){
            axios.get(`/acceptFriendRequest/${username}`).then((res)=>{
                if(res.data==="good"){
                    this.getFriends()
                    this.getRequests()
                }
            }).catch(()=>{
                this.$router.push({name:"Login"})
            })
        }
    },
    watch:{
        findFriendsText(){
            this.noUserFound=false
            this.findFriends=[]
            if(this.findFriendsText.trim().length>0){
                this.option="findFriends"
                
                clearTimeout(this.typingTimer)
                this.typingTimer=setTimeout(()=>{
                    if(this.findFriendsText.trim().length>0){

                        axios.get(`/getMatchUsername?username=${encodeURIComponent(this.findFriendsText)}&skip=${this.findFriends.length}`).then((res)=>{
                            this.noMoreFriends=false
                            
                            this.findFriends=res.data
                            if(this.findFriends.length===0){
                                
                                this.noUserFound=true
                            
                            }
                        }).catch((err)=>{
                            
                            this.$router.push({name:"Login"})
                        })
                    }
                },1000)
            }else{
                this.findFriends=[]
                this.option="friends"
            }
        },
    },
    props:{
        socket:{
            type:Object,
            required:true
        }
    },
    mounted(){
        
        this.getFriends()
        this.getRequests()
        this.socket.on("offline",(data)=>{
            for( let i=0;i<this.friends.length;i++){
                if(this.friends[i].user===data.user){
                    this.friends[i].online=0
                }
            }
        })
        this.socket.on("online",(data)=>{
            for( let i=0;i<this.friends.length;i++){
                if(this.friends[i].user===data.user){
                    this.friends[i].online=1
                }
            }
        })
    },
}
</script>

<style>
.options h3:hover{
    cursor: pointer;
}
    .findFriends{
        margin-top:0.8rem;
    }
    .findFriends input{
        width:100%
    }
    .options{
        display: flex;
        justify-content: space-between;
        padding-inline:0.5rem;
        border-bottom: 1px solid gray;
        font-size: 0.7rem;
    }
    .flist{
        display:flex;
        flex-direction: column;
        overflow-y: auto;
        max-height: 100%;
    }
    .flist>div{
        cursor: pointer;
        border-bottom: 1px solid gray;
        padding-inline: 0.5em;
        height:35px;
     
        display:flex;
        align-items: center;
        transition:background-color 0.3s linear;
    }
    .selectedFriend{
        background-color: rgb(212, 210, 210);
    }
    .flist>div:hover{
        background-color: rgb(238, 235, 235);
    }
    
</style>