const express = require('express')
const User = require('../models/user')
const router = new express.Router()
const auth = require('../middleware/auth')
const multer = require('multer')
const sharp = require('sharp')
const { sendWelcomeEmail, sendGoodbyeEmail } = require('../emails/accounts')

//server.httprequest('path',(request,response){ actions})

//CREATE USER
router.post('/users', async (req,res) => {
    const user = new User(req.body)
    try {
        await user.save()
        sendWelcomeEmail(user.email,user.name)
        //Middleware found in models
        const token = await user.generateAuthToken()
        res.status(201).send({user, token})
    } catch (e) {
        res.status(400).send(e)
    }
})

//LOGIN REQUEST
router.post('/users/login', async (req,res) => {
    try{
        const user = await User.findByCredentials(req.body.email, req.body.password)
        //Middleware found in models
        const token = await user.generateAuthToken()
        res.send({user, token})
    }catch(e){
        res.status(400).send(e)
    }
})


//SEE OUR PROFILE REQUEST
router.get('/users/me', auth, async (req,res) => {
    res.send(req.user)
})

//LOGOUT REQUEST
router.post('/users/logout', auth, async (req,res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token)=>{
            return token.token !== req.token
        })
        await req.user.save()
        
        res.send()
    } catch(e) {
        res.status(500).send()
    }
})

//LOGOUT ALL REQUEST
router.post('/users/logoutALL', auth, async (req,res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch(e) {
        res.status(500).send()
    }
})

//Update user profile
router.patch('/users/me', auth, async (req,res)=> {
    const updateData = (req.body)
    //Update validation to see if inputed data matches what can be updated.
    //Object.keys will grab all of the keys from the inputted data
    const updates = Object.keys(updateData)
    //These are the allowed keys that can be updated
    const allowedUpdates = ['name','email','password','age']
    //This will check every instance of the req.body's keys and see if they are included in the allowed updates. If all match then allowed update returns true. If not then allowed updates returns false.
    const isValidOperation = updates.every((update)=> allowedUpdates.includes(update)
    )

    //If there are any unmatched keys then send error
    if(!isValidOperation){
        return res.status(400).send('Error: Invalid update!')
    }

    try {
        const user = req.user
        const updatedData = req.body
        updates.forEach((update)=> user[update] = updatedData[update])
        await user.save()

        res.send(user)
    }catch(e){
        res.status(400).send(e)
    }
})

//Delete Account
//We have acces to req.user because we are using the authentication middleware. .remove() is a mongodb command to remove documents.
router.delete('/users/me', auth, async (req,res) => {
    try {
        const _id = req.user
        await _id.remove()
        sendGoodbyeEmail(_id.email,_id.name)
        res.send(_id)
    }catch(e){
        res.status(500).send(e)
    }
})

//Upload Middleware
const upload = multer({
    limits: {
        fileSize: 1000000,
    },
    fileFilter(req,file,cb) {
        if(!file.originalname.match(/\.(jpg|jpeg|pdf)$/)){
            return cb(new Error('Upload must be a jpg, jpeg, or pdf file'))
        }
        cb(undefined,true)
    }
})

//Upload user avatar
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req,res) => {
    const upload = req.file
    const user = req.user

    //Uses sharp to resizes image, converts to png, and converts back to binary
    const buffer = await sharp(upload.buffer).resize({width: 250, height: 250}).png().toBuffer()

    user.avatar = buffer
    //.buffer contains all binary data
    await user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({error:error.message})
})

//Create URL to avatar file
router.get('/users/:id/avatar', async (req,res) => {
    try {
        const user = await User.findById(req.params.id)
        if(!user || !user.avatar){
            throw new Error()
        }

        res.set('Content-Type','image/jpg')
        res.send(user.avatar)
    } catch(e) {
        res.status(404).send()
    }
})

//Delete user avatar
router.delete('/users/me/avatar', auth, async (req,res)=>{
    try{
        const _id = req.user
        _id.avatar = undefined
        await req.user.save()
        res.send()
    }catch(e){
        res.status(400).send(e)
    }
})

module.exports = router