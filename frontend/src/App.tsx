import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { User } from "@/types";
import { api } from "@/services/api";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import MenuCreator from "@/pages/MenuCreator";
import PublicMenu from "@/pages/PublicMenu";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("drovenfy_user");
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed.plan) parsed.plan = { type: "basic" };
    return parsed;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("drovenfy_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("drovenfy_user");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.auth.me(user.id).then(res => {
      setUser(prev => {
        if (!prev) return null;
        if (JSON.stringify(prev) !== JSON.stringify(res.user)) return res.user;
        return prev;
      });
    }).catch(() => {});
  }, []);

  const handleLogout = () => setUser(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Profile user={user} onLogout={handleLogout} onUserUpdate={setUser} /> : <Navigate to="/login" />} />
        <Route path="/creator" element={user ? <MenuCreator user={user} /> : <Navigate to="/login" />} />
        <Route path="/creator/:id" element={user ? <MenuCreator user={user} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/m/:slug" element={<PublicMenu />} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}
