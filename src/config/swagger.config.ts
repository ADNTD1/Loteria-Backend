import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Back-Loteria API',
      version: '1.0.0',
      description: 'Documentación de la API para el juego de Lotería Mexicana (Salas, Usuarios y Juego)',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Introduce tu token JWT obtenido en /api/users/login (sin la palabra Bearer)',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);