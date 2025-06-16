import React, { useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './E_401.css';

function E_401() {
    const navigate = useNavigate();
    const location = useLocation();
    const errorMsg = location.state?.errorMsg || 'Unauthorized access';

    useEffect(() => {
        // Display toast message when component mounts
        toast.error(errorMsg, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
        });
    }, [errorMsg]);

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className='Error_401_container'>
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={6} className="text-center">
                    <h1>401 - Unauthorized</h1>
                    <p>{errorMsg}</p>
                    <Button onClick={handleGoHome} variant="primary">Go to Home</Button>
                </Col>
            </Row>
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </Container>
        </div>
    );
}

export default E_401;