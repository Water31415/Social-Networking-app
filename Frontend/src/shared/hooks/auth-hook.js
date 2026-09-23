import {useEffect,useState,useCallback} from 'react'
let logoutTimer
export const CheckAuth=()=>{
     const [userId,setUserId]=useState(false)
  const[tokenExpirationDate,setTokenExpirationDate]=useState()

  const[token,setToken]=useState(false)


const login=useCallback((uid,token,expirationDate)=>{
  setToken(token)
  setUserId(uid)
  const tokenExpiration= expirationDate||new Date(new Date().getTime() + 1000*60*60)
  setTokenExpirationDate(tokenExpiration)
  localStorage.setItem('userData',JSON.stringify({userId:uid , token :token,expirationDate:tokenExpiration.toISOString()}))
},[])

const logout=useCallback(()=>{
  setToken(null)
  setTokenExpirationDate(null)
  setUserId(null)
  localStorage.removeItem('userData')
  console.log("logout");
  
},[])

useEffect(()=>{
  if(token && tokenExpirationDate){
    const remainingTime = tokenExpirationDate.getTime()- new Date().getTime()
    logoutTimer=setTimeout(logout,remainingTime)
  }
  else{
    clearTimeout(logoutTimer)
  }
},[token,logout,tokenExpirationDate])
useEffect(()=>{
  const storedData = JSON.parse(localStorage.getItem('userData'))
  if(storedData && storedData.token && new Date(storedData.expirationDate)> new Date()){
    login(storedData.userId,storedData.token, new Date(storedData.expirationDate))
  }
},[login])

return {token,login,logout,userId}
}