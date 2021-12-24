const io = require('socket.io')(8000);
const users=[];
io.on('connection',function(socket){
    console.log("User connected",socket.id);
    socket.on("new-user-joined",function(name){
        console.log("s",name);
        users[socket.id]=name;
        socket.emit("user-joined",name);
    });
    socket.on("send",function(message){
        socket.emit("receive",{message:message,name:users[socket.id]});
    });

});