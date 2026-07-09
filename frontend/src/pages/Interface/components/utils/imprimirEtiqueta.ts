// utils/imprimirEtiqueta.ts
// Função utilitária de impressão da etiqueta de retriagem (60x40mm - Horizontal).

const ESTILOS_ETIQUETA = `
  @page { size: 60mm 40mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background-color: #fff;
    font-family: 'Arial', sans-serif;
  }
  .pagina {
    width: 60mm; height: 40mm;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .etiqueta {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding: 2.5mm;
  }
  .header {
    width: 100%;
    text-align: center;
    border-bottom: 1.5px solid #000;
    padding-bottom: 1mm;
    margin-bottom: 0.5mm;
  }
  .title {
    font-size: 7.5pt;
    font-weight: 900;
    letter-spacing: 0.5px;
    margin: 0;
  }
  .barcode-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    flex-grow: 1;
    margin-top: 1mm;
  }
  .barcode-img {
    width: 52mm;
    height: 14mm;
    object-fit: contain;
  }
  .code-text {
    font-size: 13pt;
    font-weight: 900;
    font-family: monospace;
    letter-spacing: 1px;
    margin-top: 1mm;
    margin-bottom: 1mm;
  }
  .footer {
    font-size: 6pt;
    font-weight: bold;
    background-color: #000;
    color: #fff;
    width: 100%;
    text-align: center;
    padding: 1.5mm 0;
    letter-spacing: 1px;
    border-radius: 2px;
  }
`;

export const imprimirEtiquetaRetriagem = (codigo: string) => {
  const janelaImpressao = window.open('', '_blank', 'width=500,height=400');
  if (!janelaImpressao) return;

  janelaImpressao.document.write(`
    <html>
      <head>
        <title>Etiqueta CR - ${codigo}</title>
        <style>${ESTILOS_ETIQUETA}</style>
      </head>
      <body>
        <div class="pagina">
          <div class="etiqueta">
            <div class="header">
              <div class="title">CÓDIGO DE RASTREABILIDADE</div>
            </div>
            <div class="barcode-container">
              <img id="barcode" class="barcode-img" />
            </div>
            <div class="code-text">${codigo}</div>
            <div class="footer">PRO4CE WMS</div>
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          window.onload = function() {
            try {
              JsBarcode("#barcode", "${codigo}", {
                format: "CODE128",
                displayValue: false,
                height: 45,
                margin: 0,
                width: 2.5
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
export const imprimirEtiquetasRetriagemLote = (codigos: string[]) => {
  if (codigos.length === 0) return;

  const janelaImpressao = window.open('', '_blank', 'width=500,height=400');
  if (!janelaImpressao) return;

  const paginas = codigos.map((codigo, index) => `
    <div class="pagina"${index > 0 ? ' style="page-break-before: always;"' : ''}>
      <div class="etiqueta">
        <div class="header">
          <div class="title">CÓDIGO DE RASTREABILIDADE</div>
        </div>
        <div class="barcode-container">
          <img class="barcode-img" data-codigo="${codigo}" />
        </div>
        <div class="code-text">${codigo}</div>
        <div class="footer">PRO4CE WMS</div>
      </div>
    </div>
  `).join('');

  janelaImpressao.document.write(`
    <html>
      <head>
        <title>Etiquetas CR em Lote</title>
        <style>${ESTILOS_ETIQUETA}</style>
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
                  height: 45,
                  margin: 0,
                  width: 2.5
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