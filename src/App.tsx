import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@/lib/theme'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Connectors from '@/pages/Connectors'
import ConnectorNew from '@/pages/ConnectorNew'
import ConnectorDetail from '@/pages/ConnectorDetail'
import Marketplace from '@/pages/Marketplace'
import McpServers from '@/pages/McpServers'
import McpServerDetail from '@/pages/McpServerDetail'
import KnowledgeGraph from '@/pages/KnowledgeGraph'
import KgSkills from '@/pages/KgSkills'
import Analytics from '@/pages/Analytics'
import AuditLog from '@/pages/AuditLog'
import Welcome from '@/pages/Welcome'
import SettingsLayout from '@/pages/settings/SettingsLayout'
import Profile from '@/pages/settings/Profile'
import Organization from '@/pages/settings/Organization'
import Users from '@/pages/settings/Users'
import Roles from '@/pages/settings/Roles'
import License from '@/pages/settings/License'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/logs" element={<AuditLog />} />

          <Route path="/connectors" element={<Connectors />} />
          <Route path="/connectors/new" element={<ConnectorNew />} />
          <Route path="/connectors/store" element={<Marketplace />} />
          <Route path="/connectors/:id" element={<ConnectorDetail />} />

          <Route path="/mcp-servers" element={<McpServers />} />
          <Route path="/mcp-servers/:id" element={<McpServerDetail />} />

          <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
          <Route path="/knowledge-graph/skills" element={<KgSkills />} />

          <Route path="/welcome" element={<Welcome />} />

          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<Profile />} />
            <Route path="organization" element={<Organization />} />
            <Route path="users" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="license" element={<License />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
