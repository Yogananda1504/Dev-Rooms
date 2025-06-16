import React from 'react';
import { Navbar, Container, Button, Form } from 'react-bootstrap';

const style_for_menu = {
  cursor: 'pointer',
  fontSize: '24px',
  color: 'white'
};

const style_for_heading = {
  color: 'white',
  fontSize: '1.2em'
};

const style_for_leave ={
  backgroundColor: 'red',
  color:'black'
}

function NavBar({ roomName, onMenuClick, onLeaveClick, isAdmin, isLocked, onLockToggle }) {
  console.log('NavBar props:', { roomName, isAdmin, isLocked });

  return (
    <Navbar bg="dark" variant="dark">
      <Container>
        <Navbar.Brand>
          <span onClick={onMenuClick} style={style_for_menu}>&#9776;</span>
        </Navbar.Brand>
        {isAdmin && (
          <Form.Check 
            type="switch"
            id="lock-switch"
            label="Lock Room"
            checked={isLocked===true}
            onChange={onLockToggle}
            className="me-3 text-white"
          />
        )}
        <Navbar.Text className="mx-auto" style={style_for_heading}>{roomName}</Navbar.Text>
        <Button variant="outline-light" style ={style_for_leave} onClick={onLeaveClick}>Leave</Button>
      </Container>
    </Navbar>
  );
}

export default NavBar;