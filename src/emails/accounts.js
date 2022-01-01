const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

//Sends an email for signing up
const sendWelcomeEmail = (email, name) =>{
    
    sgMail.send({
    to: email,
    from: 'cyipprogram@gmail.com',
    subject: 'Welcome to my Task Application',
    text: `Thanks for registering for my Task Application ${name}. Feel free to let me know about your thoughts of this application.` 
    })
}
//Sends an email for deleting account
const sendGoodbyeEmail = (email,name) => {
    sgMail.send({
        to: email,
        from: 'cyipprogram@gmail.com',
        subject: 'Thanks for using my Task Application',
        text: `Sorry that things did not work out for you ${name}. Please feedback on how we can improve.`
        })
}

module.exports = {
    sendWelcomeEmail,
    sendGoodbyeEmail
}