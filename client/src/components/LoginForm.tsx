import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export function LoginForm({ onLogin, isLoading }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(username, password);
  };

  const handleDemoLogin = (role: 'STAFF' | 'PIMPINAN' | 'ADMIN') => {
    // Demo accounts for testing
    const demoAccounts = {
      STAFF: { username: 'staff1', password: 'password123' },
      PIMPINAN: { username: 'pimpinan1', password: 'password123' },
      ADMIN: { username: 'admin1', password: 'password123' }
    };
    
    const account = demoAccounts[role];
    setUsername(account.username);
    setPassword(account.password);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="Masukkan username"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Masukkan password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <div className="text-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDemo(!showDemo)}
          className="text-xs"
        >
          {showDemo ? 'Sembunyikan' : 'Demo Akun'}
        </Button>
      </div>

      {showDemo && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-2 mb-3">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Akun Demo</p>
                <p className="text-xs text-blue-700">Klik untuk menggunakan akun demo</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleDemoLogin('STAFF')}
                disabled={isLoading}
              >
                <span className="inline-block w-16 text-left font-medium">Staff:</span>
                <span className="text-gray-600">staff1 / password123</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleDemoLogin('PIMPINAN')}
                disabled={isLoading}
              >
                <span className="inline-block w-16 text-left font-medium">Pimpinan:</span>
                <span className="text-gray-600">pimpinan1 / password123</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleDemoLogin('ADMIN')}
                disabled={isLoading}
              >
                <span className="inline-block w-16 text-left font-medium">Admin:</span>
                <span className="text-gray-600">admin1 / password123</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}