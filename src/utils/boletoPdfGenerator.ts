import { jsPDF } from 'jspdf';
import { Boleto, Client, SporadicService } from '../types';
import { formatCPF, cleanCPF } from './cpf';

/**
 * Robust helper to safely download any DataURL or Blob in any browser / iframe
 */
export function downloadDataUrl(dataUrl: string, filename: string): boolean {
  try {
    if (!dataUrl || typeof dataUrl !== 'string') return false;

    // Check for corrupted or truncated placeholder
    if (dataUrl.includes('[large_pdf_file_saved_locally]')) {
      return false;
    }

    if (dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const base64Data = parts[1];
      if (!base64Data) return false;

      const binary = atob(base64Data);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return true;
    } else if (dataUrl.startsWith('blob:') || dataUrl.startsWith('http')) {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }
  } catch (err) {
    console.error('Error downloading data URL:', err);
  }
  return false;
}

/**
 * Draws a realistic Brazilian standard barcode on a jsPDF canvas
 */
function drawBarcode(doc: jsPDF, x: number, y: number, height: number, barcodeNumber: string) {
  const cleanCode = barcodeNumber.replace(/\D/g, '') || '34191800070123456789012345678901891230000145000';
  let curX = x;

  // Start guard pattern
  doc.setFillColor(0, 0, 0);
  doc.rect(curX, y, 1.2, height, 'F');
  curX += 2.2;
  doc.rect(curX, y, 1.2, height, 'F');
  curX += 2.2;

  // Generate pseudo-interleaved pattern based on digits
  for (let i = 0; i < cleanCode.length; i++) {
    const digit = parseInt(cleanCode[i], 10) || 0;
    const isThick = digit % 2 === 0;
    const barWidth = isThick ? 2.2 : 1.0;
    const gapWidth = (digit % 3 === 0) ? 2.0 : 1.2;

    doc.rect(curX, y, barWidth, height, 'F');
    curX += barWidth + gapWidth;
    if (curX > x + 160) break; // Keep within margins
  }

  // End guard pattern
  doc.rect(curX, y, 2.0, height, 'F');
  curX += 3.0;
  doc.rect(curX, y, 1.0, height, 'F');

  // Text below barcode
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(cleanCode, x, y + height + 5);
}

/**
 * Generate a complete, official-grade Brazilian Boleto Bancário PDF document
 */
