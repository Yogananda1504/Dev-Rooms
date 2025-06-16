import React, { useRef, useEffect } from 'react';
import { Dropdown } from 'react-bootstrap';

function ContextMenu({ show, msgoptions, top, left, onSelect, onClose, hasSentByMe, messageId, containerRef }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (show && menuRef.current && containerRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      let adjustedTop = top;
      let adjustedLeft = left;

      // Adjust top if menu goes below container
      if (top + menuRect.height > containerRect.bottom) {
        adjustedTop = containerRect.bottom - menuRect.height;
      }

      // Adjust left if menu goes off right edge of container
      if (left + menuRect.width > containerRect.right) {
        adjustedLeft = containerRect.right - menuRect.width;
      }

      // Ensure menu doesn't go above the top of the container
      adjustedTop = Math.max(adjustedTop, containerRect.top);

      menuRef.current.style.top = `${adjustedTop}px`;
      menuRef.current.style.left = `${adjustedLeft}px`;
    }
  }, [show, top, left, containerRef]);

  if (!show) return null;

  const menuItems = msgoptions
    ? [
        { key: 'select', label: 'Select' },
        { key: 'delete', label: 'Delete' },
        ...(hasSentByMe ? [{ key: 'edit', label: 'Edit' }] : []),
        
      ]
    : [
        { key: 'select', label: 'Select' },
        { key: 'selectAll', label: 'Select All' },
        { key: 'deselectAll', label: 'Deselect All' },
        { key: 'clearChat', label: 'Clear Chat' },
        { key: 'Analyze', label: 'MyMood' },
      ];

  return (
    <Dropdown.Menu show style={{ position: 'fixed' }} ref={menuRef}>
      {menuItems.map((item) => (
        <Dropdown.Item key={item.key} onClick={() => onSelect(item.key, messageId)}>
          {item.label}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  );
}

export default ContextMenu;