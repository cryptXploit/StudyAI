const fs = require('fs');

let code = fs.readFileSync('src/app/book-jumper/page.tsx', 'utf8');

const func = `
  const handleOpenManually = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\\/+$/, '');
      const ticketUrl = apiUrlBase.endsWith('/api') ? \`\${apiUrlBase}/files/download-ticket\` : \`\${apiUrlBase}/api/files/download-ticket\`;
      const res = await fetch(ticketUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${session?.access_token}\` }, 
        body: JSON.stringify({ fileId: selectedFileId }) 
      });
      const data = await res.json();
      if (data.ticketId) {
        const proxyUrl = apiUrlBase.endsWith('/api') ? \`\${apiUrlBase}/files/proxy/\${data.ticketId}\` : \`\${apiUrlBase}/api/files/proxy/\${data.ticketId}\`;
        window.open(proxyUrl, '_blank');
      } else {
        alert('Failed to generate secure ticket.');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating secure ticket.');
    }
  };
`;

if (!code.includes('handleOpenManually')) {
  code = code.replace('  const handleFileSelect = async', func + '\n  const handleFileSelect = async');
  
  // Replace the a tags with button tags
  code = code.replace(/<a href=\{rawSignedUrl\}.*?className="(.*?)">(.*?)<\/a>/gs, (match, className, inner) => {
    return `<button onClick={handleOpenManually} className="${className}">${inner}</button>`;
  });
  
  fs.writeFileSync('src/app/book-jumper/page.tsx', code);
  console.log('Patched page.tsx successfully');
} else {
  console.log('Already patched');
}
