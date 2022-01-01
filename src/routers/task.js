const express = require('express')
const Task = require('../models/task')
const auth = require('../middleware/auth')
const router = new express.Router()

//server.httprequest('path',(request,response){ actions})

//UPLOAD TASK
router.post('/tasks', auth, async (req,res) =>{
    
    const task = new Task({
        //... is the spread syntax. it is used when you need all elements of an object. This would get "description","completed", and separately "owner"
        ...req.body,
        owner: req.user
    })
    try {
        await task.save()
        res.status(201).send(task)
    } catch(e) {
        res.status(400).send(e)
    }
})

//GET TASKS /W QUERY STRING
//GET /tasks   -grabs all tasks
//GET /tasks?limit=10skip=0
//GET /tasks?completed=true
//GET /tasks?sortBy=createdAt:asc/desc ascend/descend

router.get('/tasks', auth, async (req,res) => {
    const _id = req.user
    const input = req.query
    const match = {}
    const sort = {}

    if(input.completed){
        match.completed = input.completed === 'true'
    }
    if(input.sortBy){
        const parts = input.sortBy.split(':')
        //-1 means descend and 1 means ascend
        sort[parts[0]] = parts[1]==='desc' ? -1 : 1
    }

    try {
        await _id.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(input.limit),
                skip: parseInt(input.skip),
                sort
            }
            
        })
        res.send(_id.tasks)
    } catch(e) {
        res.status(500).send(e)
    }
})

//FIND TASK BY ID
router.get('/tasks/:id', auth, async (req,res) => {
    const _id = req.params.id
    const userId = req.user._id
    try {
        const task = await Task.findOne({ _id, owner: userId})
        if(!task) {
            return res.status(404).send()
        }
        res.send(task)
    }catch(e){
        res.status(500).send(e)
    }
})

//UPDATE TASK
router.patch('/tasks/:id', auth, async (req,res)=>{
    const updateData = (req.body)
    const updates = Object.keys(updateData)
    const allowedUpdates = ['description','completed']
    const isValidOperation = updates.every((update)=> allowedUpdates.includes(update))

    if(!isValidOperation) {
        return res.status(400).send('Error: Invalid update!')
    }

    try{
        const _id = req.params.id
        const userId = req.user._id

        const task = await Task.findOne({ _id, owner: userId})

        if(!task){
            return res.status(400).send()
        }

        updates.forEach((update) => task[update] = req.body[update])

        await task.save()
        res.send(task)

    }catch(e){
        res.status(400).send(e)
    }
})

//DELETE SPECIFIC TASK
router.delete('/tasks/:id', auth, async (req,res) =>{
    try {
        const _id = req.params.id
        const userId = req.user._id
        const task = await Task.findOneAndDelete({_id, owner: userId})
        
        if(!task){
            return res.status(404).send()
        }
        res.send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

module.exports = router