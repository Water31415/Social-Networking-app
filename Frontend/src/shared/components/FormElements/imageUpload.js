import React from "react";
import './imageUpload.css'
import Button from "./Button";
const imageUpload = props =>{
    const pickImageHandler=()=>{}
    return (
        <div className="form-control" >
            <input id={props.id} type="file" style={{display:"none"}} accept=".jpg,.jpeg,.png" />
            <div className={`image-upload ${props.center &&'center'}`} ></div>
            <div className="image-upload__preview">
                <img src="" alt="Preview" />
            </div>
            <Button type="button" onClick={pickImageHandler} >PICK IMAGE</Button>
        </div>
    )
}

    

export default imageUpload