import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trpc } from '@/utils/trpc';
import { 
  CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  FileText, 
  Save, 
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { User, CreateReportInput } from '../../../server/src/schema';

interface CreateReportFormProps {
  currentUser: User;
}

export function CreateReportForm({ currentUser }: CreateReportFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<CreateReportInput, 'activity_date'> & { activity_date: Date | undefined }>({
    title: '',
    activity_date: undefined,
    start_time: '',
    end_time: '',
    description: '',
    location: '',
    participants: '',
    status: 'DRAFT'
  });

  const handleSubmit = async (e: React.FormEvent, submitStatus: 'DRAFT' | 'SUBMITTED') => {
    e.preventDefault();
    
    if (!formData.activity_date) {
      setError('Tanggal kegiatan harus dipilih');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const submitData: CreateReportInput = {
        ...formData,
        activity_date: formData.activity_date!,
        status: submitStatus
      };

      await trpc.createReport.mutate(submitData);
      setSuccess(true);
      
      // Reset form
      setFormData({
        title: '',
        activity_date: undefined,
        start_time: '',
        end_time: '',
        description: '',
        location: '',
        participants: '',
        status: 'DRAFT'
      });

    } catch (error) {
      console.error('Failed to create report:', error);
      setError('Terjadi kesalahan saat menyimpan laporan');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return formData.title.trim() && 
           formData.activity_date && 
           formData.start_time && 
           formData.end_time && 
           formData.description.trim() && 
           formData.location.trim() && 
           formData.participants.trim();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Buat Laporan Kegiatan Harian</h2>
        <p className="text-gray-600 mt-1">
          Buat laporan kegiatan harian Anda dengan lengkap dan detail
        </p>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Laporan berhasil disimpan! Anda dapat melihatnya di halaman Laporan.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Informasi Dasar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Judul/Subjek Kegiatan *</Label>
              <Input
                id="title"
                placeholder="Contoh: Sosialisasi Program Kamtibmas di Kelurahan ABC"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>

            {/* Activity Date */}
            <div className="space-y-2">
              <Label>Tanggal Kegiatan *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.activity_date ? (
                      format(formData.activity_date, "PPP", { locale: localeId })
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.activity_date}
                    onSelect={(date: Date | undefined) =>
                      setFormData((prev) => ({ ...prev, activity_date: date }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Waktu Mulai *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="start_time"
                    type="time"
                    className="pl-10"
                    value={formData.start_time}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, start_time: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Waktu Selesai *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="end_time"
                    type="time"
                    className="pl-10"
                    value={formData.end_time}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, end_time: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi Kegiatan *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  placeholder="Contoh: Aula Kelurahan ABC, Jl. Merdeka No. 123"
                  className="pl-10"
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <Label htmlFor="participants">Pihak Terlibat/Partisipan *</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="participants"
                  placeholder="Contoh: Anggota Polsek ABC (5 orang), Ketua RT 01 (1 orang), Warga setempat (±30 orang)"
                  className="pl-10 min-h-[80px]"
                  value={formData.participants}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev) => ({ ...prev, participants: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deskripsi Kegiatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi Lengkap *</Label>
              <Textarea
                id="description"
                placeholder="Jelaskan secara detail kegiatan yang dilakukan, tujuan, hasil yang dicapai, dan hal-hal penting lainnya..."
                className="min-h-[120px]"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                required
              />
              <p className="text-sm text-gray-500">
                Minimal 50 karakter. Semakin detail, semakin baik untuk evaluasi dan dokumentasi.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={(e) => handleSubmit(e, 'DRAFT')}
                disabled={isLoading || !formData.title.trim()}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Simpan sebagai Draf
              </Button>
              
              <Button 
                type="button"
                onClick={(e) => handleSubmit(e, 'SUBMITTED')}
                disabled={isLoading || !isFormValid()}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Ajukan untuk Persetujuan
              </Button>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Status Laporan:</h4>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <Badge variant="secondary" className="mr-2">DRAF</Badge>
                  <span className="text-gray-600">Laporan dapat diedit</span>
                </div>
                <div className="flex items-center">
                  <Badge className="bg-yellow-100 text-yellow-800 mr-2">DIAJUKAN</Badge>
                  <span className="text-gray-600">Menunggu persetujuan pimpinan</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}