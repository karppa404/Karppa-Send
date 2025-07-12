import { useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
interface QRTemplateProps {
  Data: string;
}

export default function QRTemplate({ Data = "helloworld" }: QRTemplateProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);

  useEffect(() => {
    const options = {
      width: 300,
      height: 300,
      type: 'svg' as const,
      data: Data,
      image: '/plushpilot.png',
      margin: 2,
      qrOptions: {
        typeNumber: undefined,
        mode: 'Byte' as const,
        errorCorrectionLevel: 'Q' as const
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 0,
        crossOrigin: 'anonymous' as const,
        
      },
      dotsOptions: {
        color: '#222222',
        type: 'rounded' as const
      },
      backgroundOptions: {
        color: '#ffffff',
      },
      cornersSquareOptions: {
        color: '#00000',
        type: 'extra-rounded' as const,
      },
      cornersDotOptions: {
        color: '#222222',
        type: 'dot' as const,
      },

    };

    const newQrCode = new QRCodeStyling(options);
    setQrCode(newQrCode);
  }, [Data]);

  useEffect(() => {
    if (qrCode && ref.current) {
      // Clear previous QR code
      ref.current.innerHTML = '';
      qrCode.append(ref.current);
    }
  }, [qrCode]);

  return (
  <div className="rounded-xl">

    <div ref={ref} className="flex justify-self-center" />
  </div>

  );
}