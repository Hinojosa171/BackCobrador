const fs = require('node:fs');
const pdfParse = require('pdf-parse');

// ================================================================
// SERVICIO DE PDF
// ================================================================
// Este archivo maneja todo lo relacionado con archivos PDF.
//
// FLUJO PRINCIPAL:
//   1. extraerTexto()         → lee el PDF y devuelve el texto crudo
//   2. extraerSoloPreguntas() → detecta si el PDF tiene preguntas
//   3. procesarTexto()        → divide el texto en chunks para MongoDB
//
// FLUJO ALTERNATIVO (PDF completo):
//   procesarPDFCompleto()    → hace paso 1 + paso 3 en un solo llamado
// ================================================================

class PDFService {

  // ── PASO 1: LEER EL PDF ────────────────────────────────────
  // Recibe la ruta del archivo y devuelve todo el texto como string
  static async extraerTexto(filePath) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    console.log(`📄 PDF leído: ${data.numpages} páginas, ${data.text.length} caracteres`);
    return data.text;
  }

  // ── PASO 2: DETECTAR PREGUNTAS ─────────────────────────────
  // Busca preguntas numeradas en el texto del PDF.
  //
  // Formatos que detecta:
  //   "1. ¿Qué es un cobrador?"
  //   "1) ¿Cuántas sedes hay?"
  //   "Pregunta 1: ¿Cómo registrar un pago?"
  //
  // Devuelve un array de objetos: [{ numero: 1, pregunta: "¿...?" }, ...]
  static extraerSoloPreguntas(texto) {
    const preguntas = [];

    // Formato principal: "1. texto" o "1) texto"
    const patron = /^(\d+)[.)]\s*(.+)/gm;
    let match;

    while ((match = patron.exec(texto)) !== null) {
      const contenido = match[2].trim();
      // Solo incluir si tiene símbolo "?" o es suficientemente largo (>20 chars)
      // Esto evita capturar títulos cortos como "1. Introducción"
      if (contenido.includes('?') || contenido.length > 20) {
        preguntas.push({
          numero: parseInt(match[1]),
          pregunta: contenido
        });
      }
    }

    // Formato alternativo: "Pregunta 1: texto" (si no encontró con el patron principal)
    if (preguntas.length === 0) {
      const patron2 = /[Pp]regunta\s+(\d+)[:.]\s*(.+)/gm;
      while ((match = patron2.exec(texto)) !== null) {
        preguntas.push({
          numero: parseInt(match[1]),
          pregunta: match[2].trim()
        });
      }
    }

    console.log(`❓ Preguntas encontradas en el PDF: ${preguntas.length}`);
    return preguntas;
  }

  // ── PASO 3: DIVIDIR EN CHUNKS ──────────────────────────────
  // Corta el texto largo en trozos pequeños para guardar en MongoDB.
  //
  // Por qué chunks? MongoDB busca mejor en textos cortos y enfocados.
  // El "overlap" evita que una idea quede partida entre dos chunks.
  static dividirEnChunks(texto, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let inicio = 0;

    while (inicio < texto.length) {
      const fin = Math.min(inicio + chunkSize, texto.length);
      const chunk = texto.substring(inicio, fin).trim();
      if (chunk.length > 0) chunks.push(chunk);
      inicio = fin - overlap; // retroceder un poco para el solapamiento
    }

    console.log(`✂️  Texto dividido en ${chunks.length} chunks`);
    return chunks;
  }

  // ── DETECTAR CATEGORÍA ─────────────────────────────────────
  // Clasifica el contenido según palabras clave para organizar en MongoDB
  static detectarCategoria(texto) {
    const t = texto.toLowerCase();
    if (t.includes('sede') || t.includes('sucursal'))     return 'sedes';
    if (t.includes('cobrador') || t.includes('empleado')) return 'cobradores';
    if (t.includes('prestado') || t.includes('préstamo')) return 'prestamos';
    if (t.includes('tasa') || t.includes('interés'))      return 'tasa';
    return 'general';
  }

  // ── PROCESAR TEXTO YA EXTRAÍDO ─────────────────────────────
  // Recibe el texto (ya extraído) y lo convierte en chunks listos para MongoDB.
  // Se usa cuando ya tenemos el texto y no queremos releer el archivo.
  static procesarTexto(texto, fileName) {
    const chunksTexto = this.dividirEnChunks(texto);
    return chunksTexto.map((chunk, idx) => ({
      contenido: chunk,
      categoria: this.detectarCategoria(chunk),
      section: `Sección ${idx + 1}`,
      fileName,
      source: 'pdf'
    }));
  }

  // ── PIPELINE COMPLETO ──────────────────────────────────────
  // Atajo que hace todo en un paso: ruta del PDF → array de chunks
  // Usado por el endpoint HTTP /api/rag/upload-pdf
  static async procesarPDFCompleto(filePath, fileName) {
    const texto = await this.extraerTexto(filePath);
    return this.procesarTexto(texto, fileName);
  }

  // ── ELIMINAR ARCHIVO TEMPORAL ──────────────────────────────
  // Borra el PDF después de procesarlo para no llenar el disco
  static eliminarArchivo(filePath) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      console.log('🗑️  Archivo temporal eliminado');
    } catch (e) {
      console.warn('⚠️ No se pudo borrar el archivo:', e.message);
    }
  }
}

module.exports = PDFService;
