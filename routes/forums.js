const express = require('express');
const router = express.Router();
const ForumPost=require('../models/forumPost');
const Comment = require('../models/comment');
const catchAsync=require('../utils/catchAsync');
const ExpressError=require('../utils/ExpressError');
const {postSchema, commentSchema}=require('../schemas.js');
const mongoose = require('mongoose');
const {isLoggedIn,isAuthor,isCommentAuthor} = require('../middleware');


const validatePost = (req,res,next)=>{
    const {error}= postSchema.validate(req.body);
    if(error){
        const msg=error.details.map(el=>el.message).join(',');
        throw new ExpressError(msg,400);
    }else{
        next();
    }
}

const validateComment = (req,res,next) =>{
    const {error}= commentSchema.validate(req.body);
    if(error){
        const msg=error.details.map(el=>el.message).join(',');
        throw new ExpressError(msg,400);
    }else{
        next();
    }
}

router.get('/',catchAsync(async (req,res)=>{
    const forums=['General','Guides','Speedrun','Art','Easter Eggs','Humor']
    const counter=0;
    const posts= await ForumPost.find({});
    res.render('forums/forumHome',{forums,posts,counter});
    //$or[{category:'General'},{category:'Guides'},{category:'Speedrun'},{category:'Art'},{category:'Easter Eggs'},{category:'Humor'}]
}))

router.get('/new',isLoggedIn,(req,res)=>{
    res.render('forums/new');
})

router.get('/:tagId',catchAsync(async(req,res)=>{
    const c=req.params.tagId;
    const sub=c.charAt(0).toUpperCase()+c.slice(1); //category is normally capitalized but url parses as lowercased, this 
    const posts=await ForumPost.find({category:sub});//logic capitalizes first letter
    console.log(posts);
    res.render('forums/forumShow',{posts,sub})
}))

router.get('/:tagId/:id',catchAsync(async(req,res)=>{
    //Error Handlers for Invalid URL
    if (!mongoose.Types.ObjectId.isValid(req.params.id)){
        req.flash('error','Invalid URL');
        return res.redirect(`/forums/${req.params.tagId}`);
    }
    const post=await ForumPost.findById(req.params.id).populate({
        path:'comments',
        populate:{
            path:'author'
        }
    }).populate('author');
    if(!post){
        req.flash('error','Post No longer exists');
        return res.redirect(`/forums/${req.params.tagId}`);
    }
    console.log(post.quillText);
    const JSONBody= JSON.parse(post.quillText);
    const postBody=JSONBody.ops;
    const length=postBody.length;
    console.log(postBody);
    res.render('forums/show',{post,postBody,length});
}))

router.get('/:tagId/:id/edit',isLoggedIn,isAuthor,catchAsync(async(req,res)=>{
    const post=await ForumPost.findById({_id:req.params.id});
    const JSONBody= JSON.parse(post.quillText);
    const quillBody=JSONBody.ops;
    res.render('forums/edit',{post,quillBody});
}))

router.post('/', isLoggedIn, validatePost, catchAsync(async (req,res)=>{
    const newPost=new ForumPost(req.body);
    newPost.author=req.user._id;
    await newPost.save();
    req.flash('success','Post Successfully Created');
    res.redirect(`/forums/${newPost.category}/${newPost._id}`)
}))

router.put('/:tagId/:id', isLoggedIn,isAuthor,catchAsync(async(req,res)=>{
    const {id,tagId}=req.params;
    await ForumPost.findByIdAndUpdate(id,{...req.body})
    req.flash('success','Successfully Updated Post')
    res.redirect(`/forums/${tagId}/${id}`)
}))

router.delete('/:tagId/:id',isLoggedIn,isAuthor,catchAsync(async(req,res)=>{
    const id=req.params.id;
    await ForumPost.findByIdAndDelete(id);
    res.redirect(`/forums/${req.params.tagId}`);
}))

router.post('/:tagId/:id/comments',isLoggedIn,validateComment,catchAsync(async(req,res)=>{
    const post = await ForumPost.findById(req.params.id);
    const comment = await new Comment(req.body);
    comment.author=req.user._id;
    post.comments.push(comment);
    await comment.save();
    await post.save();
    res.redirect(`/forums/${req.params.tagId}/${req.params.id}`);
}))

router.delete('/:tagId/:id/comments/:commentId',isLoggedIn,isCommentAuthor,catchAsync(async(req,res)=>{
    const{tagId,id,commentId}=req.params;
    await ForumPost.findByIdAndUpdate(id,{$pull:{comments:commentId}});
    await Comment.findByIdAndDelete(commentId);
    res.redirect(`/forums/${tagId}/${id}`);
}))

module.exports=router;