const mongoose = require('mongoose')


const faciltiesSchema  = new mongoose.Schema({

    bedrooms :{
type:Number,
default :null
    },
    bathrooms:{
        type:Number,
        default :null
    }
})


const FacilitiesModel = mongoose.model('facilties'  , faciltiesSchema )
module.exports = FacilitiesModel