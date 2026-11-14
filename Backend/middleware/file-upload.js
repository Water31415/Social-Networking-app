const multer =require("multer")
const { randomUUID: uuid } = require('node:crypto')
const path = require('path');
const fs = require('node:fs')

const MIME_TYPE_MAP ={
    'image/png':'png',
    'image/jpeg':'jpeg',
    'image/jpg':'jpg',
}
const fileUpload=multer({
    limits:{fileSize:5 * 1024 * 1024},
    fileFilter:(req,file,cb)=>{
        const isValid=!!MIME_TYPE_MAP[file.mimetype]
        const error = isValid ? null : new Error('Only PNG and JPEG images are allowed')
        if (error) error.status = 400
        cb(error,isValid)
    },
    storage:multer.diskStorage({
        destination:(req,file,cb)=>{
            const directory = path.join(__dirname,'..','uploads','images')
            fs.mkdir(directory, { recursive:true }, error => cb(error, directory))
        },
        filename:(req,file,cb)=>cb(null,uuid()+'.'+MIME_TYPE_MAP[file.mimetype]),
    })
})



module.exports=fileUpload
