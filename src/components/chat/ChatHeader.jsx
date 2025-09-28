import { Search, MoreVertical, Menu } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggle } from "../../state/sidebarSlice";
import { useEffect } from "react";

// Stable HSL color from any string (same input => same color)
export function stringToColor(str, s = 70, l = 50) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // simple deterministic hash
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // force 32-bit
  }
  const hue = Math.abs(hash) % 360; // 0..359
  return `hsl(${hue}, ${s}%, ${l}%)`;
}

// Two-letter initials (e.g., "John Doe" -> "JD")
export function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2) || "?";
}

export default function ChatHeader() {
  const dispatch = useDispatch();
  const chat = useSelector((state) => state.selectedChat.Current)

if (!chat?.id) {
    return (
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-full cursor-default opacity-50"
            disabled
          >
            <Menu size={20} />
          </button>

          <div className="w-10 h-10 rounded-full bg-gray-200" />

          <div>
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="mt-1 h-3 w-16 bg-gray-200 rounded" />
          </div>
        </div>

        <div className="flex gap-3 opacity-50">
          <button className="p-2 rounded-full cursor-default" disabled>
            <Search size={20} />
          </button>
          <button className="p-2 rounded-full cursor-default" disabled>
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button className="md:hidden p-2 hover:bg-gray-100 rounded-full" onClick={() => dispatch(toggle())}>
          <Menu size={20} />
        </button>

                          {chat.avatar ? (
                            <img
                              src={chat.avatar}
                              alt={chat.title}
                              className="w-10 h-10 rounded-full flex-shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold select-none"
                              style={{ backgroundColor: stringToColor(chat.title) }}
                              aria-label={chat.title}
                              title={chat.title}
                            >
                              {getInitials(chat.title)}
                            </div>
                          )}
        <div>
          <div className="font-semibold text-gray-800">{chat.title}</div>
          <div className="text-xs text-green-500">Online</div>
        </div>
      </div>
      <div className="flex gap-3">
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Search size={20} />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <MoreVertical size={20} />
        </button>
      </div>
    </div>
  );
}
