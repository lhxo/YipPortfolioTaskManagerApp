const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('./task')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value){
            if(!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minLength: 7,
        validate(value){
            if(value.toLowerCase().includes('password')){
                throw new Error('Password cannot contain "password"')
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        validate(value){
            if(value<0) {
                throw new Error('Age must be a positive number')
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
})

//Virtual Properties
//This creates a virtual relationship between User Model and Task Model. We are storing 'myTasks' in the User Model and it makes a reference to the 'Task' Model. My localField or User Model field of _id and the foreignField of 'owner' from the Task model are equivilent. 
userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

//When response.send is called it uses JSON.stringify on the backend to generate the formating of the text. ToJSON methods will automatically get called as well when things are stringified. So even though we don't specifically call toJSON, it will automatically run due to Stringify. While it is an object this method will remove the password and tokens from displaying. Everything else still shows.
userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar

    return userObject
}

//Methods are instances or for the individual user. Usually called instance methods
//This creates a JWT for the user when they log in
//Middleware found in routers
userSchema.methods.generateAuthToken = async function() {
    const user = this
    const token = jwt.sign({ _id: user._id.toString()}, process.env.JWT_SECRET)
    
    user.tokens = user.tokens.concat({ token: token})
    await user.save()

    return token
}

//Statics are usually called model methods because these methods affect the Schema Model
//This checks both email and password if they match in the database.
//Middleware found in routers
userSchema.statics.findByCredentials = async (email, password) =>{
    const user = await User.findOne({email:email})

    if(!user){
        throw new Error('Unable to login')
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if(!isMatch){
        throw new Error('Unable to login')
    }

    return user
}

//userSchema.pre() - do something to schema before
//userSchema.post() - do something to schema after

//!!!!! IMPORTANT - we must use a written function instead of an arrow function because function() will make use of .this, which arrow functions cannot use.

//Hash the plain text password before saving
userSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})

// Delete user tasks when user is removed
userSchema.pre('remove', async function(next) {
    const user = this
    await Task.deleteMany({ owner: user._id})
    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User