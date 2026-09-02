// UUIDs coincidentes con el firmware del ESP32
const SERVICE_UUID           = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID_RX = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

let bluetoothDevice;
let rxCharacteristic;

let dot;
let statusValue;
let connectBtn;
let connectLabel;
let deviceNameEl;

// Inicialización de variables una vez cargado el DOM
document.addEventListener('DOMContentLoaded', () => {
  dot          = document.getElementById('statusDot');
  statusValue   = document.getElementById('statusValue');
  connectBtn    = document.getElementById('connectBtn');
  connectLabel  = document.getElementById('connectBtnLabel');
  deviceNameEl  = document.getElementById('deviceName');
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

    // Aceptamos todos los dispositivos para garantizar que aparezca la ventana emergente
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });

    // Evitar acumular listeners si se reconecta varias veces con el mismo dispositivo
    bluetoothDevice.removeEventListener('gattserverdisconnected', alDesconectar);
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
  if (deviceNameEl) deviceNameEl.textContent = bluetoothDevice.name || "sin nombre";

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
  if (deviceNameEl) deviceNameEl.textContent = "—";

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

  const parentCard = btn.closest('.card');
  if (parentCard) {
    parentCard.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const nocheState = document.getElementById('nocheState');
    if (nocheState) nocheState.textContent = textoEstado;

    const activo = comando !== 'NOCHE_OFF';
    parentCard.classList.toggle('active', activo);

    const pill = document.getElementById('nochePill');
    if (pill) {
      pill.classList.toggle('on', activo);
      pill.textContent = textoEstado;
    }
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

  const esGaraje = key === 'garage';
  const textoOn = esGaraje ? "Abierto" : "Encendido";
  const textoOff = esGaraje ? "Cerrado" : "Apagado";

  if (stateText) stateText.textContent = encendido ? textoOn : textoOff;
  const win = document.getElementById('win-' + key);
  if (win) win.classList.toggle('lit', encendido);

  if (pill) {
    pill.classList.toggle('on', encendido);
    pill.textContent = encendido ? textoOn : textoOff;
  }
}

async function enviarComando(comando) {
  if (!rxCharacteristic) {
    alert("Primero debes conectar el dispositivo Bluetooth.");
    return;
  }
  try {
    let encoder = new TextEncoder();
    await rxCharacteristic.writeValue(encoder.encode(comando));
    console.log("Comando enviado:", comando);
  } catch (error) {
    console.error("Error al enviar comando:", error);
  }
}