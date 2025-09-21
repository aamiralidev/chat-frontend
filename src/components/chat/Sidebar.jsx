import { useDispatch, useSelector } from "react-redux";
import { close } from "../../state/sidebarSlice";
import { setSelectedChat } from "../../state/chatSlice";
import { useRef, useEffect } from "react";
import { conversations } from "../../mock/conversations";

export default function Sidebar() {
  const dispatch = useDispatch();
  const sidebarRef = useRef(null);
  const selectedChatId = useSelector((state) => state.chat.selectedChatId);

  // Close sidebar on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        dispatch(close());
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dispatch]);

  return (
    <div
      ref={sidebarRef}
      className="h-full flex flex-col w-64 sm:w-72 md:w-80 lg:w-96 max-w-full overflow-x-hidden border-r border-gray-200"
    >
      {/* Mobile Close Button */}
      <div className="md:hidden flex justify-end p-2">
        <button
          className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
          onClick={() => dispatch(close())}
        >
          ✕
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search..."
          className="w-full p-2.5 text-sm md:text-base rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
            <div className="text-2xl mb-2">💬</div>
            <div>No conversations yet</div>
            <div className="text-xs text-gray-500 mt-1">
              Start a new chat to see it here
            </div>
          </div>
        ) : (
          conversations.map((chat) => {
            const isSelected = chat.id === selectedChatId;
            return (
              <div
                key={chat.id}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition ${isSelected ? "bg-blue-100" : "hover:bg-gray-100"
                  }`}
                onClick={() => {
                  dispatch(setSelectedChat(chat.id));
                  dispatch(close());
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 text-sm md:text-base truncate">
                      {chat.name}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 truncate">
                      {chat.lastMessage}
                    </div>
                  </div>
                </div>

                {/* Right: Timestamp + Unread Badge */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs md:text-sm text-gray-400 whitespace-nowrap">
                    {chat.time}
                  </span>
                  {chat.unreadCount > 0 && chat.id !== selectedChatId && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
