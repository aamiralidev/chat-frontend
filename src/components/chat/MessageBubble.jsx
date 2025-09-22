export default function MessageBubble({ message }) {
  const isOutgoing = message.type === "outgoing";

  return (
    <div
      className={`flex flex-col p-2 rounded-xl text-sm max-w-[95%] sm:max-w-[85%] lg:max-w-[80%] ${isOutgoing
        ? "bg-blue-500 text-white self-end"
        : "bg-gray-200 text-gray-800 self-start"
        }`}
    >
      <p className="break-words">{message.content}</p>

      {/* Timestamp */}
      <span
        className={`text-[10px] mt-1 self-end ${isOutgoing ? "text-blue-100" : "text-gray-500"
          }`}
      >
        {message.timestamp}
      </span>
    </div>
  );
}
