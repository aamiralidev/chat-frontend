import { useRef, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import MessageBubble from "./MessageBubble";
// import { messages } from "../../mock/messages";
import { loadMessagesFromDB } from '../../state/messagesSlice';


export default function MessagesList() {
  const containerRef = useRef(null);
  const selectedChatId = useSelector((state) => state.chat.selectedChatId);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messages = useSelector(state => state.messages.entities[selectedChatId] || []);
  const dispatch = useDispatch()

  const filteredMessages = messages;

  useEffect(() => {
    dispatch(loadMessagesFromDB(selectedChatId));
  }, [selectedChatId, dispatch]);

  useEffect(() => {
    console.log(filteredMessages)
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredMessages]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollButton(!(scrollHeight - scrollTop <= clientHeight + 50));
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
      >
        {selectedChatId === null ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
            <div className="text-2xl mb-2">💬</div>
            <div>Select a conversation to start chatting</div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
            <div className="text-2xl mb-2">📝</div>
            <div>No messages yet in this chat</div>
          </div>
        ) : (
          filteredMessages.map((msg) => <MessageBubble key={msg.local_id} message={msg} />)
        )}
      </div>

      {showScrollButton && filteredMessages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gray-200 text-gray-700 rounded-full shadow-md flex items-center justify-center hover:bg-gray-300 transition"
          aria-label="Scroll to latest message"
        >
          ↓
        </button>
      )}
    </div>
  );
}
