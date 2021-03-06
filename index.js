// SMSForums Index of routes and requirements for the application to run

// All code will be expanded upon with comments to make 
// practice in learning concepts and requirments for 
// Web Development


//Requirments
const express = require('express');
const path = require('path');
const mongoose= require('mongoose');
const ForumPost=require('./models/forumPost');
const Comment = require('./models/comment');
const { render } = require('ejs');
const {postSchema, commentSchema}=require('./schemas.js');
const methodOverride=require('method-override');
const ejsMate=require('ejs-mate');
const catchAsync=require('./utils/catchAsync');
const ExpressError=require('./utils/ExpressError');
const Joi = require('joi');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');

const userRoutes = require('./routes/users');
const forums = require('./routes/forums');


//Connecting mongoose to MongoDB database
mongoose.connect('mongodb://localhost:27017/SMSForums',{
    useNewUrlParser:true,
    useCreateIndex:true,
    useUnifiedTopology:true
});

const db=mongoose.connection;

//Error logic
db.on('error',console.error.bind(console,"connection error:"));
db.once("open",()=>{
    console.log("Database connected")
});

//Setting Express to run server
const app = express();


app.engine('ejs',ejsMate);
//Requirments for ejs
app.set('view engine','ejs');
//Setting directiory for ejs folder 'views' so application can run outside home folder
app.set('views',path.join(__dirname,'views'));


app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(methodOverride('_method'));

//Cookie Configuration

const sessionConfig={
    secret:"flashliquidizerultradousingdevice",
    resave:false,
    saveUninitialized: true,
    cookie:{
        httpOnly:true,
        expires: Date.now() + 604800000, //Milliseconds in a week
        maxAge:604800000
    }
}
app.use(session(sessionConfig))
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.currentUser=req.user;
    res.locals.success= req.flash('success');
    res.locals.error=req.flash('error');
    next();
})


//.get to render pages for url loads
app.use('/',userRoutes);
app.use('/forums',forums);

app.get('/',(req,res)=>{
    res.render('home')
})

app.all('*',(req,res,next)=>{
    next(new ExpressError('Page Not Found',404));
})

app.use((err,req,res,next)=>{
    const {statusCode=500}=err;
    if(!err.message) err.message="Oh No, Something Went Wrong";
    res.status(statusCode).render('error', {err});
})

//Confrims server is running properly 
app.listen(3000,()=>{
    console.log('Serving on port 3000')
})