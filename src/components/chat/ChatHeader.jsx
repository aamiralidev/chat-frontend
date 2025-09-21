import { Search, MoreVertical, Menu } from "lucide-react";
import { useDispatch } from "react-redux";
import { toggle } from "../../state/sidebarSlice";

export default function ChatHeader() {
  const dispatch = useDispatch();

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button className="md:hidden p-2 hover:bg-gray-100 rounded-full" onClick={() => dispatch(toggle())}>
          <Menu size={20} />
        </button>

        <img
          src="https://i.pravatar.cc/150?img=3"
          alt="Chat Avatar"
          className="w-10 h-10 rounded-full"
        />
        <div>
          <div className="font-semibold text-gray-800">John Doe</div>
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
