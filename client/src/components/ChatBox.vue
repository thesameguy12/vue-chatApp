<template>
    <div class="chatBox" v-if="chat">
        <div class="chat" ref="chatBody" @scroll="chaterPosition">
            <div class="chatHeader">
                {{ chat }}
            </div>
            <div  class="chatBody">
                <div v-if="chatMessages[chat].chatHistory.length===0" class="noChatSelected">
                    No messages yet...
                </div>
                <div v-else class="chatBody">
                    <div style="width:100%;display: flex;justify-content: center;">
                        <div v-if="moreMessages"><div class="spinAnimation"></div></div>
                        <div v-else>No more messages</div>
                    </div>
                    <div v-for="(message,ind) in chatMessages[chat].chatHistory" :key="message.time" :index="message.time" :class="{recived:message.from===chat,sent: message.from !== chat,seen:message.seen}" class="message" :ref="message.from===chat?(!message.seen?'unseen':''):''">
                        <p v-if="(message.from!==username && ind!==0?chatMessages[chat].chatHistory[ind-1].from===username:false)">{{ message.from }}</p>
                      <p class="chatMessageContent">{{ message.message }}</p>
                      <p class="seenMessage" :class="{showSeen:(message.from!==chat && message.seen===1 && ind===chatMessages[chat].chatHistory.length-1)}" >Seen</p>
                    </div>
                    <div v-if="chatMessages[chat].typing" class="message">
                        <div class="chatMessageContent" style="height:13px;display:flex;align-items: end;">
                            <div class="typingAnimation">
                                <div></div>
                                <div></div>
                                <div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="chatMessage">
          <textarea type="text" placeholder="Message..." v-model="message" @keydown="handleMessageTextArea"/>
          <button @click="sendMessage">Send</button>
        </div>
      </div>
    <div class="noChatSelected" v-else>
        <h3>No chat selected</h3>
    </div>
</template>

<script>
import axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

