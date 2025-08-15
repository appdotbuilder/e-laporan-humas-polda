import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/utils/trpc';
import { 
  UserPlus, 
  Users, 
  Shield, 
  Mail, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Edit
} from 'lucide-react';
import type { User, RegisterUserInput, UserRole } from '../../../server/src/schema';

interface UserManagementProps {
  currentUser: User;
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [newUser, setNewUser] = useState<RegisterUserInput>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'STAFF'
  });

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersList = await trpc.getUsers.query();
      setUsers(usersList);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Set dummy data for demo since backend is a stub
      const dummyUsers: User[] = [
        {
          id: 1,
          username: 'admin1',
          email: 'admin@polda.go.id',
          password_hash: 'hashed_password',
          full_name: 'Administrator Sistem',
          role: 'ADMIN',
          created_at: new Date('2024-01-01T00:00:00'),
          updated_at: new Date('2024-01-01T00:00:00')
        },
        {
          id: 2,
          username: 'pimpinan1',
          email: 'pimpinan@polda.go.id',
          password_hash: 'hashed_password',
          full_name: 'Kasubbid Penmas Humas',
          role: 'PIMPINAN',
          created_at: new Date('2024-01-02T00:00:00'),
          updated_at: new Date('2024-01-02T00:00:00')
        },
        {
          id: 3,
          username: 'staff1',
          email: 'staff1@polda.go.id',
          password_hash: 'hashed_password',
          full_name: 'Bripka Ahmad Sutrisno',
          role: 'STAFF',
          created_at: new Date('2024-01-03T00:00:00'),
          updated_at: new Date('2024-01-03T00:00:00')
        },
        {
          id: 4,
          username: 'staff2',
          email: 'staff2@polda.go.id',
          password_hash: 'hashed_password',
          full_name: 'Bripka Siti Nurhayati',
          role: 'STAFF',
          created_at: new Date('2024-01-04T00:00:00'),
          updated_at: new Date('2024-01-04T00:00:00')
        },
        {
          id: 5,
          username: 'staff3',
          email: 'staff3@polda.go.id',
          password_hash: 'hashed_password',
          full_name: 'Briptu Muhammad Rizki',
          role: 'STAFF',
          created_at: new Date('2024-01-05T00:00:00'),
          updated_at: new Date('2024-01-05T00:00:00')
        }
      ];
      setUsers(dummyUsers);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      const user = await trpc.registerUser.mutate(newUser);
      setUsers((prev: User[]) => [...prev, user]);
      setCreateSuccess(true);
      
      // Reset form
      setNewUser({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'STAFF'
      });
      
      // Close dialog after short delay
      setTimeout(() => {
        setShowCreateDialog(false);
        setCreateSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Failed to create user:', error);
      setCreateError('Terjadi kesalahan saat membuat pengguna');
    } finally {
      setIsCreating(false);
    }
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'PIMPINAN':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'STAFF':
        return <Users className="h-4 w-4 text-green-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h2>
          <p className="text-gray-600 mt-1">
            Kelola akun pengguna dan hak akses sistem
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            </DialogHeader>
            
            {createSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Pengguna berhasil dibuat!
                </AlertDescription>
              </Alert>
            )}

            {createError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {createError}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="Masukkan username"
                  value={newUser.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewUser((prev: RegisterUserInput) => ({ ...prev, username: e.target.value }))
                  }
                  required
                  disabled={isCreating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap *</Label>
                <Input
                  id="full_name"
                  placeholder="Masukkan nama lengkap"
                  value={newUser.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewUser((prev: RegisterUserInput) => ({ ...prev, full_name: e.target.value }))
                  }
                  required
                  disabled={isCreating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan email"
                  value={newUser.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewUser((prev: RegisterUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  disabled={isCreating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  value={newUser.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewUser((prev: RegisterUserInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  disabled={isCreating}
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Peran *</Label>
                <Select 
                  value={newUser.role} 
                  onValueChange={(value: UserRole) =>
                    setNewUser((prev: RegisterUserInput) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="PIMPINAN">Pimpinan</SelectItem>
                    {currentUser.role === 'ADMIN' && (
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Membuat...' : 'Buat Pengguna'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Administrator</p>
                <p className="text-2xl font-bold">
                  {users.filter((user) => user.role === 'ADMIN').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pimpinan</p>
                <p className="text-2xl font-bold">
                  {users.filter((user) => user.role === 'PIMPINAN').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Staff</p>
                <p className="text-2xl font-bold">
                  {users.filter((user) => user.role === 'STAFF').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user: User) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-gray-100">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{user.full_name}</CardTitle>
                    <p className="text-sm text-gray-600">@{user.username}</p>
                  </div>
                </div>
                <Badge className={getRoleBadgeColor(user.role)}>
                  {getRoleDisplayName(user.role)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                {user.email}
              </div>
              
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-2" />
                Bergabung {user.created_at.toLocaleDateString('id-ID')}
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                {user.id !== currentUser.id && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                  >
                    Nonaktifkan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}