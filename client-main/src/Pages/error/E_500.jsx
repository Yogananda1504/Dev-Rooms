import React from 'react';
import { Button } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useLocation } from 'react-router-dom';
import './E_500.css';
const E_500 = () => {
    const location = useLocation();
    const errorMsg = location.state?.errorMsg || 'Sorry, something went wrong !!!';
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
            <h1 className="error-code">500</h1>
            <p className="error-message">Internal Server Error !!!.</p>
            <Button variant="primary" onClick={GoToHome} className="home-button">Go Back to Home</Button>
            <ToastContainer />
        </div>
    );
};

export default E_500;