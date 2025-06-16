import React, { useState, useMemo } from 'react';
import { Form } from 'react-bootstrap';
import { ChevronDown } from 'lucide-react';

const Message = ({
  username,
  message,
  isSelectable,
  isSelected,
  onSelect,
  onMessageOptions,
  onReply,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isOwnMessage = message.username === username;
  const messageClass = isOwnMessage ? 'message-self' : 'message-other';

  const style_for_edited = {
    fontSize: '0.8em',
    color: 'darkolivegreen',
  };

  const messageStyle = {
    backgroundColor: "#d9fdd3",
    color: "black",
    position: 'relative',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    maxWidth: '80%',
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formattedTimestamp = useMemo(() => {
    const timestamp = message.createdAt || Date.now();
    return formatTimestamp(timestamp);
  }, [message.createdAt]);

  const renderMessageContent = () => {
    if (message.deletedForEveryone) {
      return message.deletedBy === username
        ? "You deleted this message"
        : `${message.deletedBy} deleted this message for everyone`;
    }

    return (
      <>
        <div>{message.message}</div>
        <div className="message-metadata">
          {message?.edited && (
            <span className="message-edited" style={style_for_edited}>
              (edited)
            </span>
          )}
          <span className="message-timestamp" style={style_for_edited}>
            {formattedTimestamp}
          </span>
        </div>
      </>
    );
  };

  const renderUsername = () => {
    if (message.username === username) {
      return "You";
    }
    return message.username;
  };

  const handleOptionsClick = (e) => {
    e.stopPropagation();
    onMessageOptions(e, message._id, isOwnMessage);
  };

  const handleReplyClick = (e) => {
    e.stopPropagation();
    onReply(message);
  };

  return (
    <div
      className={`message ${messageClass}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="message-username">{renderUsername()}</div>
      <div className="message-bubble" style={messageStyle}>
        {isSelectable && (
          <Form.Check
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(message._id)}
            className={`message-checkbox ${isOwnMessage ? 'align-self-end' : 'align-self-start'}`}
          />
        )}
        {renderMessageContent()}
        {isHovered && (
          <div
            className="message-options"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              cursor: 'pointer'
            }}
          >
            <div onClick={handleOptionsClick}>
              <ChevronDown size={16} color="#666" />
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Message;