//                                         PASSPORT   +     OAUTH       main
require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const formidable=require("express-formidable");
const multer = require("multer");
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
const path = require('path');
const { Socket } = require('socket.io');
const { MulterError } = require('multer');
const { stringify } = require('querystring');
const accessTokenSecret="sumitghosh1234"
const app=express();


app.set(formidable());
app.set(bodyParser.urlencoded({extended:true}));
app.set(express.static("public"));
app.set("view engine","ejs");



app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set("view engine","ejs");





app.use(session({
    secret:"Our litle secret.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());  //Level 4  passport initialization
app.use(passport.session());     //Level 4  manage session by passport





//mongoose.connect("mongodb://localhost:27017/userDB",{UseNewUrlParser:true});
mongoose.connect("mongodb+srv://Sumit:ssssuuuu@cluster0.ebwns.mongodb.net/USERDB",{UseNewUrlParser:true});



const userSchema=new mongoose.Schema({     //for authentication schema
    firstName:String,
    lastName:String,
    username:String,
    password:String,
    googleId:String,
    facebookId:String,
    city:String,
    country:String,
    Phone:String,
    google:{},
    posts:[{
        date:String,
        title:String,
        content:String,
        imagePost:String
    }],  
    image:String,
    friends:[],
    shares:[
        {
            date:String,
            owner:String,
            ownerName:String,
            ID:String,
            title:String,
            content:String,
            img:String
        }
    ]
});


userSchema.plugin(passportLocalMongoose);   
userSchema.plugin(findOrCreate); 


const User=mongoose.model("User",userSchema);

var Storage=multer.diskStorage({
    destination:"public/uploads/", 
    filename:(req,file,cb)=>{
        cb(null,file.fieldname+"_"+Date.now()+path.extname(file.originalname));
    }
});

const maxSize=1*1024*1024  //1MB
var upload=multer({
    storage:Storage,
    fileFilter:(req,file,cb)=>{
        if(file.mimetype=="image/png" || file.mimetype=="image/jpg" ||file.mimetype=="image/jpeg"){
            cb(null,true);
        }
        else{
            cb(null,false);
            return cb(new Error("Only .png , .jpg , .jpeg format allowed!"));
        }
    },
    limits:{fileSize:maxSize},

}).single("file");





passport.use(User.createStrategy());


//serialize and deserialize user by local Strategy or any third party Strategy (googleStrategy)
passport.serializeUser(function(user, done) {     //create cookie
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {    //save cookie and exit session
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

/*
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/dashboard",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
    
  },                                                                      //clientID , clientSecret etc verification er por callback function kaj korbe.
  function(accessToken, refreshToken, profile, cb) {       //google user ke verify korle amr app login korabe and profile info save korbe database e.
      console.log(profile._json.picture);
      User.findOrCreate({ googleId: profile.id}, function (err, user) {
      return cb(err, user);
    });
  }

));*/

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/dashboard",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, done) {
    console.log(profile.photos[0].value);
    //check user table for anyone with a facebook ID of profile.id
    User.findOrCreate({
        googleId: profile.id
    }, function(err, foundUser) {
        if (err) {
            return done(err);
        }
        if(foundUser){
            foundUser.username=profile.id;
            foundUser.image=profile.photos[0].value;
            foundUser.firstName=profile.displayName;
            foundUser.google=profile._json;
            foundUser.save();
            return done(err, foundUser);
        }
        

        //No user was found... so create a new user with values from Facebook (all the profile. stuff)
        if(!foundUser) {
            x1 = new User({
                firstName: profile.displayName,
                username: profile.id,
                googleId:profile.id,
                google:profile._json,
                image:profile.photos[0].value,
                /*provider: 'facebook',
                //now in the future searching on User.findOne({'facebook.id': profile.id } will match because of this next line
                facebook: profile._json*/
            });
            x1.save(function(err) {
                //if (err) console.log(err);
                return done(err, foundUser);
            });
        }
        
        
    });
}
));

/*
passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/dashboard"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id}, function(err, user) {
        return cb(err, user);  
    });
  }
));*/


  



app.get("/auth/google",
    passport.authenticate("google",{scope:["profile"]})

);


app.get("/auth/google/dashboard", 
  passport.authenticate('google', { failureRedirect: '/loginKaro' }),         //failure hole redirect to login
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/dashboard");
});

/*
app.get("/auth/facebook",
    passport.authenticate("facebook",{scope:["profile"]})

);

app.get("/auth/facebook/dashboard", 
  passport.authenticate('facebook', { failureRedirect: '/loginKaro' }),         //failure hole redirect to login
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/dashboard");
});
*/
app.get("/",function(req,res){
    res.render("home");
});

app.get("/dashboard",function(req,res){
    if(req.isAuthenticated()){
        res.render("dashboard",{OWNPOSTS:req.user.posts,USER:req.user,IMG:req.user.image}); 
        
    }
    else{
        res.redirect("/loginKaro");
    }
});

app.post("/dashboard",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(foundUser)
            {
                
                console.log(foundUser.friends);
            }
            else{
                console.log(err);
            }
        })
        res.render("compose");
        
    }
    else{
        res.redirect("/loginKaro");
    }
});
function getDate(){
    var today=new Date();
    var options={           //3rd
        day:"numeric",
        month:"long",
        weekday:"long"
    }
    var day=today.toLocaleDateString("en-US",options);
    return day;
}
app.post("/compose",upload,function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(foundUser)
            {
                
                foundUser.posts.push({title:req.body.postTitle,content:req.body.postBody,imagePost:req.file.filename,date:getDate()});
                foundUser.save();
                res.redirect("/dashboard");
            }
            else{
                console.log(err);
            }
    
        })
    }
    else{
        res.redirect("/loginKaro");
    }
    
})

