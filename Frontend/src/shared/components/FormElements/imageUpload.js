import React,{ useRef,useState,useEffect}from "react";
import './imageUpload.css'
import Button from "./Button";

const ImageUpload = props =>{
    const[file,setFile]= useState([])
    const[previewUrl,setPreviewUrl]=useState()
    const[isValid,setIsValid]=useState(false)
    const filePickerRef = useRef()
    
useEffect(()=>{
    if (!file.length) {
        return
    }
    const urls=[]
    let completed=0
    file.forEach(image=>{
        const fileReader = new FileReader()
        fileReader.onload=()=>{
            urls.push(fileReader.result)
            completed+=1
            if(completed===file.length) setPreviewUrl(urls)
        }
        fileReader.readAsDataURL(image)
    })
},[file])
    
    const pickHandler= event=>{
    let pickedFile
    let fileIsValid = isValid
        if(event.target.files && event.target.files.length >=1){
            const pickedFiles = Array.from(event.target.files)
            fileIsValid = pickedFiles.length <= (props.multiple ? 10 : 1) && pickedFiles.every(file =>
                ['image/jpeg','image/png'].includes(file.type) && file.size <= 5 * 1024 * 1024)
            if (fileIsValid) {
                pickedFile = props.multiple ? pickedFiles : pickedFiles[0]
                setFile(pickedFiles)
                setIsValid(true)
            } else {
                setFile([])
                setPreviewUrl(null)
                setIsValid(false)
            }
        }else{
            setIsValid(false)
            fileIsValid=false
        }
        props.onInput(props.id,pickedFile,fileIsValid)
        
    }
    const pickImageHandler=()=>{
        filePickerRef.current.click()
    }
    return (
        <div className="form-control" >
            <input id={props.id}
            ref={filePickerRef} 
            type="file" 
            style={{display:"none"}}
            accept=".jpg,.jpeg,.png"
            multiple={props.multiple}
             onChange={pickHandler}
             />
            <div className={`image-upload ${props.center &&'center'}`} >
            <div className={`image-upload__preview ${props.multiple ? 'image-upload__preview--multiple' : ''}`}>
                {previewUrl && previewUrl.length>0 && previewUrl.map((url,index)=><img key={url} src={url} alt={`Preview ${index+1}`} />)}
                {!previewUrl && <p>{props.multiple ? 'Pick up to 10 photos' : 'Pick an image'}</p>}
            </div>
            <Button type="button" onClick={pickImageHandler} >PICK IMAGE</Button>
            </div>
            {!isValid && <p>{props.errorText || `Please select ${props.multiple ? '1–10 PNG or JPEG photos' : 'a PNG or JPEG image'} up to 5 MB each.`}</p>}
        </div>
    )
}

    

export default ImageUpload
