
require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const formidable=require("express-formidable");

const ejs=require("ejs");
const mongoose = require('mongoose');
const session = require("express-session");                          
const passport=require("passport");                                  
const passportLocalMongoose=require("passport-local-mongoose");      
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const fileSystem=require("fs");
const jwt=require("jsonwebtoken");
const accessTokenSecret="sumitghosh1234"

const app=express();

var socketID=""
const http = require('http').createServer(app);
app.set(formidable());
app.set(bodyParser.urlencoded({extended:true}));
app.set(express.static("public"));
app.set("view engine","ejs");
const io = require('socket.io')(http);
io.on('connection',function(socket){
    console.log("User connected",socket.id);
    socketID=socket.id;
});


app.use(session({
    secret:"Our litle secret.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());  //Level 4  passport initialization
app.use(passport.session());     //Level 4  manage session by passport





mongoose.connect("mongodb+srv://Sumit:ssssuuuu@cluster0.ebwns.mongodb.net/userDB",{UseNewUrlParser:true});

const userSchema=new mongoose.Schema({     //for authentication schema
    firstName:String,
    gender:String,
    lastName:String,
    username:String,
    password:String,
    googleId:String,
    facebookId:String,
    posts:[],  
    profilePhoto:String,
    friends:[],
    pages:[],
    groups:[],
    Notifications:[]
});




userSchema.plugin(passportLocalMongoose);   
userSchema.plugin(findOrCreate); 


const User=mongoose.model("User",userSchema);


passport.use(User.createStrategy());


//serialize and deserialize user by local Strategy or any third party Strategy (googleStrategy)

  passport.serializeUser(function(user, done) { //create cookie
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {//save cookie and exit session
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
    
  },                                                                      //clientID , clientSecret etc verification er por callback function kaj korbe.
  function(accessToken, refreshToken, profile, cb) {       //google user ke verify korle amr app login korabe and profile info save korbe database e.
      //console.log(profile);
      User.findOrCreate({ googleId: profile.id}, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id}, function(err, user) {
        return cb(err, user);  
    });
  }
));

app.get("/auth/google",
    passport.authenticate("google",{scope:["profile"]})

);
app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/loginKaro' }),         //failure hole redirect to login
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});
app.get("/auth/facebook",
    passport.authenticate("facebook",{scope:["profile"]})

);
app.get("/auth/facebook/secrets", 
  passport.authenticate('facebook', { failureRedirect: '/loginKaro' }),         //failure hole redirect to login
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});





app.get("/",function(req,res){
    res.render("home");
});

app.get("/registerKaro",function(req,res){
    res.render("register")
});

app.get("/loginKaro",function(req,res){
    res.render("login");
});

app.get("/dashboard",function(req,res){
    if(req.isAuthenticated()){
        res.render("dashboard"); //,{OWNPOSTS:req.user.posts,USER:req.user._id}
        
    }
    else{
        res.redirect("/loginKaro");
    }
});

app.post("/dashboard",function(req,res){
    if(req.isAuthenticated()){
        res.render("compose");
        
    }
    else{
        res.redirect("/loginKaro");
    }
});

/*
app.post("/editPost",function(req,res){
    if(req.isAuthenticated()){
        Post.findById(req.body.postId,function(err,foundPost){
            res.render("edit",{USERID:req.body.userId,POSTID:req.body.postId,PostTitle:foundPost.title,PostContent:foundPost.content});
        })
        
    }
    else{
        res.redirect("/loginKaro");
    }
});

app.post("/finalEdit",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.body.userId,function(err,foundUser){
            
        })
    }
    else{
        res.redirect("/loginKaro");
    }
})





*/
app.post("/registerKaro",function(req,res){
    console.log(req.body.email,req.body.gender);
    User.findOne({username:req.body.email},function(err,foundUser){
        if(foundUser){
            res.render("alreadyexist");
        }
        else{
            User.register({firstName:req.body.firstName,lastName:req.body.lastName,username:req.body.email},req.body.password,function(err,user){
                if(err){
                    console.log(err);
                    res.redirect("/registerKaro");
                }
                else{
                    passport.authenticate("local")(req,res,function(){
                        res.redirect("/secrets");
                    });
                }
            });
        }
    });

}); 

 

app.post("/loginKaro",function(req,res){
    
    const user=new User({
        username:req.body.email,
        password:req.body.password
    });


    User.findOne({username:req.body.username},function(err,foundUser){
        if(foundUser){
            req.login(user,function(err){
                if(err)
                {
                    console.log(err);
                    res.redirect("/registerKaro");
                }
                else{{
                    passport.authenticate("local")(req,res,function(){
                        res.redirect("/dashboard");
                    });
                }};
            });
        }
        else{
            res.render("notlogged");
        }
        
    });
   
        
    
    
    
});

app.get("/logout",function(req,res){
    req.logOut();
    res.redirect("/");
    

});
app.listen(3000,function(){
    console.log("Server started");
});



/*  <% OWNPOSTS.forEach(function(element){  %>
  
    <form class="" action="/editPost" method="post">
    
    <div class="form-group">
      <label>Title</label>
      <p><%=element.title%></p>
      <label>Post</label>
      <p><%=element.content%></p>
    </div>
    <input type="hidden" name="postId" value="<%=element._id%>"></input>
    <input type="hidden" name="userId" value="<%=USER%>"></input>
    <button class="btn btn-primary" type="submit" name="button">Edit Post</button>   
  </form>
  <% })  %> */