const mongoose = require('mongoose');


const companySchema = new mongoose.Schema({
    name: { type: String  ,trim: true,},
    logo: { type: String ,trim: true,},  
    termsAndCondition: { type: String , trim: true,},
    privacyPolicy: { type: String , trim: true,},
    supportEmail: { type: String  , trim: true,},
    aboutUs: { type: String , trim: true,},
    contactNumber: { type: String , trim: true,},
    helpAndSupport: { type: String , trim: true,},
    address: { type: String , trim: true,},
    favIcon: { type: String , trim: true,},
    loader:{type:String , trim:true}
     
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
