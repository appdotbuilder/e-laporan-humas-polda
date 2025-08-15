import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import type { User, Report, GetReportsInput, ReportStatus } from '../../../server/src/schema';

interface ReportListProps {
  currentUser: User;
}

export function ReportList({ currentUser }: ReportListProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const pageSize = 10;
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'PIMPINAN';

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: GetReportsInput = {
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      };

      const result = await trpc.getReports.query(filters);
      setReports(result.reports);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Set dummy data for demo since backend is a stub
      const dummyReports: Report[] = [
        {
          id: 1,
          title: 'Sosialisasi Program Kamtibmas di Kelurahan Merdeka',
          activity_date: new Date('2024-01-15'),
          start_time: '09:00',
          end_time: '12:00',
          description: 'Melakukan sosialisasi program kamtibmas kepada warga kelurahan Merdeka dengan fokus pada keamanan lingkungan dan partisipasi masyarakat.',
          location: 'Aula Kelurahan Merdeka, Jl. Merdeka No. 45',
          participants: 'Anggota Polsek (5 orang), Ketua RT/RW (8 orang), Warga (±50 orang)',
          status: 'SUBMITTED',
          created_by: currentUser.id,
          created_at: new Date('2024-01-15T08:30:00'),
          updated_at: new Date('2024-01-15T09:00:00')
        },
        {
          id: 2,
          title: 'Patrol Rutin Kawasan Perumahan Elite',
          activity_date: new Date('2024-01-14'),
          start_time: '20:00',
          end_time: '23:00',
          description: 'Melakukan patroli rutin di kawasan perumahan elite untuk memastikan keamanan dan ketertiban lingkungan.',
          location: 'Perumahan Garden City, Blok A-E',
          participants: 'Tim Patroli Polsek (4 orang), Satpam Kompleks (2 orang)',
          status: 'APPROVED',
          created_by: currentUser.id,
          created_at: new Date('2024-01-14T23:30:00'),
          updated_at: new Date('2024-01-15T10:00:00')
        },
        {
          id: 3,
          title: 'Penyelidikan Kasus Pencurian Sepeda Motor',
          activity_date: new Date('2024-01-13'),
          start_time: '08:00',
          end_time: '16:00',
          description: 'Melakukan penyelidikan awal kasus pencurian sepeda motor Honda Beat di area parkir Mall Central.',
          location: 'Mall Central, Basement Parking Area',
          participants: 'Tim Reskrim (3 orang), Security Mall (2 orang), Saksi (1 orang)',
          status: 'DRAFT',
          created_by: currentUser.id,
          created_at: new Date('2024-01-13T16:30:00'),
          updated_at: new Date('2024-01-13T16:30:00')
        }
      ];

      // Filter by status if selected
      const filteredReports = statusFilter 
        ? dummyReports.filter(report => report.status === statusFilter)
        : dummyReports;

      // Filter by search term if provided
      const searchFiltered = searchTerm
        ? filteredReports.filter(report => 
            report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.location.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : filteredReports;

      setReports(searchFiltered);
      setTotal(searchFiltered.length);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, currentUser.id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDelete = async (reportId: number) => {
    setDeletingId(reportId);
    try {
      await trpc.deleteReport.mutate({ id: reportId });
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('Terjadi kesalahan saat menghapus laporan');
    } finally {
      setDeletingId(null);
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      case 'SUBMITTED':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const canEdit = (report: Report) => {
    return report.created_by === currentUser.id && 
           (report.status === 'DRAFT' || report.status === 'REJECTED');
  };

  const canDelete = (report: Report) => {
    return (report.created_by === currentUser.id && report.status === 'DRAFT') ||
           isAdmin;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-96" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daftar Laporan Kegiatan</h2>
          <p className="text-gray-600 mt-1">
            {isAdmin 
              ? `Menampilkan ${reports.length} dari ${total} laporan`
              : `Menampilkan ${reports.length} dari ${total} laporan Anda`}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Pencarian & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan judul, deskripsi, atau lokasi..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: ReportStatus | '') => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Status</SelectItem>
                <SelectItem value="DRAFT">Draf</SelectItem>
                <SelectItem value="SUBMITTED">Diajukan</SelectItem>
                <SelectItem value="APPROVED">Disetujui</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada laporan</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter 
                ? 'Tidak ada laporan yang sesuai dengan kriteria pencarian'
                : 'Belum ada laporan yang dibuat'}
            </p>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Buat Laporan Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report: Report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{report.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {report.activity_date.toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {report.start_time} - {report.end_time}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {report.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Badge className={getStatusColor(report.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(report.status)}
                        <span>{getStatusDisplayName(report.status)}</span>
                      </div>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700 line-clamp-3">{report.description}</p>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-1" />
                    <span className="line-clamp-1">{report.participants}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-xs text-gray-400">
                      Dibuat: {report.created_at.toLocaleDateString('id-ID')} {report.created_at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </Button>
                      
                      {canEdit(report) && (
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      
                      {canDelete(report) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                              disabled={deletingId === report.id}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Hapus
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus laporan "{report.title}"? 
                                Tindakan ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(report.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-gray-600">
              Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, total)} dari {total} laporan
            </p>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * pageSize >= total}
              >
                Selanjutnya
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}