//const io = require('socket.io')(5500)  //process.env.PORT

const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(5500);
//server.listen(process.env.PORT);

console.log("server up");

app.get('/', function (req, res) {
    res.sendFile(__dirname+'/index.html');
});

const users = {}


io.on('connection', socket => {
  socket.on('new-user', name => {
    users[socket.id] = name
    socket.broadcast.emit('user-connected', name)
  })
  socket.on('send-chat-message', message => {
    socket.broadcast.emit('chat-message', { message: message, name: users[socket.id] })
  })
  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', users[socket.id])
    delete users[socket.id]
  })
})