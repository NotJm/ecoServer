const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

// Configurar middleware para analizar el cuerpo de las solicitudes HTTP
app.use(bodyParser.urlencoded({ extended: true }));

// URL de conexión a tu base de datos MongoDB Atlas
const mongoUrl = "mongodb+srv://notjm:tqsjTGz5oWJlOdm2@eco-nido.dbwpny9.mongodb.net/EcoNido?retryWrites=true&w=majority";

// Ruta para recibir datos desde la ESP32
app.post('/app/data-afnpg/endpoint/EcoNido', async (req, res) => {
  const data = req.body;

  try {
    // Conectar a la base de datos MongoDB Atlas
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conexión exitosa a MongoDB Atlas");

    // Obtener una referencia a la base de datos y la colección
    const db = client.db("EcoNido");
    const collection = db.collection("dispositivo");

    // Insertar los datos en la colección
    await collection.insertOne(data);
    console.log("Datos insertados en la base de datos");

    // Cerrar la conexión
    client.close();
    console.log("Conexión cerrada");

    // Responder a la ESP32 con un mensaje de confirmación
    res.send("Datos recibidos y guardados en la base de datos");
  } catch (error) {
    console.error("Error al conectar a MongoDB Atlas:", error);
    res.status(500).send("Error al conectar a la base de datos");
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor Node.js escuchando en http:localhost:${port}`);
});
