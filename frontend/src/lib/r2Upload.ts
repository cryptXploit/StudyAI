export async function uploadDocumentToR2(file: File, supabaseAccessToken: string) {
  // 1. Get Presigned URL
  const urlRes = await fetch('/api/upload/r2-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAccessToken}`
    },
    body: JSON.stringify({ filename: file.name, contentType: file.type })
  });
  
  if (!urlRes.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl, r2Key } = await urlRes.json();

  // 2. PUT file directly to Cloudflare R2 (Bypassing our backend bandwidth)
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });

  if (!putRes.ok) throw new Error('Failed to upload file to R2');

  // 3. Confirm upload with our backend to trigger BullMQ Document Worker
  const confirmRes = await fetch('/api/upload/r2-confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAccessToken}`
    },
    body: JSON.stringify({
      r2Key,
      filename: file.name,
      fileType: file.type.includes('pdf') ? 'pdf' : 'jpeg',
      fileSize: file.size,
      contentType: file.type
    })
  });

  if (!confirmRes.ok) throw new Error('Failed to confirm upload');
  return confirmRes.json(); // { message, fileId }
}
