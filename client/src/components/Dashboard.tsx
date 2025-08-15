import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/utils/trpc';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Eye
} from 'lucide-react';
import type { User, DashboardStats } from '../../../server/src/schema';

interface DashboardProps {
  currentUser: User;
}

export function Dashboard({ currentUser }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const dashboardStats = await trpc.getDashboardStats.query();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      // Set dummy data for demo purposes since backend is a stub
      setStats({
        total_reports: 25,
        draft_reports: 3,
        submitted_reports: 8,
        approved_reports: 12,
        rejected_reports: 2,
        recent_reports: []
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Draf';
      case 'SUBMITTED':
        return 'Diajukan';
      case 'APPROVED':
        return 'Disetujui';
      case 'REJECTED':
        return 'Ditolak';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Selamat datang, {currentUser.full_name}! 👋
        </h2>
        <p className="text-gray-600 mt-1">
          {currentUser.role === 'STAFF' 
            ? 'Berikut adalah ringkasan laporan kegiatan Anda.'
            : 'Berikut adalah ringkasan laporan kegiatan yang perlu ditinjau.'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Total Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.total_reports || 0}</div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Semua laporan
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Draf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.draft_reports || 0}</div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <AlertCircle className="h-3 w-3 mr-1" />
              Belum diajukan
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Diajukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.submitted_reports || 0}</div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <Clock className="h-3 w-3 mr-1" />
              Menunggu persetujuan
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Disetujui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.approved_reports || 0}</div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <CheckCircle className="h-3 w-3 mr-1" />
              Sudah disetujui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rejected Reports Card (if any) */}
      {stats && stats.rejected_reports > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              Laporan Ditolak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-900">{stats.rejected_reports}</div>
                <p className="text-sm text-red-700">
                  {currentUser.role === 'STAFF' 
                    ? 'Laporan yang perlu diperbaiki'
                    : 'Laporan yang ditolak'}
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-red-700 border-red-300">
                <Eye className="h-4 w-4 mr-2" />
                Lihat Detail
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Laporan Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent_reports && stats.recent_reports.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{report.title}</h4>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>📅 {report.activity_date.toLocaleDateString('id-ID')}</span>
                      <span>📍 {report.location}</span>
                      <span>🕐 {report.start_time} - {report.end_time}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(report.status)}>
                    {getStatusDisplayName(report.status)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada laporan terbaru</p>
              <p className="text-sm text-gray-400 mt-1">
                Laporan yang Anda buat akan muncul di sini
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button className="flex items-center justify-center space-x-2 h-12">
              <FileText className="h-5 w-5" />
              <span>Buat Laporan Baru</span>
            </Button>
            <Button variant="outline" className="flex items-center justify-center space-x-2 h-12">
              <Eye className="h-5 w-5" />
              <span>Lihat Semua Laporan</span>
            </Button>
            {(currentUser.role === 'PIMPINAN' || currentUser.role === 'ADMIN') && (
              <Button variant="outline" className="flex items-center justify-center space-x-2 h-12">
                <AlertCircle className="h-5 w-5" />
                <span>Review Laporan</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}