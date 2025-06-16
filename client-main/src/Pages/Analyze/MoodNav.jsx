import React from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { RefreshCcw, Search } from 'lucide-react';

import 'bootstrap/dist/css/bootstrap.min.css';
import './MoodNav.css'; // Assuming your custom styles are in styles.css

function MoodNav() {
    const handleFetchClick = () => {
        window.location.reload();
    };

    return (
        <Navbar className="navbar-custom" expand="lg">
            <Container>
                <Navbar.Brand href="#home" className="navbar-brand-custom">
                    MoodAnalyzer
                </Navbar.Brand>
                <div className="d-flex justify-content-center flex-grow-1 mx-3 my-2 my-lg-0">
                    <InputGroup className="search-bar">
                        <Form.Control
                            type="text"
                            placeholder="Search"
                            aria-label="Search"
                        />
                        <InputGroup.Text>
                            <Search size={24} />
                        </InputGroup.Text>
                    </InputGroup>
                </div>
                <div className="ms-auto">
                    <Button className="button-custom" onClick={handleFetchClick}>
                        <RefreshCcw size={24} />
                    </Button>
                </div>
            </Container>
        </Navbar>
    );
}

export default MoodNav;
