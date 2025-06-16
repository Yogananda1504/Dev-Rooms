import React from 'react';
import { Button } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import './E_403.css';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useLocation } from 'react-router-dom';

const E_403 = () => {
    const location = useLocation();
    const errorMsg = location.state?.errorMsg || 'Forbidden access !!!';
    const navigate = useNavigate();

    React.useEffect(() => {
        if (errorMsg) {
            toast.error(errorMsg);
        }
    }, [errorMsg]);

    const GoToHome = () => {
        navigate('/');
    };

    

    return (
        <div className="error-page-container">
            <h1 className="error-code">403</h1>
            <p className="error-message">Oops! You don't have permission to access this page.</p>
            <Button variant="primary" onClick={GoToHome} className="home-button">Go Back to Home</Button>
            
            <ToastContainer />
        </div>
    );
};

export default E_403;