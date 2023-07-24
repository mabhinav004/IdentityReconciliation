const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
dotenv.config({path: `.env`})
const identifyService = require('./services/identify')

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const port = process.env.HOST || 8000

app.post("/identify", async (req, res) => {

    const {email, phoneNumber} = req.body

    /*
       Checking empty email and phone number.
     **/
    if (!email && !phoneNumber) {
        res.status(422)
        res.send({
            error: 'Both Email and PhoneNumber Cannot be Empty.'
        })
    }

    const requestData = {email, phoneNumber}

    const responseData = await identifyService.getIdentifyData({requestData})

    res.status(responseData.statusCode).send(responseData.data)
})

app.listen(port, () => {
    console.log(`
        #####################################################
            Started Server ⚡️ On Port Number : ${port}
        ######################################################
        `)
})