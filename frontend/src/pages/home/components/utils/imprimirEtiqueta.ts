// components/utils/imprimirEtiqueta.ts
// Função utilitária de impressão, extraída de Home.tsx sem qualquer alteração de lógica.

// ✅ Recebe os dados de endereçamento para montar o layout WMS industrial
export const imprimirEtiqueta = (numero: string, rua: string, estrutura: string, nivel: string) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(numero)}`;
  const janelaImpressao = window.open('', '_blank', 'width=500,height=750');
  if (!janelaImpressao) return;

  janelaImpressao.document.write(`
    <html>
      <head>
        <title>Etiqueta WMS - ${numero}</title>
        <style>
          @page { size: 100mm 150mm; margin: 0; }
          html, body {
            margin: 0; padding: 0;
            width: 100mm; height: 150mm;
            background-color: #fff; box-sizing: border-box;
            display: flex; flex-direction: column;
            align-items: center; justify-content: space-between;
          }
          body { 
            font-family: 'Arial', sans-serif; 
            padding: 8mm;
          }
          .header-container {
            width: 100%;
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 4mm;
          }
          .title-sub {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #555;
            margin: 0 0 2mm 0;
            font-weight: bold;
          }
          h1 {
            margin: 0; 
            font-size: 38px; 
            font-weight: 900;
            color: #000; 
            font-family: monospace;
            letter-spacing: 1px;
          }
          .address-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4mm 0;
          }
          .address-table th {
            background-color: #000;
            color: #fff;
            font-size: 10px;
            text-transform: uppercase;
            padding: 1.5mm;
            letter-spacing: 1px;
            border: 1px solid #000;
          }
          .address-table td {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            padding: 3mm;
            font-family: monospace;
            border: 1px solid #000;
          }
          /* ✅ QR CODE MENOR: Reduzido para tamanho empresarial clássico de triagem */
          .qr-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 2mm 0;
          }
          img { 
            width: 45mm; 
            height: 45mm; 
          }
          .footer-bar {
            width: 100%;
            text-align: center;
            border-top: 1px dashed #000;
            padding-top: 3mm;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #444;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="title-sub">Identificador de Posição</div>
          <h1>${numero}</h1>
        </div>

        <table class="address-table">
          <thead>
            <tr>
              <th style="width: 40%;">Rua / Setor</th>
              <th style="width: 30%;">Estrutura</th>
              <th style="width: 30%;">Nível</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${rua || 'N/A'}</td>
              <td>${estrutura || 'N/A'}</td>
              <td>${nivel || 'N/A'}</td>
            </tr>
          </tbody>
        </table>

        <div class="qr-container">
          <img src="${qrUrl}" alt="QR Code" />
        </div>

        <div class="footer-bar">
        Pro4ce
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 300);
          };
        </script>
      </body>
    </html>
  `);
  janelaImpressao.document.close();
};