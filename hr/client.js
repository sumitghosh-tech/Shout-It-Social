const socket=io("http://localhost:8000");
const form=document.getElementById("send-container");
const messageInput=document.getElementById("messageInp");
const messageContainer=document.querySelector(".container");

const append=(message,position)=>
{
    const messageElement=document.createElement("div");
    messageElement.innerText=message;
    messageElement.classList.add("message");
    messageElement.classList.add(position);
    messageContainer.append(messageElement);
}

const namet=prompt("enter your name to join");
socket.emit("new-user-joined",namet);

socket.on("user-joined",function(data){
    append("$(name) joined the chat","right");
})