// utils/imprimirEtiqueta.ts
// Função utilitária de impressão, extraída de PalletInterface.tsx sem qualquer alteração de lógica.

export const imprimirEtiquetaRetriagem = (codigo: string) => {
  const janelaImpressao = window.open('', '_blank', 'width=450,height=650');
  if (!janelaImpressao) return;

  janelaImpressao.document.write(`
    <html>
      <head>
        <title>Etiqueta Retriagem - ${codigo}</title>
        <style>
          @page { size: 40mm 60mm; margin: 0; }
          html, body {
            margin: 0; padding: 0;
            width: 40mm; height: 60mm;
            background-color: #fff;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            font-family: 'Arial', sans-serif;
          }
          .container {
            text-align: center;
            width: 100%;
            padding: 2mm;
            box-sizing: border-box;
          }
          .title {
            font-size: 8pt;
            font-weight: bold;
            margin-bottom: 3mm;
            letter-spacing: 0.5px;
          }
          .barcode-container {
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-img {
            max-width: 36mm;
            height: 18mm;
            object-fit: contain;
          }
          .code-text {
            font-size: 11pt;
            font-weight: bold;
            font-family: monospace;
            margin-top: 1.5mm;
          }
          .footer {
            font-size: 6pt;
            border-top: 0.5px dashed #000;
            padding-top: 1mm;
            width: 85%;
            margin: 3mm auto 0 auto;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="title">RETRIAGEM INTERNA</div>
          <div class="barcode-container">
            <img id="barcode" class="barcode-img" />
          </div>
          <div class="code-text">${codigo}</div>
          <div class="footer">PRO4CE WMS SYSTEM</div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          window.onload = function() {
            try {
              JsBarcode("#barcode", "${codigo}", {
                format: "CODE128",
                displayValue: false,
                height: 50,
                margin: 0
              });
            } catch (e) {
              console.error("Erro ao gerar código de barras:", e);
            }
            setTimeout(function() {
              window.print();
              window.close();
            }, 350);
          };
        </script>
      </body>
    </html>
  `);
  janelaImpressao.document.close();
};

// Imprime várias etiquetas de uma vez, em uma única janela/impressão (uma página por etiqueta).
// Evita o problema de o navegador bloquear múltiplas janelas de impressão abertas em sequência.
export const imprimirEtiquetasRetriagemLote = (codigos: string[]) => {
  if (codigos.length === 0) return;

  const janelaImpressao = window.open('', '_blank', 'width=450,height=650');
  if (!janelaImpressao) return;

  const paginas = codigos.map((codigo, index) => `
    <div class="pagina"${index > 0 ? ' style="page-break-before: always;"' : ''}>
      <div class="container">
        <div class="title">RETRIAGEM INTERNA</div>
        <div class="barcode-container">
          <img class="barcode-img" data-codigo="${codigo}" />
        </div>
        <div class="code-text">${codigo}</div>
        <div class="footer">PRO4CE WMS SYSTEM</div>
      </div>
    </div>
  `).join('');

  janelaImpressao.document.write(`
    <html>
      <head>
        <title>Etiquetas Retriagem</title>
        <style>
          @page { size: 40mm 60mm; margin: 0; }
          html, body { margin: 0; padding: 0; background-color: #fff; font-family: 'Arial', sans-serif; }
          .pagina {
            width: 40mm; height: 60mm;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
          }
          .container {
            text-align: center;
            width: 100%;
            padding: 2mm;
            box-sizing: border-box;
          }
          .title {
            font-size: 8pt;
            font-weight: bold;
            margin-bottom: 3mm;
            letter-spacing: 0.5px;
          }
          .barcode-container {
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-img {
            max-width: 36mm;
            height: 18mm;
            object-fit: contain;
          }
          .code-text {
            font-size: 11pt;
            font-weight: bold;
            font-family: monospace;
            margin-top: 1.5mm;
          }
          .footer {
            font-size: 6pt;
            border-top: 0.5px dashed #000;
            padding-top: 1mm;
            width: 85%;
            margin: 3mm auto 0 auto;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        ${paginas}

        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          window.onload = function() {
            try {
              document.querySelectorAll('.barcode-img').forEach(function (img) {
                JsBarcode(img, img.getAttribute('data-codigo'), {
                  format: "CODE128",
                  displayValue: false,
                  height: 50,
                  margin: 0
                });
              });
            } catch (e) {
              console.error("Erro ao gerar códigos de barras:", e);
            }
            setTimeout(function() {
              window.print();
              window.close();
            }, 400);
          };
        </script>
      </body>
    </html>
  `);
  janelaImpressao.document.close();
};