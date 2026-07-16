import { useState, useEffect, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import QRCode from 'qrcode';

interface UrlQrCodeModalProps {
  url: {
    id: string;
    short_code: string;
    original_url: string;
    title: string | null;
    header?: string | null;
  };
  open: boolean;
  onClose: () => void;
}

export const UrlQrCodeModal = memo(function UrlQrCodeModal({ url, open, onClose }: UrlQrCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const shortUrl = url.header 
    ? `${window.location.origin}/r/${url.header}/${url.short_code}`
    : `${window.location.origin}/r/${url.short_code}`;

  useEffect(() => {
    if (open) {
      QRCode.toDataURL(shortUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then(setQrDataUrl);
    }
  }, [open, shortUrl]);

  const handleDownload = async () => {
    // Generate SVG for better quality
    const svgString = await QRCode.toString(shortUrl, {
      type: 'svg',
      width: 400,
      margin: 2,
    });

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `qr-${url.short_code}.svg`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription className="break-all">
            {url.title || shortUrl}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt={`QR code for ${shortUrl}`}
              className="w-64 h-64 rounded-lg border bg-white"
            />
          ) : (
            <div className="w-64 h-64 rounded-lg border bg-muted animate-pulse" />
          )}
          
          <p className="text-sm text-muted-foreground text-center font-mono">
            {shortUrl}
          </p>
          
          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download SVG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default UrlQrCodeModal;
