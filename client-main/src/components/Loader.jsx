import React from 'react';
import { Container, Row, Col, Spinner } from 'react-bootstrap';

const Loader = () => {
  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="bg-white rounded-3 shadow-lg p-4 m-2">
        <Col xs={12} className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '4rem', height: '4rem' }} className="mb-4" />
          <h2 className="mb-3">Loading...</h2>
          <p className="text-muted">
            Please wait while we prepare your amazing content!
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default Loader;