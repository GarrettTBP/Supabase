// src/components/N8nUploader.js
import { useState } from 'react';

export default function N8nUploader() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setStatus('Uploading…');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(
        'https://garretttbp.app.n8n.cloud/webhook-test/map-coa',
        {
          method: 'POST',
          headers: {
            'x-n8n-secret': 'TBP1719',
          },
          body: form,
        }
      );

      if (!res.ok) throw new Error(await res.text());

      // Get ZIP as Blob
      const blob = await res.blob();

      // Try to extract filename from Content-Disposition header
      const contentDisposition = res.headers.get('Content-Disposition');
      const match = contentDisposition?.match(/filename="(.+)"/);
      const fileName = match?.[1] || 'COA_Mapping_Report.zip';

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url); // clean up

      setStatus('Downloaded!');
    } catch (err) {
      console.error(err);
      setStatus('Upload failed: ' + err.message);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <input
        type="file"
        onChange={e => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload} disabled={!file}>
        Send to n8n
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}
