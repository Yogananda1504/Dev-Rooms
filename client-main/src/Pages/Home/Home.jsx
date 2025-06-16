import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate,useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Container, Form, Button } from 'react-bootstrap';
import { SocketContext } from '../../../Context/SocketContext';
import axios from 'axios';
import './Home.css';

const apiUrl = `${import.meta.env.VITE_API_URL}`;

const Home = ({ username, setUsername, room, setRoom, activitystatus, setActivitystatus, leftstatus, setLeftstatus }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const errorMsg = location.state?.errorMsg ;
    const socket = useContext(SocketContext);
    const [isJoining, setIsJoining] = useState(false);
    const [isCustomRoom, setIsCustomRoom] = useState(false);
    const [isJoiningExistingRoom, setIsJoiningExistingRoom] = useState(false);
    const [roomCapacity, setRoomCapacity] = useState('');

    const generateTokenAndJoinRoom = useCallback(async () => {
        try {
            console.log(`Generating token for user ${username} in room ${room}`);
            await axios.post(
                `${apiUrl}/api/generate-token?room=${room}&username=${username}`,
                { roomCapacity },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    withCredentials: true,
                }
            );

            console.log(`Emitting join_room event for user ${username} in room ${room}`);
            socket.emit('join_room', { username, room });
        } catch (error) {
            console.error('Error generating token:', error);
            toast.error(error.response?.data?.message || 'Error generating token');
            setIsJoining(false);
        }
    }, [apiUrl, room, socket, username, roomCapacity]);

    useEffect(() => {
        const handleUsernameTaken = (isTaken) => {
            if (isTaken) {
                console.log(`Username ${username} is already taken in room ${room}`);
                toast.error('Username is already taken');
                setIsJoining(false);
            } else {
                generateTokenAndJoinRoom();
            }
        };

        const handleRoomLocked = () => {
            console.log(`Room ${room} is locked`);
            toast.error('This room is currently locked and cannot be joined.');
            setIsJoining(false);
        };

        const handleRoomFull = ({ message }) => {
            console.log(`Received room_full event for room ${room}:`, message);
            toast.error(message || 'The room is full.');
            setIsJoining(false);
        };

        const handleJoinRoom = () => {
            console.log(`Successfully joined room ${room}`);
            navigate(`/chat/${room}`);
        };

        const handleJoinError = ({ message }) => {
            console.error(`Error joining room ${room}:`, message);
            toast.error(message || 'Error joining room');
            setIsJoining(false);
        };

        socket.on('username_taken', handleUsernameTaken);
        socket.on('room_locked', handleRoomLocked);
        socket.on('room_full', handleRoomFull);
        socket.on('welcome_message', handleJoinRoom);
        socket.on('join_error', handleJoinError);

        return () => {
            socket.off('username_taken', handleUsernameTaken);
            socket.off('room_locked', handleRoomLocked);
            socket.off('room_full', handleRoomFull);
            socket.off('welcome_message', handleJoinRoom);
            socket.off('join_error', handleJoinError);
        };
    }, [socket, generateTokenAndJoinRoom, navigate, room, username]);

    useEffect(() => {
        if (!activitystatus) {
            toast.warn('Logged out due to inactivity. Wait 5s');
            setActivitystatus(true);
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        }
    }, [activitystatus, setActivitystatus]);

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


    useEffect(() => {
        if (leftstatus) {
            setLeftstatus(false);
            window.location.reload();
        }
    }, [leftstatus, setLeftstatus]);

    const joinRoom = async (e) => {
        e.preventDefault();
        if (isJoining) return;

        if (username.trim() === '' || room.trim() === '') {
            toast.error('Please enter both username and room');
            return;
        }

        setIsJoining(true);

        try {
            console.log(`Checking room lock status for room ${room}`);
            const roomLockStatus = await new Promise((resolve) => {
                socket.emit('check_room_lock', room);
                socket.once('room_lock_status', ({ locked }) => resolve(locked));
            });

            if (roomLockStatus) {
                console.log(`Room ${room} is locked`);
                toast.error('This room is currently locked and cannot be joined.');
                setIsJoining(false);
                return;
            }

            if (isCustomRoom) {
                console.log(`Checking if room ${room} exists`);
                const roomExists = await new Promise((resolve) => {
                    socket.emit("check_room_exists", room);
                    socket.once("room_exists", resolve);
                });

                if (isJoiningExistingRoom && !roomExists) {
                    throw new Error('The room does not exist');
                }
                if (!isJoiningExistingRoom && roomExists) {
                    throw new Error('Room already exists');
                }

                if (!isJoiningExistingRoom) {
                    console.log(`Creating new room ${room} with capacity ${roomCapacity}`);
                    socket.emit('create_room', { username, room, roomCapacity });
                    const roomCreationResult = await new Promise((resolve, reject) => {
                        socket.once('room_creation_error', reject);
                        socket.once('room_created', resolve);
                    });
                    console.log('Room creation result:', roomCreationResult);
                }
            }

            console.log(`Checking username availability for ${username} in room ${room}`);
            socket.emit('check_username', { username, room });
        } catch (error) {
            console.error('Error in joinRoom:', error);
            toast.error(error.message || 'Error joining room');
            setIsJoining(false);
        }
    };

    const handleRoomChange = (e) => {
        const selectedRoom = e.target.value;
        if (selectedRoom === 'custom') {
            setIsCustomRoom(true);
            setIsJoiningExistingRoom(false);
            setRoom('');
        } else if (selectedRoom === 'join_existing') {
            setIsCustomRoom(true);
            setIsJoiningExistingRoom(true);
            setRoom('');
        } else {
            setIsCustomRoom(false);
            setIsJoiningExistingRoom(false);
            setRoom(selectedRoom);
        }
    };

    const validateRoomCapacity = (value) => {
        const capacity = parseInt(value, 10);
        if (isNaN(capacity) || capacity < 1 || capacity > 100) {
            toast.error('Room capacity must be between 1 and 100');
            return false;
        }
        return true;
    };

    return (
        <div className="home-container">
            <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
                <h2 className="mb-4 text-white">{'<>'}DevRooms{'</>'}</h2>
                <Form onSubmit={joinRoom} className="w-100 max-w-400 form-container">
                    <h3 className="text-black mb-3">Enter Your Details</h3>
                    <Form.Group controlId="username" className="mb-3">
                        <Form.Label className="text-white">Username</Form.Label>
                        <Form.Control
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="room" className="mb-3">
                        <Form.Label className="text-white">Room</Form.Label>
                        <Form.Select
                            value={isCustomRoom ? (isJoiningExistingRoom ? 'join_existing' : 'custom') : room}
                            onChange={handleRoomChange}
                            required
                        >
                            <option value="" disabled>Select Room</option>
                            <option value="custom">Create Custom Room</option>
                            <option value="join_existing">Join Existing Room</option>
                            <option value="Public 1">Public 1</option>
                            <option value="Public 2">Public 2</option>
                            <option value="Public 3">Public 3</option>
                            <option value="Public 4">Public 4</option>
                        </Form.Select>
                        {isCustomRoom && (
                            <>
                                <Form.Control
                                    type="text"
                                    value={room}
                                    onChange={(e) => setRoom(e.target.value)}
                                    placeholder={isJoiningExistingRoom ? 'Enter existing room name...' : 'Enter new room name...'}
                                    required
                                    className="mt-2"
                                />
                                {!isJoiningExistingRoom && (
                                    <Form.Group controlId="roomCapacity" className="mt-3">
                                        <Form.Label className="text-white">Room Capacity</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={roomCapacity}
                                            onChange={(e) => {
                                                if (validateRoomCapacity(e.target.value)) {
                                                    setRoomCapacity(e.target.value);
                                                }
                                            }}
                                            placeholder="Enter room capacity"
                                            min="1"
                                            max="100"
                                            required
                                        />
                                    </Form.Group>
                                )}
                            </>
                        )}
                    </Form.Group>
                    <Button variant="success" type="submit" disabled={isJoining} className="w-100">
                        {isJoining ? 'Joining...' : 'Join Room'}
                    </Button>
                </Form>
                <ToastContainer />
            </Container>
        </div>
    );
};

export default Home;