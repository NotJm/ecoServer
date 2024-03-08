const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const mqtt = require("mqtt");
// Modulos utilizados

const app = express();
const port = 8080;
// Configuracion del puerto

// Configurar middleware para analizar el cuerpo de las solicitudes HTTP
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configurar CORS para permitir solicitudes desde cualquier origen
app.use(cors());

// URL de conexión a tu base de datos MongoDB Atlas
//"mongodb+srv://notjm:tqsjTGz5oWJlOdm2@eco-nido.dbwpny9.mongodb.net/?retryWrites=true&w=majority&appName=Eco-Nido"
// mongodb+srv://notjm:tqsjTGz5oWJlOdm2@eco-nido.dbwpny9.mongodb.net/?retryWrites=true&w=majority&appName=Eco-Nido
const mongoUrl = "mongodb+srv://notjm:tqsjTGz5oWJlOdm2@eco-nido.dbwpny9.mongodb.net/?retryWrites=true&w=majority&appName=Eco-Nido";

// Cliente MQTT
const mqttClient = mqtt.connect("mqtt://broker.hivemq.com");


// Ruta para recibir datos desde la ESP32
app.get('/insertDevice', async (req, res) => {
  const data = req.query;

  try {
    // Conectar a la base de datos MongoDB Atlas
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conexión exitosa a MongoDB Atlas");

    // Obtener una referencia a la base de datos y la colección
    const db = client.db("EcoNido");
    const deviceCollection = db.collection("device");
    const deviceHistoryCollection = db.collection("deviceHistory");

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

app.post('/device/sensor', async (req, res) => {
  const data = req.body;
  try {
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conexion exitosa a MongoDB Atlas");

    // Obtener una referencia a la base de datos y las colecciones
    const db = client.db("EcoNido");
    const userCollection = db.collection("device");

    // Primero se comprueba si no existe el usuario
    const { mac } = data;
    const exists = await userCollection.find({ mac: mac }).toArray();

    if (!Array.isArray(exists)) {
      res.status(404).send("No se encontro el dispositivo");
    } else {
      res.json(exists);
    }

    res.send("Regresando datos del dispositivo");
  } catch (error) {
    console.error("Error al conectar MongoDB Atlas:", error);
    res.status(500).send("Error al conectar a la base de datos");
  } finally {
    if (client) {
      client.close();
    }
  }
})

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

app.post('/user/login', async (req, res) => {
  const data = req.body;
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

    const exists = await userCollection.find({ username: username, password: password }).toArray();
    if (!Array.isArray(exists)) {
      res.status(401).json({ status: false });
    } else {
      const { permisos } = exists;
      res.status(200).json({ status: true, tipo: permisos });
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
const listen = (state) => {
  const message = state === "lightON" ? "lightON" : "lightOFF";
  mqttClient.publish("ecoTopic", message);
  console.log("Mensaje Enviado Sactifactoriamente");
}

// Manejo MQTT GET
app.post("/mqtt", (req, res) => {
  const { state } = req.body;

  if (!state || (state !== "lightON" && state !== "lightOFF")) {
    return res.status(400).send("Parametros Invalidos");
  }

  listen(state);

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
