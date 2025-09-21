import { Send, Paperclip, Smile } from "lucide-react";

export default function MessageInput() {
  return (
    <div className="p-3 border-t border-gray-200 flex items-center gap-3">
      <button className="p-2 hover:bg-gray-100 rounded-full">
        <Paperclip size={20} />
      </button>
      <input
        type="text"
        placeholder="Type a message..."
        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button className="p-2 hover:bg-gray-100 rounded-full">
        <Smile size={20} />
      </button>
      <button className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600">
        <Send size={20} />
      </button>
    </div>
  );
}
