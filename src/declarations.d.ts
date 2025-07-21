declare module "qrcode.react" {
  import { FC } from 'react';
  interface QRCodeProps {
    value: string;
    size?: number;
    // Add other props as needed
  }
  export const QRCodeCanvas: FC<QRCodeProps>;
}

declare module 'react-qr-scanner';
