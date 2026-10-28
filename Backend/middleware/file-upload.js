const multer =require("multer")
const { v4: uuid } = require('uuid')
const path = require('path');

const MIME_TYPE_MAP ={
    'image/png':'png',
    'image/jpeg':'jpeg',
    'image/jpg':'jpg',
}
const fileUpload=multer({
    limits:{fileSize:5000000},
    fileFilter:(req,file,cb)=>{
        const isValid=!!MIME_TYPE_MAP[file.mimetype]
        const error = isValid ? null : new Error('Only PNG and JPEG images are allowed')
        if (error) error.status = 400
        cb(error,isValid)
    },
    storage:multer.diskStorage({
        destination:(req,file,cb)=>{
            cb(null,path.join(__dirname,'..','uploads','images'))
        },
        filename:(req,file,cb)=>cb(null,uuid()+'.'+MIME_TYPE_MAP[file.mimetype]),
    })
})



module.exports=fileUpload
