import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';

interface Device {
  telefon: string;
  ekleme_tarihi: string;
}

const OrganizerDevices: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/organizer/devices`);
      setDevices(response.data.devices);
      setLoading(false);
    } catch (error) {
      toast.error('Cihazlar yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      telefon: ''
    },
    validationSchema: Yup.object({
      telefon: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, 'Geçerli bir telefon numarası giriniz')
        .required('Telefon numarası zorunludur')
    }),
    onSubmit: async values => {
      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/organizer/device`, {
          telefon: values.telefon
        });
        toast.success('Cihaz eklendi');
        formik.resetForm();
        fetchDevices();
      } catch (error) {
        toast.error('Cihaz eklenirken bir hata oluştu');
      }
    }
  });

  const handleDelete = async (telefon: string) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/organizer/device/${telefon}`);
      toast.success('Cihaz silindi');
      fetchDevices();
    } catch (error) {
      toast.error('Cihaz silinirken bir hata oluştu');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Cihaz Yönetimi</h1>

      {/* Add Device Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Yeni Cihaz Ekle</h2>
        <form onSubmit={formik.handleSubmit} className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="telefon" className="block text-sm font-medium text-gray-700">
              Telefon Numarası
            </label>
            <input
              type="tel"
              id="telefon"
              {...formik.getFieldProps('telefon')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.telefon && formik.errors.telefon
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
              placeholder="+905551234567"
            />
            {formik.touched.telefon && formik.errors.telefon && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.telefon}</p>
            )}
          </div>
          <button
            type="submit"
            className="mt-7 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Ekle
          </button>
        </form>
      </div>

      {/* Device List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Kayıtlı Cihazlar</h2>
        </div>

        {devices.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Henüz kayıtlı cihaz yok</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefon Numarası
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eklenme Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map(device => (
                  <tr key={device.telefon}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {device.telefon}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(device.ekleme_tarihi)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(device.telefon)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Bilgi</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Kayıtlı cihazlar etkinliklerde QR kod okutarak giriş kontrolü yapabilir. Her cihaz için
                ayrı bir telefon numarası gereklidir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDevices; 