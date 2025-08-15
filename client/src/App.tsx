import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';
import { ReportList } from '@/components/ReportList';
import { CreateReportForm } from '@/components/CreateReportForm';
import { UserManagement } from '@/components/UserManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, FileText, Users, BarChart3, LogOut, Shield } from 'lucide-react';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is logged in (stub implementation)
  useEffect(() => {
    // TODO: Replace with actual authentication check
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await trpc.loginUser.mutate({ username, password });
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setActiveTab('dashboard');
      } else {
        // Login failed
        alert('Username atau password salah');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setActiveTab('dashboard');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'PIMPINAN':
        return 'bg-blue-100 text-blue-800';
      case 'STAFF':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'PIMPINAN':
        return 'Pimpinan';
      case 'STAFF':
        return 'Staff';
      default:
        return role;
    }
  };

  // If not logged in, show login form
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <Shield className="h-12 w-12 text-blue-600 mr-2" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">E-Laporan Kegiatan</h1>
                <p className="text-sm text-gray-600">Subbid Penmas Humas Polda</p>
              </div>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Login ke Sistem</CardTitle>
            </CardHeader>
            <CardContent>
              <LoginForm onLogin={handleLogin} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'PIMPINAN';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">E-Laporan Kegiatan Harian</h1>
                <p className="text-sm text-gray-600">Subbid Penmas Humas Polda</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
                <div className="flex items-center space-x-2">
                  <Badge className={getRoleBadgeColor(currentUser.role)}>
                    {getRoleDisplayName(currentUser.role)}
                  </Badge>
                  <p className="text-xs text-gray-500">{currentUser.username}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Laporan</span>
            </TabsTrigger>
            <TabsTrigger value="create-report" className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>Buat Laporan</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Pengguna</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard">
              <Dashboard currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="reports">
              <ReportList currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="create-report">
              <CreateReportForm currentUser={currentUser} />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="users">
                <UserManagement currentUser={currentUser} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </main>
    </div>
  );
}

export default App;