import React, { useState, useEffect, useCallback } from 'react';
import { Offcanvas, Form, ListGroup, Button } from 'react-bootstrap';
import { Ban } from 'lucide-react';
import './SideDrawer.css';
import { socket } from '../../Context/SocketContext';

function SideDrawer({ show, onHide, users, isAdmin,username ,room}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastPong, setLastPong] = useState(null);

    const filteredUsers = users.filter((user) => {
        const username = user.username;
        return username.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const connectionStatus = isConnected && isOnline ? '🟢' : '🔴';
    const statusColor = isConnected && isOnline ? '#4CAF50' : '#f44336';

    const CONNECTION_CHECK_INTERVAL = 5000;

    const updateConnectionStatus = useCallback((socketStatus) => {
        setIsConnected(socketStatus);
        if (socketStatus) {
            setLastPong(new Date().toISOString());
        }
    }, []);

    useEffect(() => {
        function onConnect() {
            console.log("Connected");
            updateConnectionStatus(true);
        }

        function onDisconnect() {
            console.log("Disconnected");
            updateConnectionStatus(false);
        }

        function checkConnection() {
            updateConnectionStatus(socket.connected);
        }

        function updateOnlineStatus() {
            setIsOnline(navigator.onLine);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        const interval = setInterval(checkConnection, CONNECTION_CHECK_INTERVAL);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
            clearInterval(interval);
        };
    }, [updateConnectionStatus]);

    const handleMakeAdmin = (username) => {
        socket.emit('make_admin', { username, room });
    };

    const handleBanUser = (username) => {
        socket.emit('remove_user_by_admin', { username, room });
    };

    return (
        <Offcanvas show={show} onHide={onHide} placement="start">
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>
                    Users || Connection: {' '}
                    <span style={{ color: statusColor, fontWeight: 'bold' }}>
                        {connectionStatus}
                    </span>
                </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body className="d-flex flex-column p-0">
                <Form className="p-3" onSubmit={(e) => { e.preventDefault() }}>
                    <Form.Group>
                        <Form.Control
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onSubmit={(e) => e.preventDefault()}
                        />
                    </Form.Group>
                </Form>
                <ListGroup className="flex-grow-1 overflow-auto">
                    {filteredUsers.map((user, index) => (
                        <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                            <div>
                                {user.username}
                            </div>
                            <div>
                                {isAdmin && user.username !== username && (
                                    <>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleMakeAdmin(user.username)}>
                                            Make Admin
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            className="ms-2"
                                            onClick={() => handleBanUser(user.username)}>
                                            <Ban size={16} />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            </Offcanvas.Body>
        </Offcanvas>
    );
}

export default SideDrawer;
