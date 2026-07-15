// components/utils/imprimirEtiqueta.ts
// Função utilitária de impressão, atualizada para incluir a Descrição do Pallet.

// ✅ Recebe os dados de endereçamento para montar o layout WMS industrial
export const imprimirEtiqueta = (numero: string, rua: string, estrutura: string, nivel: string, descricao: string) => {
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
          
          /* ✅ CAIXA DE DESCRIÇÃO ADICIONADA */
          .description-box {
            width: 100%;
            border: 1px solid #000;
            background-color: #f8f8f8;
            padding: 2mm 3mm;
            margin-bottom: 4mm;
            box-sizing: border-box;
            text-align: center;
          }
          .description-title {
            font-size: 8px;
            text-transform: uppercase;
            font-weight: bold;
            color: #555;
            margin-bottom: 1mm;
          }
          .description-text {
            font-size: 12px;
            font-weight: bold;
            color: #000;
            word-wrap: break-word;
            max-height: 15mm;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          /* ✅ QR CODE MENOR */
          .qr-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 0 2mm 0;
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

        ${descricao ? `
        <div class="description-box">
          <div class="description-title">Descrição do Pallet</div>
          <div class="description-text">${descricao}</div>
        </div>
        ` : ''}

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