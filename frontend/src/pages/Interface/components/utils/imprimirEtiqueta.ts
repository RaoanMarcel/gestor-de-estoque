// utils/imprimirEtiqueta.ts
// Função utilitária de impressão da etiqueta de retriagem (40x60mm).

const ESTILOS_ETIQUETA = `
  @page { size: 40mm 60mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background-color: #fff;
    font-family: 'Arial', sans-serif;
  }
  .pagina {
    width: 40mm; height: 60mm;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .etiqueta {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2mm;
    width: 100%;
    padding: 3mm;
  }
  .title {
    font-size: 8pt;
    font-weight: bold;
    letter-spacing: 0.5px;
  }
  .barcode-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
  .barcode-img {
    width: 34mm;
    height: 16mm;
    object-fit: contain;
  }
  .code-text {
    font-size: 12pt;
    font-weight: bold;
    font-family: monospace;
    letter-spacing: 0.5px;
  }
  .footer {
    font-size: 6pt;
    border-top: 0.5px dashed #000;
    padding-top: 1mm;
    width: 80%;
    text-align: center;
    letter-spacing: 0.5px;
    margin-top: 1mm;
  }
`;

export const imprimirEtiquetaRetriagem = (codigo: string) => {
  const janelaImpressao = window.open('', '_blank', 'width=450,height=650');
  if (!janelaImpressao) return;

  janelaImpressao.document.write(`
    <html>
      <head>
        <title>Etiqueta Retriagem - ${codigo}</title>
        <style>${ESTILOS_ETIQUETA}</style>
      </head>
      <body>
        <div class="pagina">
          <div class="etiqueta">
            <div class="title">RETRIAGEM INTERNA</div>
            <div class="barcode-container">
              <img id="barcode" class="barcode-img" />
            </div>
            <div class="code-text">${codigo}</div>
            <div class="footer">PRO4CE WMS SYSTEM</div>
          </div>
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
      <div class="etiqueta">
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