app.get("/registerKaro",function(req,res){
    res.render("register")
});

app.get("/loginKaro",function(req,res){
    res.render("login");
});

app.post("/registerKaro",upload,function(req,res){
    //console.log(req.body.username,req.body.gender);
    User.findOne({username:req.body.username},function(err,foundUser){
        if(foundUser){
            res.render("alreadyexist");
        }
        else{
            User.register({firstName:req.body.firstName,lastName:req.body.lastName,username:req.body.username,image:req.file.filename},req.body.password,function(err,user){
                if(err){
                    console.log(err);
                    //err instanceof multer.MulterError
                }
                else{
                    passport.authenticate("local")(req,res,function(){
                        res.redirect("/dashboard");
                    });
                }
            });
        }
    });

});  /*
app.post('/registerKaro', function (req, res) {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        console.log("mult");
        res.render("alreadyexist");
      } else if (err) {
        console.log(err);
      }
      User.findOne({username:req.body.username},function(err,foundUser){
        if(foundUser){
            res.render("alreadyexist");
        }
        else{
            User.register({firstName:req.body.firstName,lastName:req.body.lastName,username:req.body.username,image:req.file.filename},req.body.password,function(err,user){
                if(err){
                    console.log(err);
                }
                else{
                    passport.authenticate("local")(req,res,function(){
                        res.redirect("/dashboard");
                    });
                }
            });
        }
    });
    })
  })*/


