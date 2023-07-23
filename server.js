const express = require('express')
const app = express()
const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const port = 8000

app.post("/identify", async (req, res) => {

    res.status(200)
    res.send({})

})

app.listen(port, () => {
    console.log(`
        #####################################################
            Started Server ⚡️ On Port Number : ${port}
        ######################################################
        `)
})