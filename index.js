require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json())
const product = require('./router/product');

app.use('/',product);


app.listen(3000,()=>{
    console.log("Server running on port : 3000");
})