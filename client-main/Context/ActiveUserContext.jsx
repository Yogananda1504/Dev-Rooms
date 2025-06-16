import React from "react";

export const ActiveUserContext = React.createContext();
export const ActiveUserProvider = ({children})=>{
    const [activeUsers, setActiveUsers] = React.useState([]);
    return (
        <ActiveUserContext.Provider value={{activeUsers, setActiveUsers}}>
            {children}
        </ActiveUserContext.Provider>
    )
}