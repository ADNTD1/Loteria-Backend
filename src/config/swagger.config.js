import swaggerJSDoc from 'swagger-jsdoc';
const options = {
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
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};
export const swaggerSpec = swaggerJSDoc(options);
//# sourceMappingURL=swagger.config.js.map