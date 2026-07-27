// UUIDs que coinciden con el código C++ del ESP32-C3
const SERVICE_UUID           = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID_RX = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

let bluetoothDevice;
let rxCharacteristic;

async function conectarBLE() {
  try {
    console.log("Buscando dispositivo Bluetooth...");
    
    // Solicitar dispositivo
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'Domotica_ESP32C3' }],
      optionalServices: [SERVICE_UUID]
    });

    bluetoothDevice.addEventListener('gattserverdisconnected', alDesconectar);

    console.log("Conectando al Servidor GATT...");
    const server = await bluetoothDevice.gatt.connect();

    console.log("Obteniendo Servicio...");
    const service = await server.getPrimaryService(SERVICE_UUID);

    console.log("Obteniendo Característica RX...");
    rxCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID_RX);

    // Actualizar estado en interfaz
    const statusDiv = document.getElementById('status');
    statusDiv.innerText = "Estado: Conectado 🟢";
    statusDiv.className = "status-container connected";

    alert("¡Conexión Bluetooth Exitosa!");

  } catch (error) {
    console.error("Error al conectar:", error);
    alert("Error de conexión: " + error);
  }
}

async function enviarComando(comando) {
  if (!rxCharacteristic) {
    alert("Primero debes conectar el dispositivo Bluetooth.");
    return;
  }

  try {
    let encoder = new TextEncoder('utf-8');
    await rxCharacteristic.writeValue(encoder.encode(comando));
    console.log("Comando enviado:", comando);
  } catch (error) {
    console.error("Error al enviar comando:", error);
  }
}

function alDesconectar() {
  console.log("Dispositivo desconectado.");
  const statusDiv = document.getElementById('status');
  statusDiv.innerText = "Estado: Desconectado 🔴";
  statusDiv.className = "status-container disconnected";
  rxCharacteristic = null;
}