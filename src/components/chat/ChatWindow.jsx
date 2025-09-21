import ChatHeader from "./ChatHeader";
import MessagesList from "./MessagesList";
import MessageInput from "./MessageInput";

export default function ChatWindow() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ChatHeader />

      {/* Scrollable messages */}
      <MessagesList />

      {/* Fixed input at bottom */}
      <div className="border-t border-gray-200">
        <MessageInput />
      </div>
    </div>
  );
}
