const Document = require('../models/Document');

/**
 * Servicio para búsqueda vectorial en MongoDB
 * Usa aggregation pipeline con $search
 */
class MongoVectorService {
  /**
   * Busca chunks similares usando búsqueda vectorial
   * @param {number[]} embedding - Vector de embeddings
   * @param {number} topK - Número de resultados (default: 3)
   * @returns {Promise<Array>} - Chunks similares ordenados por relevancia
   */
  static async buscarSimilares(embedding, topK = 3) {
    try {
      if (!embedding || embedding.length === 0) {
        throw new Error('Embedding vacío');
      }

      // Usar aggregation pipeline con $search para búsqueda vectorial
      const resultados = await Document.aggregate([
        {
          $search: {
            cosmosSearch: {
              vector: embedding,
              k: topK
            },
            returnStoredSource: true
          }
        },
        {
          $project: {
            content: 1,
            category: 1,
            fileName: 1,
            section: 1,
            context: 1,
            similarity: { $meta: 'searchScore' }
          }
        }
      ]);

      console.log(`🔍 Encontrados ${resultados.length} documentos similares`);
      return resultados;
    } catch (error) {
      console.error('❌ Error en búsqueda vectorial:', error.message);
      
      // Fallback: búsqueda simple si Vector Search falla
      console.log('⚠️  Usando búsqueda de texto como fallback...');
      return await this.buscarPorTexto('');
    }
  }

  /**
   * Busca documentos por texto
   * @param {string} query - Texto de búsqueda
   * @param {number} limit - Número de resultados
   * @returns {Promise<Array>} - Documentos encontrados
   */
  static async buscarPorTexto(query, limit = 3) {
    try {
      // Primero intentar con $text (índice de texto)
      const porIndice = await Document.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit);

      if (porIndice.length > 0) {
        console.log(`📝 Encontrados ${porIndice.length} documentos por índice de texto`);
        return porIndice;
      }

      // Fallback: búsqueda por regex con las palabras clave de la pregunta
      const palabras = query
        .toLowerCase()
        .replace(/[¿?¡!.,;:]/g, '')
        .split(/\s+/)
        .filter(p => p.length > 3); // ignorar palabras cortas (de, la, el, ...)

      if (palabras.length === 0) {
        return await Document.find().limit(limit);
      }

      const regexOr = palabras.map(p => ({ content: { $regex: p, $options: 'i' } }));
      const porRegex = await Document.find({ $or: regexOr }).limit(limit);

      console.log(`📝 Encontrados ${porRegex.length} documentos por regex`);
      return porRegex;
    } catch (error) {
      console.error('❌ Error en búsqueda por texto:', error.message);
      // Último fallback: devolver los más recientes
      try {
        return await Document.find().sort({ createdAt: -1 }).limit(limit);
      } catch {
        return [];
      }
    }
  }

  /**
   * Busca por categoría
   * @param {string} category - Categoría a buscar
   * @returns {Promise<Array>} - Documentos de esa categoría
   */
  static async buscarPorCategoria(category) {
    try {
      const resultados = await Document.find({ category });
      console.log(`📂 Encontrados ${resultados.length} documentos en categoría: ${category}`);
      return resultados;
    } catch (error) {
      console.error('❌ Error buscando por categoría:', error.message);
      return [];
    }
  }

  /**
   * Obtiene todos los documentos
   * @returns {Promise<Array>} - Todos los documentos
   */
  static async obtenerTodos() {
    try {
      const documentos = await Document.find().sort({ createdAt: -1 });
      console.log(`📚 Total de documentos: ${documentos.length}`);
      return documentos;
    } catch (error) {
      console.error('❌ Error obteniendo documentos:', error.message);
      return [];
    }
  }

  /**
   * Elimina todos los documentos (para limpiar)
   * @returns {Promise<Object>} - Resultado de la eliminación
   */
  static async limpiarTodos() {
    try {
      const resultado = await Document.deleteMany({});
      console.log(`🗑️  Eliminados ${resultado.deletedCount} documentos`);
      return resultado;
    } catch (error) {
      console.error('❌ Error limpiando documentos:', error.message);
      throw error;
    }
  }

  /**
   * Guarda un nuevo chunk
   * @param {Object} data - Datos del chunk
   * @returns {Promise<Object>} - Documento guardado
   */
  static async guardarChunk(data) {
    try {
      const documento = new Document(data);
      const guardado = await documento.save();
      console.log('✅ Chunk guardado en MongoDB');
      return guardado;
    } catch (error) {
      console.error('❌ Error guardando chunk:', error.message);
      throw error;
    }
  }
}

module.exports = MongoVectorService;
