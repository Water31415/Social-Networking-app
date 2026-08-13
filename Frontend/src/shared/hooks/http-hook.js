import {useEffect,useState,useCallback,useRef} from 'react'

export const useHttpClient = ()=>{
    const [isLoading,setIsLoading]=useState(false)
    const [error,setError]=useState()

    const activeHttpRequest=useRef([])

    const sendRequest =useCallback(async(url , method = 'GET', body = null,headers={})=>{
        setIsLoading(true)
        const httpAbortCtrl = new AbortController()
        activeHttpRequest.current.push(httpAbortCtrl)
        try {
            
            const response = await fetch(url,{
                method :method,
                body :body,
                headers:headers,
                signal : httpAbortCtrl.signal
            })
             const responseData = await response.json()
             activeHttpRequest.current= activeHttpRequest.current.filter(reqCtrl=>reqCtrl !==httpAbortCtrl)
                        if (!response.ok) {
                            throw new Error(responseData.message)
                        }
                        setIsLoading(false)
                        return responseData
                        
        } catch (error) {
            setError(error.message)
            setIsLoading(false)
            throw error
        }
        
    },[])
    const clearError=()=>{
        setError(null)
    }
    useEffect(()=>{
        return ()=>{
            activeHttpRequest.current.forEach(abortCtrl => abortCtrl.abort());
        }
    },[])
    return{isLoading:isLoading,error:error,sendRequest,clearError}
}