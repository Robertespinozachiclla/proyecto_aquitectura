// UUIDs coincidentes con el C++ del ESP32-C3
const SERVICE_UUID           = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID_RX = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

let bluetoothDevice;
let rxCharacteristic;

let dot;
let statusValue;
let connectBtn;
let connectLabel;

// Inicialización de variables una vez cargado el DOM
document.addEventListener('DOMContentLoaded', () => {
  dot          = document.getElementById('statusDot');
  statusValue   = document.getElementById('statusValue');
  connectBtn    = document.getElementById('connectBtn');
  connectLabel  = document.getElementById('connectBtnLabel');
});

async function conectarBLE() {
  // Verificar si el navegador soporta Web Bluetooth
  if (!navigator.bluetooth) {
    alert("Tu navegador no soporta Web Bluetooth o estás accediendo sin HTTPS (ej. usando file://).\n\nPrueba con Google Chrome, Edge u Opera desde un servidor seguro o localhost.");
    return;
  }

  // Si ya está conectado, desconectar
  if (rxCharacteristic && bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
    return;
  }

  try {
    if (connectLabel) connectLabel.textContent = "Buscando...";
    console.log("Solicitando selección de dispositivo Bluetooth...");

    // Intentar buscar con filtro o permitir elegir entre todos los dispositivos cercanos
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      // Aceptamos todos los dispositivos para garantizar que aparezca la ventana emergente
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });

    bluetoothDevice.addEventListener('gattserverdisconnected', alDesconectar);

    console.log("Conectando al Servidor GATT de:", bluetoothDevice.name || "Dispositivo sin nombre");
    const server = await bluetoothDevice.gatt.connect();

    console.log("Obteniendo Servicio...");
    const service = await server.getPrimaryService(SERVICE_UUID);

    console.log("Obteniendo Característica RX...");
    rxCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID_RX);

    marcarConectado();

  } catch (error) {
    console.error("Error o cancelación al conectar:", error);
    if (connectLabel) connectLabel.textContent = "Conectar Bluetooth";
    
    // Solo mostrar alerta si no fue que el usuario canceló la ventana
    if (error.name !== 'NotFoundError') {
      alert("No se pudo conectar: " + error.message);
    }
  }
}

function marcarConectado() {
  if (dot) dot.classList.add('on');
  if (statusValue) {
    statusValue.textContent = "Conectado";
    statusValue.classList.remove('off');
    statusValue.classList.add('on');
  }

  if (connectBtn) connectBtn.classList.add('connected');
  if (connectLabel) connectLabel.textContent = "Desconectar";

  // Habilitar interruptores y botones de modo
  document.querySelectorAll('.switch input').forEach(input => input.disabled = false);
  document.querySelectorAll('.mode-btn').forEach(btn => btn.disabled = false);
}

function alDesconectar() {
  console.log("Dispositivo desconectado.");
  if (dot) dot.classList.remove('on');
  if (statusValue) {
    statusValue.textContent = "Desconectado";
    statusValue.classList.remove('on');
    statusValue.classList.add('off');
  }

  if (connectBtn) connectBtn.classList.remove('connected');
  if (connectLabel) connectLabel.textContent = "Conectar Bluetooth";

  rxCharacteristic = null;

  // Deshabilitar interruptores y botones de modo
  document.querySelectorAll('.switch input').forEach(input => {
    input.disabled = true;
    input.checked = false;
  });
  document.querySelectorAll('.mode-btn').forEach(btn => btn.disabled = true);

  document.querySelectorAll('.card').forEach(actualizarEstadoVisual);
}

async function toggleRoom(checkbox) {
  const comando = checkbox.checked ? checkbox.dataset.on : checkbox.dataset.off;
  await enviarComando(comando);

  const track = checkbox.nextElementSibling;
  if (track) {
    track.classList.remove('zap');
    void track.offsetWidth;
    track.classList.add('zap');
    setTimeout(() => track.classList.remove('zap'), 550);
  }

  actualizarEstadoVisual(checkbox.closest('.card'));
}

async function setModoNoche(btn, comando, textoEstado) {
  await enviarComando(comando);

  // Cambiar estado visual de botones
  const parentCard = btn.closest('.card');
  if (parentCard) {
    parentCard.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const nocheState = document.getElementById('nocheState');
    if (nocheState) nocheState.textContent = textoEstado;
    parentCard.classList.toggle('active', comando !== 'NOCHE_OFF');
  }
}

function actualizarEstadoVisual(card) {
  const key = card.dataset.key;
  const checkbox = card.querySelector('.switch input');
  
  if (!checkbox) return; // Si es la tarjeta de la luz nocturna, no usa checkbox

  const stateText = card.querySelector('.room-state');
  const pill = card.querySelector('.pill');
  const encendido = checkbox.checked;

  card.classList.toggle('active', encendido);

  if (key === 'garaje') {
    if (stateText) stateText.textContent = encendido ? "Abierto" : "Cerrado";
    const garageDoor = document.getElementById('garageDoorPanel');
    if (garageDoor) garageDoor.classList.toggle('open', encendido);
  } else {
    if (stateText) stateText.textContent = encendido ? "Encendido" : "Apagado";
    const win = document.getElementById('win-' + key);
    if (win) win.classList.toggle('lit', encendido);
  }

  if (pill) pill.classList.toggle('on', encendido);
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
