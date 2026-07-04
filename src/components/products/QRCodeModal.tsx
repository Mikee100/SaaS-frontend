import { FaTimes, FaPrint } from 'react-icons/fa';
import Image from 'next/image';
import { ProductsPageProps } from './types';

interface QRCodeModalProps {
  qrCodeProductId: ProductsPageProps['qrCodeProductId'];
  setQrCodeProductId: ProductsPageProps['setQrCodeProductId'];
}

export default function QRCodeModal({ qrCodeProductId, setQrCodeProductId }: QRCodeModalProps) {
  if (!qrCodeProductId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setQrCodeProductId(null)}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Product QR Code</h3>
          <button
            onClick={() => setQrCodeProductId(null)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          <Image
          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7050'}/products/${qrCodeProductId}/qr`}
            alt="Product QR Code"
            width={256}
            height={256}
            className="w-64 h-64 mx-auto mb-6 border border-gray-200 rounded-lg"
          />

          <div className="flex gap-3">
            <button
              onClick={() => {
                const printWindow = window.open('', '', 'height=400,width=400');
                if (printWindow) {
                  printWindow.document.write('<html><head><title>Print QR Code</title></head><body style="text-align:center;">');
                  printWindow.document.write(`<img src="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7050'}/products/${qrCodeProductId}/qr" />`);
                  printWindow.document.write('</body></html>');
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                  printWindow.close();
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPrint className="w-4 h-4" />
              Print
            </button>

            <button
              onClick={() => setQrCodeProductId(null)}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
