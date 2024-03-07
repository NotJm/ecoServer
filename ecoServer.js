const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const mqtt = require("mqtt");
// Modulos utilizados

const app = express();
const port = 3100;
// Configuracion del puerto

// Configurar middleware para analizar el cuerpo de las solicitudes HTTP
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configurar CORS para permitir solicitudes desde cualquier origen
app.use(cors());

// URL de conexión a tu base de datos MongoDB Atlas
const mongoUrl = "mongodb+srv://notjm:tqsjTGz5oWJlOdm2@eco-nido.dbwpny9.mongodb.net/?retryWrites=true&w=majority&appName=Eco-Nido";

// Cliente MQTT
const mqttClient = mqtt.connect("mqtt://broker.hivemq.com");


// Ruta para recibir datos desde la ESP32
app.post('/deivce', async (req, res) => {
  const data = req.body;

  try {
    // Conectar a la base de datos MongoDB Atlas
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conexión exitosa a MongoDB Atlas");

    // Obtener una referencia a la base de datos y la colección
    const db = client.db("EcoNido");
    const deviceCollection = db.collection("device");
    const deviceHistoryCollection = db.collection("device");

    // Antes de isnertar los datos hay que comprobar que no haya un dispositivo existente
    const { mac } = data;
    const existsDevice = await deviceCollection.find({ mac: mac }).toArray();

    // Comprobacion de dispositivo
    if (!Array.isArray(existsDevice)) {
      // Insertar los datos en la colección si no existe
      await deviceCollection.insertOne(data);
    } else {
      // Actualiza datos si ya existe dispositivo
      await deviceCollection.updateOne(data);
    }

    // Historial de dispositivo
    await deviceHistoryCollection.insertOne(data);

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

// Ruta para recibir datos de mi ecoWeb (Registro de usuarios)
app.get('/user', async (req, res) => {
  const data = req.query;
  try {
    // Conectar  a la base de datos MongoDBAtlas
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conexion exitosa a MongoDB Atlas");

    // Obtener una referencia a la base de datos y las colecciones
    const db = client.db("EcoNido");
    const userCollection = db.collection("users");

    // Primero se comprueba si no existe el usuario
    const { username } = data;
    const exists = await userCollection.find({ username: username }).toArray();

    if (!Array.isArray(exists)) {
      await userCollection.insertOne(data);
      res.send("Datos registrado satisfactoriamente");
    } else {
      res.send("Los datos enviados ya existen");
    }

    res.send("Datos recibidos del usuario");

  } catch (error) {
    console.error("Error al conectar MongoDB Atlas:", error);
    res.status(500).send("Error al conectar a la base de datos");
  } finally {
    if (client) {
      client.close();
    }
  }
});

app.get('/user/login', async (req, res) => {
  const data = req.query;
  try {
    // Validacion de datos
    const { username, password } = data;
    if (!username || !password) {
      return res.status(400).send('Falta información de autenticación');
    }

    // Conectar a la base de datos MongoDBAtlas
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conexion exitosa a MongoDB Atlas");

    // Obtener una referencia a la base de datos y las colecciones
    const db = client.db("EcoNido");
    const userCollection = db.collection("users");

    const exists = await userCollection.find({ username: username, password: password}).toArray();
    if(!Array.isArray(exists)) {
      res.status(401).json({status:false});
    } else {
      res.status(200).json({status:true});
    }

  } catch (error) {
    console.error("Error al conectar MongoDB Atlas:", error);
    res.status(500).send("Error al conectar a la base de datos");
  } finally {
    if (client) {
      client.close();
    }
  }
})

// Manejo MQTT peticiones
const listen = (state, topic) => {
  const message = state === "ON" ? "ON" : "OFF";
  mqttClient.publish(topic, message);
  console.log("Mensaje Enviado Sactifactoriamente");
}

// Manejo MQTT GET
app.get("/mqtt", (req, res) => {
  const { state, topic } = req.query;

  if (!state || (state !== "ON" && state !== "OFF")) {
    return res.status(400).send("Parametros Invalidos");
  }

  listen(state, topic);

});


// Manejar errores 404 para rutas no encontradas
app.use((req, res, next) => {
  res.status(404).send("Ruta no encontrada");
});

// Manejar errores 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error del servidor');
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor Node.js escuchando en http://localhost:${port}`);
});