export default {
    name:"ChatBox",
    props:{
        chat:{
            type:String,
            required:true

        },
        online:{
            type:Number,
            required:true

        },
        socket:{
            type:Object,
            required:true
        }
    },
    data(){
        return{
            friends:[],
            message:"",
            chatMessages:{},
            isAtBottom:false,
            isAtTop:false,
            typingTimer:null,
            username:jwtDecode(Cookies.get("token")).username,
            moreMessages:true
        }
    },
    methods:{
        scrollToBottom(smooth){
            this.$refs.chatBody.scrollTo({
                    top: this.$refs.chatBody.scrollHeight,
                    behavior: smooth?"smooth":"auto"
                });
        },
        sendMessage(){
            this.message=this.message.trim("\n")
            this.message=this.message.trim(" ")
            let words=this.message.split(" ")
            let numberOfLetters=0
            for(let i=0;i<words.length;i++){
                if(words[i].length>=30){
                    words[i]=words[i].slice(0,30)+'\n'+words[i].slice(30)
                }
            }
            this.message=words.join(" ")
            let data={
                to:this.chat,
                from:jwtDecode(Cookies.get("token")).username,
                message:this.message,
                seen:0,
                time:new Date().getTime()
            }
            this.socket.emit("message",data)
            this.chatMessages[this.chat].chatHistory.push(data)
            this.$nextTick(()=>{
                this.scrollToBottom(true)
            })
            this.message=""
            
            
        },
        chaterPosition(){
            const component = this.$refs.chatBody;
            const scrollableHeight = component.scrollHeight - component.clientHeight;

            const currentScroll = component.scrollTop;
            
            this.isAtBottom = Math.ceil(currentScroll) >= scrollableHeight;
            this.isAtTop=Math.ceil(currentScroll)===0
        },
        
        setObserver(){
            const recievedMessages=this.$refs.unseen
            
            const observer=new IntersectionObserver(entries=>{
                entries.forEach(entry=>{
                    entry.target.classList.add("seen")
                    console.log("in focus",entry)
                    this.socket.emit("messageSeen",{messageID:entry.target.getAttribute("index"),to:this.chat})
                    if(entry.isIntersecting){
                        observer.unobserve(entry.target)
                    }
                })
            },{
                threshold:0.5
            })
            
            
            if(recievedMessages){

                recievedMessages.forEach(m=>{
                    observer.observe(m)
                })
            }
            
        },
        handleMessageTextArea(e){
            
            if(e.key==="Enter"){
                if (e.shiftKey) {
                    return;
                    }
                e.preventDefault()
                    
                    if(this.message===""){
                        return
                    }
                    this.sendMessage()
                    
                    this.$nextTick(()=>{
                        e.target.focus()
                    })
                
            }
        }
    },
    mounted(){
        
        this.socket.on("message",(data)=>{
            this.chatMessages[data.from].chatHistory.push({
                from:data.from,
                time:data.time,
                message:data.message
            })
            this.$nextTick(()=>{
                this.setObserver()
            })
            if(this.isAtBottom){
                this.$nextTick(()=>{
                    this.scrollToBottom(true)
                })
            }
        })
        this.socket.on("messageSeen",(data)=>{
            for(let i=this.chatMessages[this.chat].chatHistory.length-1;i>=0;i--){
                
                if(this.chatMessages[this.chat].chatHistory[i].time===Number(data.time)){
                    this.chatMessages[this.chat].chatHistory[i].seen=1
                    
                        this.$nextTick(()=>{
                            this.scrollToBottom(true)
                        })
                    
                    return
                }
            }
        })
        this.socket.on("typing",(data)=>{
                  
            this.chatMessages[data.from].typing=true
            if(this.isAtBottom){

                this.$nextTick(()=>{
                    this.scrollToBottom(true)
                    
                })
            }
            clearTimeout(this.typingTimer)
            this.typingTimer=setTimeout(()=>{
                this.chatMessages[data.from].typing=false
            },2000)
            
        })
        
    },
    watch:{
        chat(){
            if(this.chatMessages[this.chat]===undefined){
                axios.get(`/getMessages?chat=${encodeURIComponent(this.chat)}&skip=0`).then((res)=>{
                        this.chatMessages[this.chat]={
                            message:"",
                            chatHistory:[],
                            typing:false
                        }
                        this.chatMessages[this.chat].chatHistory=res.data
                        this.$nextTick(()=>{
                            this.setObserver()
                            this.scrollToBottom(false)
                        })
                    })
            }
            this.$nextTick(()=>{
                            this.setObserver()
                            this.scrollToBottom(false)
                        })
        },
        message(){
            if(this.message!==""){

                this.socket.emit("typing",{to:this.chat,from:this.username})
            }
        },
        isAtTop(){
            if(this.isAtTop){
                
                setTimeout(()=>{

                    axios.get(`/getMessages?chat=${encodeURIComponent(this.chat)}&skip=${this.chatMessages[this.chat].chatHistory.length}`).then((res)=>{
                            this.moreMessages=true    
                            const chatContainer = this.$refs.chatBody; // Reference to the chat container
                            const scrollOffset = chatContainer.scrollHeight - chatContainer.scrollTop;
                            if(res.data.length<25){
                                this.moreMessages=false
                            }
                            this.chatMessages[this.chat].chatHistory=[...res.data,...this.chatMessages[this.chat].chatHistory]
                            this.$nextTick(() => {
                                // Restore the previous scroll position
                                chatContainer.scrollTop = chatContainer.scrollHeight - scrollOffset;
                            });
                        })
                },1000)
                    
            }
        }
    }
}
</script>

<style>
    .noChatSelected{
        width:100%;
        display:flex;
        justify-content: center;
        align-items: center;
    }
    .chatBox{
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width:100%;
    }
    .chatHeader{
        position: sticky;
        top:0;
        border-bottom: 1px solid gray;
        background-color: white;
        height:40px;
        display:flex;
        align-items: center;
        padding-inline: 10px;
    }
    
    .chatMessage{
        width:100%;
        border:1px solid gray;
        padding-block: 0.5rem;
        display: flex;
        gap:10px
    }
    .chatMessageContent{
        border:1px solid gray;
        padding: 0.5em;
        width:fit-content;
        border-radius: 10px;
        margin:none;
        white-space: pre-line

    }
    .chatMessage textarea{
        width:100%;
        margin-left:0.3rem;
        border:1px solid gray;
        border-radius: 10px;
    }
    .chatMessage button{
        margin-inline: 0.3rem;
    }
    .chat{
        
        overflow-y:auto
    }
    .message{
        
        margin-block: 5px;
        width:fit-content;
        font-size: .8rem;
        border-radius: 10px;
        max-width: 400px;
        padding-inline: 0.5rem;
        display:flex;
        flex-direction: column;
        gap:0px
    }
    .message p{
        margin:0
    }
    .chatBody{
        display: flex;
        flex-direction: column;
    }
    .recived{
        align-self: flex-start;
    }
    .sent{
        align-self: flex-end;
    }
    
    .seenMessage{
        display: none;
        align-self: flex-end;
    }
    .showSeen{
        display:block
    }
</style>