app.post("/loginKaro",function(req,res){
    
    const user=new User({
        username:req.body.username,
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


app.get("/search/:query",function(req,res){
    if(req.isAuthenticated()){
        var query=req.params.query;
        User.find({firstName:{$regex:".*"+req.params.query+".*",$options:"i"}},function(err,foundUser){
            for( var i = 0; i < foundUser.length; i++){
                if(req.user.username===foundUser[i].username)
                {
                    foundUser.splice(i, 1);
                    console.log("matched",req.user.username);
                }    
                else{
                    console.log("not matched");
                   
                }
                
            }
            res.render("search",{FU:foundUser,MAIN:req.user._id});
        });
    }
    else{
        res.redirect("/loginKaro");
    }
    
});

app.post("/search",function(req,res){
    
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(foundUser){
                if(foundUser._id!==req.body.userId)
                {
                    var c=false;
                    for(var i=0;i<foundUser.friends.length;i++){
                        if(foundUser.friends[i]===req.body.userId){
                            c=true;
                            break;
            
                        }
                    }
                    if(!c){
                        foundUser.friends.push(req.body.userId);
                        foundUser.save();
                    }
                }
                res.redirect("/dashboard");
            }
            else{
                console.log(err);
            }
        })
    }
    else{
        res.redirect("/loginKaro");
    }
    

});

app.post("/friendPosts",function(req,res){
    if(req.isAuthenticated()){
        //req.user._id
        User.findById(req.body.userId,function(err,foundUser){
            if(foundUser)
            {
                //console.log(foundUser._id,req.body.userId,req.user._id);
                res.render("friendPosts",{FOUNDUSER:foundUser});
            }
            else{
                console.log(err);
            }
    
        })
    }
    else{
        res.redirect("/loginKaro");
    }
});

app.get("/sharedPosts",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(foundUser)
            {
                res.render("sharedPosts",{SHARES:foundUser.shares});
            }
            else{
                console.log(err);
            }
    
        })
    }
    else{
        res.redirect("/loginKaro");
    }
})
app.post("/sharedPosts",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(foundUser)
            {
                var t=false;
                    for(var i=0;i<foundUser.shares.length;i++){
                        
                        if(foundUser.shares[i].ID===req.body.postId){
                            t=true;
                            break;
                        }
                    }
                    if(!t){
                        console.log("I",req.body.ownerName);
                        foundUser.shares.push({owner:req.body.userId,ownerName:req.body.ownerName,ID:req.body.postId,title:req.body.postTitle,content:req.body.postContent,img:req.body.postImg,date:req.body.postDate});
                        foundUser.save();
                    }
                
                res.redirect("/dashboard");
            }
            else{
                console.log(err);
            }
    
        })
    }
    else{
        res.redirect("/loginKaro");
    }
    
})

app.get("/updateProfile",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(foundUser)
            {
                res.render("editProfile",{USER:foundUser});
            }
            else{
                console.log(err);
            }
        });
    }
    else{
        res.redirect("/loginKaro");
    }
});



app.post("/updateProfile",upload,function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(foundUser)
            {
                
                foundUser.city=req.body.city,
                foundUser.country=req.body.country;
                foundUser.Phone=req.body.phone;
                foundUser.image=req.file.filename;
                foundUser.save();
                res.redirect("/dashboard");
            }
            else{
                console.log(err);
            }
    
        })
    }
    else{
        res.redirect("/loginKaro");
    }
});




const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(process.env.PORT || 3000,function(){
    console.log("Started.");
});
//server.listen(process.env.PORT);

console.log("server up");
/*
app.get('/msg', function (req, res) {
    if(req.isAuthenticated()){
        res.render("chatting");
    }
    else{
        res.redirect("/loginKaro");
    }
});*/

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





/*app.get("/secrets",function(req,res){
    User.find({"secrets":{$ne:null}},function(err,foundUsers){
        res.render("secrets",{userWithSecrets:foundUsers});
    });
}); */

/*
app.post("/info",function(req,res){
    console.log();
})
app.get("/editPost",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id,function(err,foundUser){
            if(foundUser)
            {
                res.render("edit",{USERID:foundUser._id,POSTS:foundUser.posts,POSTID:req.body.postId});
                //console.log(req.body.postId);
            }
            else{
                console.log(err);
            }
        });
        console.log(req.body.postId);
        
    }
    else{
        res.redirect("/loginKaro");
    }
});*/