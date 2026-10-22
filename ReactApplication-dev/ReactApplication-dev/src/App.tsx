import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import KnowledgeBase from "./KnowledgeBase";
import ChatCode from "./ChatCode";

const App: React.FC = () => {
  return (
    <Router>
      <div className="bg-gray-50 min-h-screen">
        <nav style={{ display: 'flex', gap: 24, padding: '1.5rem 2rem', background: '#f1f5f9', marginBottom: 32, borderBottom: '1px solid #e5e7eb' }}>
          <Link to="/" style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none', fontSize: 18 }}>Knowledge Base</Link>
          <Link to="/chat" style={{ fontWeight: 600, color: '#7c3aed', textDecoration: 'none', fontSize: 18 }}>Code Chat</Link>
        </nav>
        <Routes>
          <Route path="/" element={<KnowledgeBase />} />
          <Route path="/chat" element={<ChatCode />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
