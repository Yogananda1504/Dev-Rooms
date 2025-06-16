import React from 'react';
import { Modal, Button } from 'react-bootstrap';
// Import css for the bootstrap
import 'bootstrap/dist/css/bootstrap.min.css';

function InactivityPopup({ show, onStayActive, onLogout }) {
  return (
    <Modal show={show} centered>
      <Modal.Header>
        <Modal.Title>Inactivity Alert</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        You will be automatically logged out in 1 minute due to inactivity. 
        Would you like to stay active or log out?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onLogout}>
          Logout
        </Button>
        <Button variant="primary" onClick={onStayActive}>
          Stay Active
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default InactivityPopup;