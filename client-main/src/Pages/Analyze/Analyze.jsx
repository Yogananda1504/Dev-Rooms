import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Navbar, Container, Nav, Form, FormControl, Button, Card, Row, Col, ListGroup, Overlay, Tooltip } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { ActiveUserContext } from '../../../Context/ActiveUserContext';
import Loading from '../../components/Loading';
import "./Analyze.css";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffa07a', '#fa8072'];

const apiURL = `${import.meta.env.VITE_API_URL}`;

const getEmojiForMood = (mood) => {
    const moodEmojis = {
        joy: '😊', sadness: '😢', anger: '😠', fear: '😨', surprise: '😮',
        disgust: '🤢', trust: '🤝', anticipation: '🤔', love: '❤️',
        optimism: '😃', pessimism: '😒', anxiety: '😰', neutral: '😐',
        mixed: '😕', positive: '😀', negative: '☹️'
    };
    return moodEmojis[mood.toLowerCase()] || '❓';
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-tooltip">
                <p className="label">{`${data.name}`}</p>
                <p className="intro">{`Score: ${data.value.toFixed(2)}`}</p>
                <p className="desc">{`${(data.value * 100).toFixed(2)}%`}</p>
            </div>
        );
    }
    return null;
};

const Analyze = ({ username, room, socket }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [displayedUser, setDisplayedUser] = useState(username);
    const [userData, setUserData] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [displayedSuggestions, setDisplayedSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [notfound, setNotfound] = useState(false);
    const [showNotFoundTooltip, setShowNotFoundTooltip] = useState(false);
    const { activeUsers } = useContext(ActiveUserContext);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const suggestionsRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const targetRef = useRef(null);

    //This is for the nav Bar to show the tooltip
    const handleMouseEnter = () => setShowTooltip(true);
    const handleMouseLeave = () => setShowTooltip(false);

    //This is for the UserNot found Nav 
    const handleNotFoundMouseEnter = () => setShowNotFoundTooltip(true);
    const handleNotFoundMouseLeave = () => setShowNotFoundTooltip(false);

    const handleFetchError = useCallback((error) => {
        if (!error.response) {
            toast.error('Network error. Please check your connection.');
            return;
        }

        const { status, data } = error.response;
        const { message } = data;

        switch (status) {
            case 401:
                navigate('/Unauthorized', { state: { errorMsg: message } });
                break;
            case 403:
                navigate('/Forbidden');
                break;
            case 404:
                setNotfound(true);
                break;
            case 500:
                navigate('/Internal-error', { state: { errorMsg: message } });
                break;
            default:
                toast.error('Failed to fetch data');
                navigate('/error');
        }
    }, [navigate]);

    const fetchUserData = useCallback(async (userToFetch, room) => {
        if (!userToFetch) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setNotfound(false);

        try {
            const response = await axios.get(`${apiURL}/analyze-api/mood?username=${encodeURIComponent(userToFetch)}&room=${encodeURIComponent(room)}`, {
                headers: {},
                withCredentials: true
            });
            if (!response.data) {
                setNotfound(true);
            } else {
                setUserData(response.data);
                setDisplayedUser(userToFetch);
            }
        } catch (err) {
            console.error('Error fetching user mood data:', err);
            handleFetchError(err);
            setUserData(null);
        } finally {
            setIsLoading(false);
        }
    }, [handleFetchError]);

    useEffect(() => {
        fetchUserData(username, room);
    }, [username, room, fetchUserData]);

    useEffect(() => {
        const filteredUsers = activeUsers.filter(user =>
            user.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSuggestions(filteredUsers);
        setDisplayedSuggestions(filteredUsers.slice(0, 5));
    }, [searchTerm, activeUsers]);

    const handleSearch = useCallback((e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            fetchUserData(searchTerm, room);
        }
    }, [searchTerm, room, fetchUserData]);

    const handleSuggestionClick = useCallback((user) => {
        setSearchTerm(user);
        fetchUserData(user, room);
        setSuggestions([]);
        setDisplayedSuggestions([]);
    }, [room, fetchUserData]);

    const handleScroll = useCallback(() => {
        if (suggestionsRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = suggestionsRef.current;
            if (scrollTop + clientHeight === scrollHeight) {
                setDisplayedSuggestions(prevDisplayed => [
                    ...prevDisplayed,
                    ...suggestions.slice(prevDisplayed.length, prevDisplayed.length + 5)
                ]);
            }
        }
    }, [suggestions]);

    const handleFetchFreshData = useCallback(() => {
        fetchUserData(displayedUser, room);
    }, [displayedUser, room, fetchUserData]);

    const renderPieChart = () => {
        if (!userData || !userData.emotionScores) return null;

        const data = Object.entries(userData.emotionScores).map(([name, value]) => ({ name, value }));

        return (
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        );
    };

    return (
        <div className="analyze-container d-flex flex-column vh-100">
            <Navbar bg="dark" variant="dark" expand="lg" className="sticky-top custom-navbar shadow-sm">
                <Container fluid className="d-flex align-items-center justify-content-between py-2">
                    <Navbar.Brand className="me-0 fs-4 d-none d-lg-block">
                        Moods
                        <span
                            ref={targetRef}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <Info size={20} className="ms-2" style={{ cursor: 'pointer' }} />
                        </span>
                        <Overlay target={targetRef.current} show={showTooltip} placement="right">
                            {(props) => (
                                <Tooltip id="info-tooltip" {...props}>
                                    The mood is predicted more accurately as you send the messages
                                </Tooltip>
                            )}
                        </Overlay>
                    </Navbar.Brand>
                    <div className="d-flex flex-column flex-lg-row align-items-center justify-content-center w-100">
                        <Navbar.Brand className="me-0 fs-4 d-lg-none mb-2">Moods</Navbar.Brand>
                        <Form onSubmit={handleSearch} className="d-flex position-relative w-100 mb-2 mb-lg-0 mx-lg-auto search-form" style={{ maxWidth: '500px' }}>
                            <div className="input-group">
                                <FormControl
                                    type="text"
                                    placeholder="Search user..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    disabled={isLoading}
                                    className="search-input rounded-start"
                                />
                                <Button type="submit" variant="warning" disabled={isLoading} className="search-btn">
                                    <Search size={20} />
                                </Button>
                            </div>
                            {displayedSuggestions.length > 0 && (
                                <ListGroup
                                    className="position-absolute w-100 mt-1 shadow-sm suggestion-list"
                                    style={{ top: '100%', maxHeight: '200px', overflowY: 'auto', zIndex: 1000 }}
                                    ref={suggestionsRef}
                                    onScroll={handleScroll}
                                >
                                    {displayedSuggestions.map((user, index) => (
                                        <ListGroup.Item
                                            key={index}
                                            action
                                            onClick={() => handleSuggestionClick(user)}
                                            className="suggestion-item"
                                        >
                                            {user}
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                        </Form>
                        <Button
                            variant="outline-light"
                            onClick={handleFetchFreshData}
                            disabled={isLoading}
                            className="fetch-btn ms-lg-2"
                            style={{ width: "auto", minWidth: "100px" }}
                        >
                            <RefreshCw className="me-2" size={16} /> Fetch
                        </Button>
                    </div>
                </Container>
            </Navbar>
            {isLoading ? (
                <Loading />
            ) : (
                <Container fluid className="flex-grow-1 d-flex flex-column py-4">
                    {notfound && (
                        <Container fluid className="mt-3 mb-3">
                            <h3 className="text-danger text-center position-relative">
                                User not found
                                <span
                                    ref={targetRef}
                                    onMouseEnter={handleNotFoundMouseEnter}
                                    onMouseLeave={handleNotFoundMouseLeave}
                                    className="ms-2"
                                >
                                    <Info size={20} style={{ cursor: 'pointer' }} />
                                </span>
                                <Overlay target={targetRef.current} show={showNotFoundTooltip} placement="right">
                                    {(props) => (
                                        <Tooltip id="notfound-tooltip" {...props}>
                                            The user may have left or might not have entered the Room yet
                                            😭
                                        </Tooltip>
                                    )}
                                </Overlay>
                            </h3>
                        </Container>
                    )}
                    {error && <p className="text-danger text-center">{error}</p>}

                    {!notfound && userData && (
                        <Row className="flex-grow-1">
                            <Col md={6} className="d-flex flex-column mb-4">
                                <Card className="mood-card shadow">
                                    <Card.Body className="d-flex flex-column justify-content-center align-items-center">
                                        <Card.Title className="mb-4">Overall Mood</Card.Title>
                                        <Card.Title className="mb-4">Username: {userData.username}</Card.Title>
                                        <div className="mood-emoji mb-3">{getEmojiForMood(userData.overallMood)}</div>
                                        <h2 className="mood-text mb-3">{userData.overallMood}</h2>
                                        <p className="sentiment-score">Sentiment Score: {userData.sentimentScore.toFixed(2)}</p>
                                        <div className="top-emotions mt-4">
                                            <h3 className="text-lg font-semibold mb-2">Top Emotions:</h3>
                                            <div className="d-flex justify-content-center flex-wrap">
                                                {userData.topEmotions.map((emotion, index) => (
                                                    <div key={index} className="d-flex flex-column align-items-center mx-2 mb-2">
                                                        <span className="emotion-emoji" style={{ fontSize: '2rem' }}>{getEmojiForMood(emotion.emotion)}</span>
                                                        <span className="emotion-label" style={{ fontSize: '0.8rem' }}>{emotion.emotion}</span>
                                                        <span className="emotion-percentage" style={{ fontSize: '0.8rem' }}>
                                                            {(emotion.score * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={6} className="d-flex flex-column mb-4">
                                <Card className="emotion-card shadow">
                                    <Card.Body className="d-flex flex-column">
                                        <Card.Title className="text-center mb-4">Emotion Distribution</Card.Title>
                                        <div className="chart-container">
                                            {renderPieChart()}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}
                </Container>
            )}
        </div>
    );
};

export default Analyze;