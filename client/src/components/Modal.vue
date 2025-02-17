<template>
  <div v-if="isOpen" class="modalContainer" @click.self="close">
    <div class="modalBody">

        <div class="modalContent">
            <div class="modalHeader">
                {{ title }}
            </div>
            <slot></slot>
        </div>
        <div class="modalOptions">
            <button v-if="showConfirm" @click="confirm">Yes</button>
            <button v-if="showCancle" @click="close">No</button>
        </div>
    </div>
  </div>
</template>

<script>
export default {
    name:"Modal",
    props:{
        isOpen:{type:Boolean},
        title:{type:String,default:""},
        showConfirm:{type:Boolean,default:true},
        showCancle:{type:Boolean,default:true}
    },
    methods:{
        close(){
            this.$emit("close")
        },
        confirm(){
            this.$emit("confirm")
        }
    }
}
</script>

<style>
    .modalContainer{
        z-index: 1000;
        width:100vw;
        height:100vh;
        background:rgba(0,0,0,0.5);
        position: fixed;
        top:0;
        right:0;
        
        display:flex;
        justify-content: center;
        align-items: center;
    }
    .modalBody{
        z-index:1001;
        width:fit-content;
        min-width: 200px;
        max-width: 60%;
        background: white;
        height: fit-content;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        padding: 1em;
        border-radius: 8px;
        justify-content: space-between;
    }
    .modalContent{
        width: fit-content;
        margin-bottom: 15px;
    }
    .modalOptions{
        width:100%;
        display: flex;
        justify-content: end;
        gap:15px
    }
    .modalHeader{
        width: 100%;
        margin-block: 10px;
        font-weight: bold;
    }
</style>