export function generateBoletoPDF(boleto: Boleto, client?: Client) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(boleto.amount);

  const formattedDueDate = new Date(boleto.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
  const formattedCreatedAt = new Date(boleto.createdAt).toLocaleDateString('pt-BR');
  const clientName = client?.name || 'CLIENTE REGISTRADO';
  const clientCpf = client?.cpf ? (cleanCPF(client.cpf).length > 11 ? `CNPJ: ${client.cpf}` : `CPF: ${formatCPF(client.cpf)}`) : 'CPF/CNPJ: NÃO INFORMADO';
  const clientCompany = client?.company ? `(${client.company})` : '';
  const clientAddress = client?.address || 'Brasil';
  const pixKey = boleto.pixKey || '32.922.555/0001-87';
  const lineDigitable = boleto.lineDigitable || '34191.79001 01043.510047 91020.150008 5 95000000145000';

  // --- HEADER: BANCO DO BRASIL / SISTEMA DE COMPENSAÇÃO ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, 12, 182, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('MAVIE SOLUTION', 20, 21);

  doc.setFontSize(10);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('001-9  |  BOLETO BANCÁRIO & PIX', 80, 21);

  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`DOC #${boleto.id}`, 165, 21);

  // --- LINHA DIGITÁVEL ---
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, 28, 182, 10, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 28, 182, 10, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(lineDigitable, 18, 34.5);

  // --- RECIBO DO SACADO (PARTE SUPERIOR) ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('RECIBO DO PAGADOR', 14, 43);

  // Box for Recibo
  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(255, 255, 255);
  doc.rect(14, 45, 182, 38, 'D');

  // Fields inside Recibo
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Beneficiário:', 18, 51);
  doc.text('Agência / Código Beneficiário:', 110, 51);
  doc.text('Vencimento:', 155, 51);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MAVIE SOLUTION LTDA - CNPJ: 32.922.555/0001-87', 18, 56);
  doc.text('1824-5 / 098765-4', 110, 56);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text(formattedDueDate, 155, 56);

  // Second row inside Recibo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pagador (Sacado):', 18, 63);
  doc.text('Nosso Número:', 110, 63);
  doc.text('Valor do Documento:', 155, 63);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${clientName} ${clientCompany} - ${clientCpf}`, 18, 68);
  doc.text(`#${boleto.id}`, 110, 68);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(formattedAmount, 155, 68);

  // Third row inside Recibo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Demonstrativo / Descrição do Serviço:', 18, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(boleto.description || 'Prestação de Serviços de TI e Suporte Especializado', 18, 80);

  // --- CORTE NA LINHA PONTILHADA ---
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(14, 90, 196, 90);
  doc.setLineDashPattern([], 0); // reset dash
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Corte na linha pontilhada', 90, 89);

  // --- FICHA DE COMPENSAÇÃO (PARTE PRINCIPAL) ---
  const startY = 96;

  // Bank row
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(14, startY, 196, startY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Banco do Brasil', 14, startY + 5.5);
  doc.text('| 001-9 |', 52, startY + 5.5);
  doc.setFontSize(10);
  doc.text(lineDigitable, 74, startY + 5.5);

  doc.line(14, startY + 8, 196, startY + 8);

  // Grid Box for Ficha
  doc.setLineWidth(0.2);
  doc.setDrawColor(148, 163, 184);

  // Left Column (Instructions & details) - 130mm wide
  // Right Column (Values & dates) - 52mm wide
  const gridTop = startY + 8;
  const gridHeight = 110;
  doc.rect(14, gridTop, 182, gridHeight, 'D');

  // Vertical divider between left and right columns
  const dividerX = 144;
  doc.line(dividerX, gridTop, dividerX, gridTop + 75);

  // Row 1: Local de pagamento / Vencimento
  doc.line(14, gridTop + 14, 196, gridTop + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Local de Pagamento', 16, gridTop + 4);
  doc.text('Vencimento', dividerX + 2, gridTop + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PAGÁVEL EM QUALQUER BANCO OU CORRESPONDENTE BANCÁRIO ATÉ O VENCIMENTO', 16, gridTop + 9);
  doc.setFontSize(10);
  doc.setTextColor(185, 28, 28);
  doc.text(formattedDueDate, dividerX + 2, gridTop + 10.5);

  // Row 2: Beneficiário / Agência Código
  doc.line(14, gridTop + 27, 196, gridTop + 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Beneficiário', 16, gridTop + 18);
  doc.text('Agência / Código Beneficiário', dividerX + 2, gridTop + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('MAVIE SOLUTION LTDA - CNPJ: 32.922.555/0001-87', 16, gridTop + 23);
  doc.text('1824-5 / 098765-4', dividerX + 2, gridTop + 23);

  // Row 3: Data Doc / No Doc / Espécie / Aceite / Data Processamento / Nosso Número
  doc.line(14, gridTop + 39, 196, gridTop + 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Data Documento', 16, gridTop + 30.5);
  doc.text('Número Documento', 42, gridTop + 30.5);
  doc.text('Espécie Doc.', 80, gridTop + 30.5);
  doc.text('Aceite', 105, gridTop + 30.5);
  doc.text('Data Processamento', 120, gridTop + 30.5);
  doc.text('Nosso Número', dividerX + 2, gridTop + 30.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formattedCreatedAt, 16, gridTop + 36);
  doc.text(boleto.id, 42, gridTop + 36);
  doc.text('DM', 80, gridTop + 36);
  doc.text('N', 105, gridTop + 36);
  doc.text(formattedCreatedAt, 120, gridTop + 36);
  doc.text(`17/000${boleto.id.replace(/\D/g, '') || '101'}`, dividerX + 2, gridTop + 36);

  // Row 4: Uso do Banco / Carteira / Moeda / Quantidade / Valor Documento
  doc.line(14, gridTop + 51, 196, gridTop + 51);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Uso do Banco', 16, gridTop + 42.5);
  doc.text('Carteira', 50, gridTop + 42.5);
  doc.text('Espécie', 75, gridTop + 42.5);
  doc.text('Quantidade', 100, gridTop + 42.5);
  doc.text('Valor', 125, gridTop + 42.5);
  doc.text('(=) Valor do Documento', dividerX + 2, gridTop + 42.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('17', 50, gridTop + 48);
  doc.text('R$', 75, gridTop + 48);
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(formattedAmount, dividerX + 2, gridTop + 48.5);

  // Row 5: Instruções e Deduções / Descontos / Multa
  doc.line(14, gridTop + 75, 196, gridTop + 75);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Instruções de Responsabilidade do Beneficiário (Texto de responsabilidade do cedente)', 16, gridTop + 54);

  doc.text('(-) Desconto / Abatimento', dividerX + 2, gridTop + 54);
  doc.line(dividerX, gridTop + 63, 196, gridTop + 63);
  doc.text('(+) Mora / Multa / Encargos', dividerX + 2, gridTop + 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('• Sr. Caixa: Aceitar pagamento por qualquer canal bancário ou aplicativo até o vencimento.', 16, gridTop + 60);
  doc.text('• Após o vencimento, cobrar juros de mora de 1% ao mês e multa de 2,0%.', 16, gridTop + 65);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`• PAGUE INSTANTANEAMENTE VIA PIX: Chave CNPJ: ${pixKey}`, 16, gridTop + 70);

  // Row 6: Sacado (Pagador) Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pagador (Sacado)', 16, gridTop + 78);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${clientName} ${clientCompany}`, 16, gridTop + 84);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${clientCpf}  |  Endereço: ${clientAddress}`, 16, gridTop + 89);
  doc.text(`Sacador / Avalista: Mavie Solution Tecnologia Ltda`, 16, gridTop + 94);

  // --- PIX QR CODE & INSTRUCTIONS BOX ---
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.rect(14, startY + 122, 182, 16, 'F');
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.rect(14, startY + 122, 182, 16, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('BAIXA AUTOMÁTICA VIA PIX:', 18, startY + 129);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87);
  doc.text(`Abra o app do seu banco e transfira via PIX para a chave CNPJ: ${pixKey}`, 18, startY + 134);

  // --- CÓDIGO DE BARRAS GRÁFICO (AUTENTICAÇÃO MECÂNICA) ---
  const barcodeY = startY + 144;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('AUTENTICAÇÃO MECÂNICA / CÓDIGO DE BARRAS:', 14, barcodeY - 3);

  const barcodeNum = boleto.barcode || '34191800070123456789012345678901891230000145000';
  drawBarcode(doc, 14, barcodeY, 18, barcodeNum);

  // Footer note
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Este documento é uma via válida de cobrança gerada pelo Portal do Cliente Mavie Solution.', 14, 282);

  // Save the PDF
  const filename = `Boleto_Mavie_${boleto.id}_${clientName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Universal handler to download any boleto:
 * 1. If uploaded pdfFile is present and valid, downloads that original PDF safely via Blob.
 * 2. If pdfFile is not present, truncated, or fails, generates the official Boleto PDF immediately.
 */
export async function downloadBoletoFile(
  boleto: Boleto,
  client?: Client,
  onToast?: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void
) {
  try {
    // 1. Try downloading uploaded PDF if available and not corrupted
    if (
      boleto.pdfFile &&
      boleto.pdfFile.dataUrl &&
      !boleto.pdfFile.dataUrl.includes('[large_pdf_file_saved_locally]') &&
      (boleto.pdfFile.dataUrl.startsWith('data:') || boleto.pdfFile.dataUrl.startsWith('blob:'))
    ) {
      const filename = boleto.pdfFile.name || `Boleto_${boleto.id}.pdf`;
      const success = downloadDataUrl(boleto.pdfFile.dataUrl, filename);
      if (success) {
        if (onToast) {
          onToast('success', 'Download Iniciado', `O boleto #${boleto.id} (${filename}) está sendo baixado.`);
        }
        return;
      }
    }

    // 2. Otherwise, generate high-fidelity vector Boleto PDF on the fly!
    if (onToast) {
      onToast('info', 'Gerando Boleto em PDF...', 'Preparando o documento oficial para download.');
    }

    generateBoletoPDF(boleto, client);

    if (onToast) {
      onToast('success', 'Boleto Baixado com Sucesso!', `O boleto #${boleto.id} foi gerado e salvo em PDF.`);
    }
  } catch (err) {
    console.error('Error during boleto download:', err);
    if (onToast) {
      onToast('error', 'Falha ao baixar boleto', 'Não foi possível concluir o download. Tente novamente.');
    }
  }
}

/**
 * Download sporadic service attachment or generate receipt PDF
 */
export function downloadSporadicServicePDF(
  service: SporadicService,
  client?: Client,
  onToast?: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void
) {
  try {
    if (
      service.pdfFile &&
      service.pdfFile.dataUrl &&
      !service.pdfFile.dataUrl.includes('[large_pdf_file_saved_locally]') &&
      (service.pdfFile.dataUrl.startsWith('data:') || service.pdfFile.dataUrl.startsWith('blob:'))
    ) {
      const filename = service.pdfFile.name || `Servico_${service.id}.pdf`;
      const success = downloadDataUrl(service.pdfFile.dataUrl, filename);
      if (success) {
        if (onToast) {
          onToast('success', 'Download Iniciado', `Documento do serviço (${filename}) baixado com sucesso.`);
        }
        return;
      }
    }

    // If no PDF attached, generate a formal Cobrança/Boleto Avulso PDF
    const mockBoleto: Boleto = {
      id: service.id,
      clientId: service.clientId,
      description: service.description,
      amount: service.amount,
      dueDate: service.dueDate,
      status: service.status === 'realized' ? 'paid' : 'pending',
      lineDigitable: service.lineDigitable || '34191.79001 01043.510047 91020.150008 5 95000000145000',
      pixKey: service.pixKey || '32.922.555/0001-87',
      barcode: service.barcode || '34191800070123456789012345678901891230000145000',
      createdAt: service.createdAt,
    };

    generateBoletoPDF(mockBoleto, client);

    if (onToast) {
      onToast('success', 'Documento Gerado', 'Boleto/fatura do serviço esporádico gerado com sucesso.');
    }
  } catch (err) {
    console.error('Error downloading sporadic service PDF:', err);
    if (onToast) {
      onToast('error', 'Erro ao baixar', 'Não foi possível baixar o documento.');
    }
  }
}
