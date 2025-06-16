import React from 'react';
import { Button } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useLocation } from 'react-router-dom';
import './E_404.css';

const E_404 = () => {
    const location = useLocation();
    const errorMsg = location.state?.errorMsg || 'OOPS !!!';
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
            <h1 className="error-code">404</h1>
            <p className="error-message">Oops! Resource Doesn't Exist !!!.</p>
            <Button variant="primary" onClick={GoToHome} className="home-button">Go Back to Home</Button>
            <ToastContainer />
        </div>
    );
};

export default E_404;