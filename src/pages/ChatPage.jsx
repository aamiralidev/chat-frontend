import { useSelector } from "react-redux";
import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";

export default function ChatPage() {
  const isSidebarOpen = useSelector((state) => state.sidebar.isOpen);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-20 h-full bg-white border-r border-gray-200 transition-transform transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 md:flex flex-shrink-0`}
      >
        <Sidebar />
      </aside>

      {/* Chat Window */}
      <main className="flex-1 flex flex-col min-w-0">
        <ChatWindow />
      </main>
    </div>
  );
}
