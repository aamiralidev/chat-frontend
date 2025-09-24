import React, { useState } from "react";
import { Send, Paperclip, Smile } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { sendMessage } from "../../state/messagesSlice";

export default function MessageInput() {
  const dispatch = useDispatch();
  const [text, setText] = useState("");
  const chatId = useSelector((state) => state.chat.selectedChatId);
  const currentUser = useSelector((state) => state.auth.currentUser);

  const handleSend = async () => {
    console.log("Starting message send")
    if (!text.trim()) return; // prevent sending empty messages

    const message = {
      local_id: uuidv4(),
      server_id: null,
      chat_id: chatId,
      sender_id: currentUser.id, // later replace with auth user ID
      content: text,
      timestamp: Date.now(),
      status: "pending", // pending | sent | delivered | read
    };

    // 1. Update Redux immediately for instant UI feedback
    dispatch(sendMessage({ chatId, message }));

    // 3. Clear the input
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-gray-200 flex items-center gap-3">
      {/* Attach file button */}
      <button className="p-2 hover:bg-gray-100 rounded-full">
        <Paperclip size={20} />
      </button>

      {/* Message input field */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Emoji button */}
      <button className="p-2 hover:bg-gray-100 rounded-full">
        <Smile size={20} />
      </button>

      {/* Send button */}
      <button
        onClick={handleSend}
        className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
      >
        <Send size={20} />
      </button>
    </div>
  );
}
