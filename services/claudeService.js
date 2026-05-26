const Anthropic = require('@anthropic-ai/sdk');

/**
 * Servicio para interactuar con Claude/Anthropic API
 * - Generación de respuestas RAG
 * - Sin necesidad de embeddings (usa búsqueda por texto)
 */
class ClaudeService {
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('❌ ANTHROPIC_API_KEY no está configurado en .env');
    }
    this.client = new Anthropic({ apiKey });
    console.log('✅ Claude API inicializado');
  }

  /**
   * Genera respuesta usando RAG
   * @param {string} pregunta - Pregunta del usuario
   * @param {Array} chunks - Chunks similares recuperados
   * @returns {Promise<string>} - Respuesta generada
   */
  async generarRespuestaRAG(pregunta, chunks) {
    try {
      // Construir contexto con los chunks
      const contexto = chunks
        .map((chunk, i) => `Documento ${i + 1}: ${chunk.content}`)
        .join('\n\n');

      const prompt =
        `Eres el asistente del sistema de cobranza TuCobrador.\n\n` +
        `Responde ÚNICAMENTE con la información del siguiente contexto. ` +
        `No inventes datos. Si la respuesta no está en el contexto, di exactamente: ` +
        `"No tengo información sobre eso en el documento cargado."\n\n` +
        `CONTEXTO:\n${contexto}\n\n` +
        `PREGUNTA: ${pregunta}\n\n` +
        `Responde en español, de forma directa y sin rodeos.`;

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const respuesta = message.content[0].type === 'text' 
        ? message.content[0].text 
        : 'Error procesando respuesta';

      console.log('✅ Respuesta generada con Claude');
      return respuesta;
    } catch (error) {
      console.error('❌ Error generando respuesta Claude:', error.message);
      throw error;
    }
  }

  /**
   * Genera respuesta simple sin RAG (para pruebas)
   * @param {string} texto - Texto a procesar
   * @returns {Promise<string>} - Respuesta generada
   */
  // maxTokens permite aumentar el límite cuando hay que responder muchas preguntas
  async generarRespuestaSimple(texto, maxTokens = 1024) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: texto }]
      });

      return message.content[0].type === 'text'
        ? message.content[0].text
        : 'Error procesando respuesta';
    } catch (error) {
      console.error('❌ Error generando respuesta simple:', error.message);
      throw error;
    }
  }
}

module.exports = new ClaudeService();
